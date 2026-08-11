import { NextRequest, NextResponse } from 'next/server';
import { previewGuesthouseClaim } from '@/lib/auto-provision-guesthouse';
import { claimPolicyHint } from '@/lib/claim-policy';
import { fetchAmaldivesGuesthouse } from '@/lib/amaldives-guesthouse';
import { clientIp, rateLimit, tooManyRequests } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * Resolve amaldives.com guesthouse slug → claim prefill data.
 * READ-ONLY: never provisions tenants or domains (that happens in the
 * claim request flow after the email passes the claim policy).
 * Query: ?slug=reef-view-guesthouse
 */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug')?.trim().toLowerCase();
  if (!slug) {
    return NextResponse.json({ error: 'slug required' }, { status: 400 });
  }

  const rl = await rateLimit(`claim-lookup:${clientIp(request)}`, 20, 60 * 60 * 1000);
  if (!rl.ok) return tooManyRequests();

  const preview = await previewGuesthouseClaim(slug);

  if (preview.ok) {
    return NextResponse.json({
      provisioned: true,
      claimed: false,
      verificationRequired: true,
      subdomain: preview.subdomain,
      name: preview.name,
      stayUrl: preview.exists ? `https://${preview.subdomain}.vayves.com` : undefined,
      amaldivesUrl: `https://www.amaldives.com/guesthouses/${slug}`,
      emailHint: claimPolicyHint(preview.claimPolicy),
    });
  }

  if (preview.reason === 'already_claimed') {
    return NextResponse.json({
      claimed: true,
      error: 'Already claimed — sign in instead.',
    });
  }

  const gh = await fetchAmaldivesGuesthouse(slug);
  const humanName =
    gh?.name ??
    slug
      .split('-')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

  if (preview.reason === 'no_verification_data') {
    return NextResponse.json({
      claimed: false,
      canClaim: false,
      canRequestAssist: true,
      slug,
      name: humanName,
      amaldivesUrl: `https://www.amaldives.com/guesthouses/${slug}`,
      error:
        'We could not verify ownership automatically. Request a manual verification and our team will call you.',
    });
  }

  return NextResponse.json({
    claimed: false,
    slug,
    name: humanName,
    suggestedSubdomain: slug.replace(/[^a-z0-9-]/g, '').slice(0, 48),
    amaldivesUrl: `https://www.amaldives.com/guesthouses/${slug}`,
    claimUrl: `https://vayves.com/claim?guesthouse=${encodeURIComponent(slug)}`,
  });
}
