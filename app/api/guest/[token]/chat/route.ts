import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  canAccessStayChat,
  ensureStayConversation,
  postStayMessage,
} from '@/lib/stay-chat';
import { queueNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } },
) {
  const booking = await prisma.booking.findUnique({
    where: { guestToken: params.token },
    select: {
      id: true,
      tenantId: true,
      checkInDate: true,
      checkOutDate: true,
      status: true,
    },
  });
  if (!booking) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const chatOpen = canAccessStayChat(booking);
  const conversation = await prisma.stayConversation.findUnique({
    where: { bookingId: booking.id },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          senderRole: true,
          body: true,
          createdAt: true,
        },
      },
    },
  });

  return NextResponse.json({ chatOpen, conversation });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } },
) {
  const booking = await prisma.booking.findUnique({
    where: { guestToken: params.token },
    include: {
      property: { select: { email: true, name: true } },
      tenant: { select: { name: true } },
    },
  });
  if (!booking) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (!canAccessStayChat(booking)) {
    return NextResponse.json(
      { error: 'Chat opens on your check-in day and closes after departure' },
      { status: 403 },
    );
  }

  const { body } = await request.json();
  if (!body?.trim()) {
    return NextResponse.json({ error: 'body is required' }, { status: 400 });
  }

  const conversation = await ensureStayConversation(booking.id, booking.tenantId);
  const message = await postStayMessage({
    conversationId: conversation.id,
    senderRole: 'GUEST',
    body,
  });

  const notifyEmail = booking.property?.email;
  if (notifyEmail) {
    await queueNotification({
      tenantId: booking.tenantId,
      bookingId: booking.id,
      type: 'STAY_CHAT_GUEST_MESSAGE',
      to: notifyEmail,
      subject: `Guest message — ${booking.confirmationNumber}`,
      body: `<p>A guest sent a message via Vayves chat:</p><blockquote>${body.trim()}</blockquote>`,
    }).catch(() => {});
  }

  return NextResponse.json({ message }, { status: 201 });
}
