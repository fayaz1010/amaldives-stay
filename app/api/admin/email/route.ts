import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { emailDnsRecords, type EmailProvider } from '@/lib/brand-email';

export const dynamic = 'force-dynamic';

interface Mailbox {
  address: string;
  status: 'requested' | 'active';
}
interface EmailConfig {
  provider: EmailProvider;
  mailboxes: Mailbox[];
  requestedAt?: string;
}

async function tenantId() {
  const s = await getServerSession(authOptions);
  return s?.user?.tenantId ?? null;
}

function readEmail(settings: unknown): EmailConfig | null {
  const wp = (settings as { webPresence?: { email?: EmailConfig } } | null)?.webPresence?.email;
  return wp ?? null;
}

export async function GET() {
  const id = await tenantId();
  if (!id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tenant = await prisma.tenant.findUnique({
    where: { id },
    select: { domain: true, settings: true },
  });
  const email = readEmail(tenant?.settings);
  const records =
    tenant?.domain && email?.provider ? emailDnsRecords(email.provider, tenant.domain) : [];
  return NextResponse.json({ domain: tenant?.domain ?? null, email, records });
}

export async function POST(req: Request) {
  const id = await tenantId();
  if (!id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    provider?: EmailProvider;
    mailboxes?: string[];
  };
  const provider: EmailProvider = body.provider === 'google' ? 'google' : 'zoho';

  const tenant = await prisma.tenant.findUnique({
    where: { id },
    select: { domain: true, settings: true },
  });
  if (!tenant?.domain) {
    return NextResponse.json(
      { error: 'Connect your domain first, then set up brand email on it.' },
      { status: 400 },
    );
  }

  const addrs = (body.mailboxes ?? [])
    .map((a) => a.trim().toLowerCase())
    .filter((a) => /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(a))
    .slice(0, 20);

  const existing = readEmail(tenant.settings);
  const merged = new Map<string, Mailbox>();
  for (const m of existing?.mailboxes ?? []) merged.set(m.address, m);
  for (const a of addrs) if (!merged.has(a)) merged.set(a, { address: a, status: 'requested' });

  const email: EmailConfig = {
    provider,
    mailboxes: [...merged.values()],
    requestedAt: existing?.requestedAt ?? new Date().toISOString(),
  };

  const settings = {
    ...((tenant.settings as Record<string, unknown> | null) ?? {}),
    webPresence: {
      ...(((tenant.settings as { webPresence?: Record<string, unknown> } | null)?.webPresence) ?? {}),
      email,
    },
  };
  await prisma.tenant.update({
    where: { id },
    data: { settings: settings as unknown as Prisma.InputJsonValue },
  });

  return NextResponse.json({
    domain: tenant.domain,
    email,
    records: emailDnsRecords(provider, tenant.domain),
  });
}
