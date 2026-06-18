import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getAgentContext } from '@/lib/agent-context';

export const dynamic = 'force-dynamic';

export async function POST() {
  const session = await getServerSession(authOptions);
  const ctx = await getAgentContext(session);
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Persist on user via a lightweight marker — guestProfile not applicable; use tenant settings on agency tenant
  const tenant = await prisma.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: { settings: true },
  });
  const settings = (tenant?.settings as Record<string, unknown> | null) ?? {};
  const agentOnboarding = (settings.agentOnboarding as Record<string, string> | undefined) ?? {};
  agentOnboarding[ctx.userId] = new Date().toISOString();

  await prisma.tenant.update({
    where: { id: ctx.tenantId },
    data: {
      settings: {
        ...settings,
        agentOnboarding,
      },
    },
  });

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const ctx = await getAgentContext(session);
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: { settings: true },
  });
  const settings = (tenant?.settings as Record<string, unknown> | null) ?? {};
  const agentOnboarding = (settings.agentOnboarding as Record<string, string> | undefined) ?? {};
  const complete = Boolean(agentOnboarding[ctx.userId]);

  return NextResponse.json({
    complete,
    agency: {
      name: ctx.agency.name,
      markupPercent: ctx.agency.markupPercent,
    },
  });
}
