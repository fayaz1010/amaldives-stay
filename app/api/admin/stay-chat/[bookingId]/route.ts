import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  canAccessStayChat,
  ensureStayConversation,
  postStayMessage,
} from '@/lib/stay-chat';
import { queueNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

const STAFF_ROLES = ['TENANT_ADMIN', 'MANAGER', 'FRONT_DESK'];

export async function GET(
  _request: NextRequest,
  { params }: { params: { bookingId: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const booking = await prisma.booking.findFirst({
    where: { id: params.bookingId, tenantId: session.user.tenantId },
    select: {
      id: true,
      checkInDate: true,
      checkOutDate: true,
      status: true,
      guest: { select: { email: true, name: true } },
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
        include: { sender: { select: { id: true, name: true } } },
      },
    },
  });

  return NextResponse.json({
    chatOpen,
    conversation,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { bookingId: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId || !STAFF_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const booking = await prisma.booking.findFirst({
    where: { id: params.bookingId, tenantId: session.user.tenantId },
    select: {
      id: true,
      tenantId: true,
      checkInDate: true,
      checkOutDate: true,
      status: true,
      guestToken: true,
      guest: { select: { email: true, name: true } },
    },
  });
  if (!booking) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (!canAccessStayChat(booking)) {
    return NextResponse.json({ error: 'Chat is not open for this stay' }, { status: 403 });
  }

  const { body } = await request.json();
  if (!body?.trim()) {
    return NextResponse.json({ error: 'body is required' }, { status: 400 });
  }

  const conversation = await ensureStayConversation(booking.id, booking.tenantId);
  const message = await postStayMessage({
    conversationId: conversation.id,
    senderRole: 'STAFF',
    senderUserId: session.user.id,
    body,
  });

  if (booking.guest?.email) {
    await queueNotification({
      tenantId: booking.tenantId,
      bookingId: booking.id,
      type: 'STAY_CHAT_STAFF_REPLY',
      to: booking.guest.email,
      subject: 'Message from your guesthouse',
      body: `<p>Your guesthouse sent you a message:</p><blockquote>${body.trim()}</blockquote>`,
    }).catch(() => {});
  }

  return NextResponse.json({ message }, { status: 201 });
}
