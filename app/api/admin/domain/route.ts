import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { addDomain, getDomainStatus, removeDomain } from '@/lib/vercel-domains';

export const dynamic = 'force-dynamic';

const DOMAIN_RE = /^(?!:\/\/)([a-z0-9-]+\.)+[a-z]{2,}$/i;

function normalize(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/^www\./, '');
}

async function requireTenant() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) return null;
  return tenantId;
}

/** GET — current domain + live verification status. */
export async function GET() {
  const tenantId = await requireTenant();
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { domain: true, subdomain: true },
  });
  if (!tenant?.domain) {
    return NextResponse.json({ domain: null, subdomain: tenant?.subdomain ?? null });
  }
  try {
    const status = await getDomainStatus(tenant.domain);
    return NextResponse.json({ ...status, subdomain: tenant.subdomain });
  } catch (e) {
    return NextResponse.json({
      domain: tenant.domain,
      subdomain: tenant.subdomain,
      verified: false,
      records: [],
      misconfigured: false,
      error: e instanceof Error ? e.message : 'status check failed',
    });
  }
}

/** POST { domain } — connect a custom domain to this tenant. */
export async function POST(req: Request) {
  const tenantId = await requireTenant();
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { domain: raw } = (await req.json().catch(() => ({}))) as { domain?: string };
  if (!raw) return NextResponse.json({ error: 'domain required' }, { status: 400 });
  const domain = normalize(raw);
  if (!DOMAIN_RE.test(domain)) {
    return NextResponse.json({ error: 'Enter a valid domain, e.g. yourguesthouse.com' }, { status: 400 });
  }

  // Ensure no other tenant owns this domain.
  const taken = await prisma.tenant.findFirst({
    where: { domain, NOT: { id: tenantId } },
    select: { id: true },
  });
  if (taken) {
    return NextResponse.json({ error: 'That domain is already connected to another property.' }, { status: 409 });
  }

  let status;
  try {
    status = await addDomain(domain);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not add domain' }, { status: 502 });
  }

  await prisma.tenant.update({ where: { id: tenantId }, data: { domain } });
  return NextResponse.json(status);
}

/** DELETE — disconnect the custom domain. */
export async function DELETE() {
  const tenantId = await requireTenant();
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { domain: true } });
  if (tenant?.domain) {
    await removeDomain(tenant.domain).catch(() => undefined);
    await prisma.tenant.update({ where: { id: tenantId }, data: { domain: null } });
  }
  return NextResponse.json({ domain: null });
}
