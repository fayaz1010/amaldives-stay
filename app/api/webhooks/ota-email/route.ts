import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { parseOtaEmail, type RawEmail } from '@/lib/ota-email-parse';
import { ingestOtaEmailBooking } from '@/lib/ota-email-ingest';

export const dynamic = 'force-dynamic';

/**
 * Inbound OTA booking-email webhook.
 *
 * A Cloudflare Email Worker (running on OUR platform domain — never the
 * tenant's mailbox) forwards each OTA reservation email here as JSON. We
 * resolve which tenant it belongs to from the recipient address, parse the
 * reservation, and create/update/cancel a Booking. The tenant's own email
 * service is completely untouched — the OTA just sends a copy here.
 *
 * Auth: shared secret in the `x-ota-ingest-secret` header (env OTA_INGEST_SECRET).
 *
 * Recipient → tenant: address local-part identifies the tenant subdomain, via
 * either sub-addressing (`ota+rivethi-beach@…`) or a prefix (`ota-rivethi-beach@…`).
 *
 * Body: { to, from, subject, text?, html?, dryRun? }
 */
export async function POST(req: NextRequest) {
  const secret = process.env.OTA_INGEST_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Ingest not configured' }, { status: 503 });
  }
  if (req.headers.get('x-ota-ingest-secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: (RawEmail & { dryRun?: boolean }) | null = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body || !body.to || (!body.text && !body.html && !body.subject)) {
    return NextResponse.json({ error: 'Missing email fields (to, subject/text/html)' }, { status: 400 });
  }

  const subdomain = tenantSubdomainFromAddress(body.to);
  if (!subdomain) {
    return NextResponse.json({ error: `Cannot resolve tenant from recipient "${body.to}"` }, { status: 422 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { subdomain },
    select: { id: true, subdomain: true },
  });
  if (!tenant) {
    return NextResponse.json({ error: `No tenant for subdomain "${subdomain}"` }, { status: 404 });
  }

  const parsed = parseOtaEmail({
    from: body.from || '',
    to: body.to,
    subject: body.subject || '',
    text: body.text,
    html: body.html,
  });

  if (!parsed) {
    // Couldn't extract the essentials — surface for manual review rather than guess.
    console.warn('[ota-email] unparseable email', { to: body.to, subject: body.subject });
    return NextResponse.json(
      { ok: false, parsed: false, reason: 'Could not extract reservation ref + dates' },
      { status: 200 }
    );
  }

  // Debug/testing: return what we parsed without writing anything.
  if (body.dryRun) {
    return NextResponse.json({ ok: true, dryRun: true, tenant: tenant.subdomain, parsed });
  }

  try {
    const result = await ingestOtaEmailBooking(tenant.id, parsed);
    return NextResponse.json({ ok: true, tenant: tenant.subdomain, source: parsed.source, ...result });
  } catch (err) {
    console.error('[ota-email] ingest failed', err);
    return NextResponse.json({ ok: false, error: 'Ingest failed' }, { status: 500 });
  }
}

/** Extract the tenant subdomain from the recipient address.
 *  Supports `ota+<sub>@…` (sub-addressing) and `ota-<sub>@…` / `<sub>@…`. */
function tenantSubdomainFromAddress(to: string): string | null {
  const addr = (to.match(/<([^>]+)>/)?.[1] || to).trim().toLowerCase();
  const local = addr.split('@')[0];
  if (!local) return null;
  if (local.includes('+')) return local.split('+').slice(1).join('+') || null;
  // strip a leading ota / bookings / reservations prefix + delimiter
  const stripped = local.replace(/^(ota|bookings?|reservations?)[-_.]/, '');
  return stripped || null;
}
