import { NextRequest, NextResponse } from 'next/server';
import { verifyClaimToken } from '@/lib/claim-token';
import { ensureGuesthouseProvisioned } from '@/lib/auto-provision-guesthouse';
import { prisma } from '@/lib/db';
import { normalizeEmail } from '@/lib/claim-policy';

export const dynamic = 'force-dynamic';

/**
 * GET /api/public/claim/verify?token=...
 * Validates a claim verification token before the password step.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')?.trim();
  if (!token) {
    return NextResponse.json({ error: 'token required' }, { status: 400 });
  }

  const verdict = verifyClaimToken(token);
  if (!verdict.ok) {
    const messages = {
      malformed: 'Invalid verification link',
      bad_signature: 'Invalid verification link',
      expired: 'This verification link has expired. Request a new one.',
    };
    return NextResponse.json({ error: messages[verdict.reason], valid: false }, { status: 400 });
  }

  const { slug, email } = verdict.payload;
  const provision = await ensureGuesthouseProvisioned(slug);
  if (!provision.ok && provision.reason !== 'already_claimed') {
    return NextResponse.json({ error: 'Property no longer available to claim', valid: false }, { status: 409 });
  }

  const tenant = await prisma.tenant.findFirst({
    where: { OR: [{ amaldivesSlug: slug }, { subdomain: slug }] },
    select: { name: true, subdomain: true, settings: true },
  });

  if (!tenant) {
    return NextResponse.json({ error: 'Property not found', valid: false }, { status: 404 });
  }

  const settings = (tenant.settings as Record<string, unknown> | null) ?? {};
  if (settings.claimable === false) {
    return NextResponse.json(
      {
        error: 'Already claimed — sign in instead',
        valid: false,
        loginUrl: `https://${tenant.subdomain}.stay.amaldives.com/auth/signin`,
      },
      { status: 409 }
    );
  }

  return NextResponse.json({
    valid: true,
    slug,
    email: normalizeEmail(email),
    guesthouseName: tenant.name,
    subdomain: tenant.subdomain,
    stayUrl: `https://${tenant.subdomain}.stay.amaldives.com`,
  });
}
