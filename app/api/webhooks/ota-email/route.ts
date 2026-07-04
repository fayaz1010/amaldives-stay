import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { parseOtaEmail, type RawEmail } from '@/lib/ota-email-parse';
import { verifyOtaEmail } from '@/lib/ota-email-verify';
import { processOtaEmail, recordUnresolvedOtaEmail } from '@/lib/ota-email-process';

export const dynamic = 'force-dynamic';

/**
 * Inbound OTA booking-email webhook.
 *
 * A Cloudflare Email Worker (running on OUR platform domain — never the
 * tenant's mailbox) forwards each OTA reservation email here as JSON. We
 * resolve which tenant it belongs to from the recipient address, then run
 * the full parse → Gemini-verify → create/update/cancel pipeline
 * (lib/ota-email-process.ts). The tenant's own email service is completely
 * untouched — the OTA just sends a copy here.
 *
 * Every email that resolves to a tenant gets exactly one OtaEmailMessage
 * audit row, whether it was auto-applied or queued for manual review at
 * /admin/bookings/ota-review.
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

  const email: RawEmail = {
    from: body.from || '',
    to: body.to,
    subject: body.subject || '',
    text: body.text,
    html: body.html,
  };

  const subdomain = tenantSubdomainFromAddress(body.to);
  if (!subdomain) {
    await recordUnresolvedOtaEmail(email, `Cannot resolve tenant from recipient "${body.to}"`);
    return NextResponse.json({ error: `Cannot resolve tenant from recipient "${body.to}"` }, { status: 422 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { subdomain },
    select: { id: true, subdomain: true },
  });
  if (!tenant) {
    await recordUnresolvedOtaEmail(email, `No tenant for subdomain "${subdomain}"`);
    return NextResponse.json({ error: `No tenant for subdomain "${subdomain}"` }, { status: 404 });
  }

  // Debug/testing: run the full parse + verify pipeline and return what it
  // found without writing anything (no booking, no audit row).
  if (body.dryRun) {
    const regexResult = parseOtaEmail(email);
    const verification = await verifyOtaEmail(email, regexResult, tenant.id);
    return NextResponse.json({
      ok: true,
      dryRun: true,
      tenant: tenant.subdomain,
      regexResult,
      verification,
    });
  }

  try {
    const result = await processOtaEmail(email, tenant);
    return NextResponse.json({ ok: true, tenant: tenant.subdomain, ...result });
  } catch (err) {
    console.error('[ota-email] processing failed', err);
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
