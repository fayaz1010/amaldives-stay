import { NextRequest, NextResponse } from 'next/server';
import { verifyClaimToken } from '@/lib/claim-token';
import { ensureGuesthouseProvisioned } from '@/lib/auto-provision-guesthouse';
import { emailMatchesClaimPolicy, normalizeEmail } from '@/lib/claim-policy';
import { finalizeTenantClaim } from '@/lib/claim-owner';
import { notifyHqLead } from '@/lib/ozsystems-lead';

export const dynamic = 'force-dynamic';

/**
 * POST /api/public/claim/complete
 * Body: { token, password, ownerName? }
 *
 * Completes a verified claim — requires a valid email verification token.
 */
export async function POST(request: NextRequest) {
  let body: { token?: string; password?: string; ownerName?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const token = String(body.token || '').trim();
  const password = String(body.password || '');
  const ownerName = body.ownerName?.trim();

  if (!token || !password) {
    return NextResponse.json({ error: 'token and password are required' }, { status: 400 });
  }

  const verdict = verifyClaimToken(token);
  if (!verdict.ok) {
    return NextResponse.json(
      { error: 'Verification link is invalid or expired. Request a new one.' },
      { status: 400 }
    );
  }

  const { slug, email } = verdict.payload;
  const normalizedEmail = normalizeEmail(email);

  const provision = await ensureGuesthouseProvisioned(slug);
  if (!provision.ok) {
    if (provision.reason === 'already_claimed') {
      return NextResponse.json(
        { error: 'This property is already claimed. Please sign in instead.' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'Property is not available to claim' }, { status: 409 });
  }

  if (!emailMatchesClaimPolicy(normalizedEmail, provision.claimPolicy)) {
    return NextResponse.json({ error: 'Email no longer authorized for this property' }, { status: 403 });
  }

  try {
    const result = await finalizeTenantClaim({
      tenantId: provision.tenantId,
      email: normalizedEmail,
      password,
      ownerName: ownerName || normalizedEmail.split('@')[0],
    });

    // Lead capture → Oz Systems HQ (fire-safe, never breaks the flow)
    await notifyHqLead({
      intent: 'signup',
      name: ownerName || normalizedEmail.split('@')[0],
      email: normalizedEmail,
      company: slug,
      message: `Property claim COMPLETED for "${slug}" on vayves.com — tenant live at ${result.subdomain}`,
      metadata: { entry_point: 'claim_complete', slug, subdomain: result.subdomain },
    });

    return NextResponse.json({
      success: true,
      subdomain: result.subdomain,
      stayUrl: result.stayUrl,
      loginUrl: result.loginUrl,
      amaldivesUrl: `https://www.amaldives.com/guesthouses/${slug}`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unable to complete claim';
    const status = msg.includes('already') ? 409 : msg.includes('exists') ? 409 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
