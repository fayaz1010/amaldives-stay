import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generateInviteToken } from '@/lib/staff-invite';
import { sendAgentInviteEmail } from '@/lib/send-agent-invite';

export const dynamic = 'force-dynamic';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const agencies = await prisma.agency.findMany({
    where: { tenantId: session.user.tenantId },
    include: {
      members: {
        include: {
          user: { select: { id: true, email: true, name: true } },
        },
      },
      _count: { select: { bookings: true } },
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({ agencies });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { name, markupPercent, creditTerms, isActive, agentEmail, agentName } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const agency = await prisma.agency.create({
    data: {
      tenantId: session.user.tenantId,
      name: String(name).trim(),
      markupPercent: markupPercent != null ? Number(markupPercent) : 0,
      creditTerms: creditTerms ? String(creditTerms).trim() : null,
      isActive: typeof isActive === 'boolean' ? isActive : true,
    },
  });

  let member = null;
  let invite: { url: string; emailSent: boolean; emailReason?: string | null } | null = null;
  if (agentEmail?.trim()) {
    const email = String(agentEmail).trim().toLowerCase();
    const user = await prisma.user.upsert({
      where: { email },
      update: { name: agentName?.trim() || email, role: 'TRAVEL_AGENT' },
      create: {
        email,
        name: agentName?.trim() || email,
        role: 'TRAVEL_AGENT',
        password: null,
      },
    });
    member = await prisma.agencyUser.upsert({
      where: { userId: user.id },
      update: { agencyId: agency.id, role: 'ADMIN' },
      create: {
        agencyId: agency.id,
        userId: user.id,
        role: 'ADMIN',
      },
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    const tenant = await prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: { name: true },
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
      tenantName: tenant?.name ?? 'Property',
      inviterName: session.user.name ?? session.user.email ?? 'Admin',
      agencyName: agency.name,
      inviteUrl,
      ttlMs: INVITE_TTL_MS,
    });
    invite = {
      url: inviteUrl,
      emailSent: emailResult.sent,
      emailReason: emailResult.sent ? null : emailResult.reason,
    };
  }

  return NextResponse.json({ agency, member, invite }, { status: 201 });
}
