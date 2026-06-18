import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generateInviteToken } from '@/lib/staff-invite';
import { sendAgentInviteEmail } from '@/lib/send-agent-invite';

export const dynamic = 'force-dynamic';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const agency = await prisma.agency.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    include: { tenant: { select: { name: true } } },
  });
  if (!agency) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? '').trim().toLowerCase();
  const name = String(body.name ?? '').trim();
  if (!email) {
    return NextResponse.json({ error: 'email is required' }, { status: 400 });
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: { name: name || email, role: 'TRAVEL_AGENT' },
    create: {
      email,
      name: name || email,
      role: 'TRAVEL_AGENT',
      password: null,
    },
  });

  await prisma.agencyUser.upsert({
    where: { userId: user.id },
    update: { agencyId: agency.id, role: 'AGENT' },
    create: { agencyId: agency.id, userId: user.id, role: 'AGENT' },
  });

  const inviteToken = generateInviteToken({
    userId: user.id,
    email: user.email,
    expiresAt: Date.now() + INVITE_TTL_MS,
  });
  const origin = request.headers.get('origin') ?? 'https://stay.amaldives.com';
  const inviteUrl = `${origin}/auth/invite/${inviteToken}`;

  const emailResult = await sendAgentInviteEmail({
    to: user.email,
    recipientName: user.name ?? user.email,
    tenantName: agency.tenant.name,
    inviterName: session.user.name ?? session.user.email ?? 'Admin',
    agencyName: agency.name,
    inviteUrl,
    ttlMs: INVITE_TTL_MS,
  });

  return NextResponse.json({
    invite: {
      url: inviteUrl,
      emailSent: emailResult.sent,
      emailReason: emailResult.sent ? null : emailResult.reason,
      recipientEmail: user.email,
      recipientName: user.name,
    },
  });
}
