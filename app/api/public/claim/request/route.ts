import { NextRequest, NextResponse } from 'next/server';
import { ensureGuesthouseProvisioned } from '@/lib/auto-provision-guesthouse';
import {
  emailMatchesClaimPolicy,
  claimPolicyHint,
  normalizeEmail,
} from '@/lib/claim-policy';
import { generateClaimToken, CLAIM_TOKEN_TTL_MS } from '@/lib/claim-token';
import { sendClaimVerificationEmail } from '@/lib/send-claim-verification';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/public/claim/request
 * Body: { slug, email }
 *
 * Auto-provisions the tenant if needed, verifies the email matches the
 * guesthouse domain on file, then sends a signed verification link.
 */
export async function POST(request: NextRequest) {
  let body: { slug?: string; email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const slug = String(body.slug || '').trim().toLowerCase();
  const email = normalizeEmail(String(body.email || ''));

  if (!slug || !email) {
    return NextResponse.json({ error: 'slug and email are required' }, { status: 400 });
  }

  const provision = await ensureGuesthouseProvisioned(slug);
  if (!provision.ok) {
    const messages: Record<string, string> = {
      not_found: 'Guesthouse not found on amaldives.com',
      no_verification_data:
        'We cannot verify ownership automatically — no business website or email on file. Contact support@amaldives.com.',
      already_claimed: 'This property is already claimed. Please sign in instead.',
      inactive: 'This listing is not active.',
    };
    return NextResponse.json({ error: messages[provision.reason] }, { status: 409 });
  }

  if (!emailMatchesClaimPolicy(email, provision.claimPolicy)) {
    return NextResponse.json(
      {
        error: `This email is not authorized to claim this property. ${claimPolicyHint(provision.claimPolicy)}.`,
        hint: claimPolicyHint(provision.claimPolicy),
      },
      { status: 403 }
    );
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: provision.tenantId },
    select: { name: true, subdomain: true },
  });
  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }

  const token = generateClaimToken({
    slug,
    email,
    expiresAt: Date.now() + CLAIM_TOKEN_TTL_MS,
  });

  const origin = process.env.NEXTAUTH_URL?.replace(/\/$/, '') || 'https://vayves.com';
  const verifyUrl = `${origin}/claim?guesthouse=${encodeURIComponent(slug)}&token=${encodeURIComponent(token)}`;

  const emailResult = await sendClaimVerificationEmail({
    to: email,
    guesthouseName: tenant.name,
    verifyUrl,
    ttlMs: CLAIM_TOKEN_TTL_MS,
  });

  if (!emailResult.sent) {
    return NextResponse.json(
      {
        error: 'Could not send verification email. Try again shortly or contact support.',
        verifyUrl: process.env.NODE_ENV === 'development' ? verifyUrl : undefined,
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    success: true,
    message: 'Verification email sent. Check your inbox to continue.',
    emailMasked: email.replace(/^(.{2}).*(@.*)$/, '$1***$2'),
    subdomain: tenant.subdomain,
  });
}
