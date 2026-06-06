import { NextRequest, NextResponse } from 'next/server';
import { ensureGuesthouseProvisioned } from '@/lib/auto-provision-guesthouse';
import { prisma } from '@/lib/db';
import {
  claimPolicyHint,
  readClaimPolicy,
} from '@/lib/claim-policy';
import { fetchAmaldivesGuesthouse } from '@/lib/amaldives-guesthouse';

export const dynamic = 'force-dynamic';

/**
 * Resolve amaldives.com guesthouse slug → claim prefill data.
 * Auto-provisions an unclaimed tenant when verifiable contact data exists.
 * Query: ?slug=reef-view-guesthouse
 */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug')?.trim().toLowerCase();
  if (!slug) {
    return NextResponse.json({ error: 'slug required' }, { status: 400 });
  }

  const existing = await prisma.tenant.findFirst({
    where: {
      OR: [{ amaldivesSlug: slug }, { subdomain: slug }],
    },
    select: { subdomain: true, name: true, settings: true },
  });

  if (existing) {
    const settings = (existing.settings as Record<string, unknown> | null) ?? {};
    const claimable = settings.claimable !== false;
    const claimPolicy = readClaimPolicy(settings);

    return NextResponse.json({
      provisioned: claimable,
      claimed: !claimable,
      verificationRequired: claimable,
      subdomain: existing.subdomain,
      name: existing.name,
      stayUrl: `https://${existing.subdomain}.stay.amaldives.com`,
      amaldivesUrl: `https://www.amaldives.com/guesthouses/${slug}`,
      emailHint: claimPolicy ? claimPolicyHint(claimPolicy) : undefined,
    });
  }

  // Lazy auto-provision from amaldives.com listing data.
  const provision = await ensureGuesthouseProvisioned(slug);
  if (provision.ok) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: provision.tenantId },
      select: { name: true, subdomain: true },
    });
    return NextResponse.json({
      provisioned: true,
      claimed: false,
      verificationRequired: true,
      autoProvisioned: provision.created,
      subdomain: provision.subdomain,
      name: tenant?.name,
      stayUrl: `https://${provision.subdomain}.stay.amaldives.com`,
      amaldivesUrl: `https://www.amaldives.com/guesthouses/${slug}`,
      emailHint: claimPolicyHint(provision.claimPolicy),
    });
  }

  if (provision.reason === 'already_claimed') {
    const tenant = await prisma.tenant.findFirst({
      where: { OR: [{ amaldivesSlug: slug }, { subdomain: slug }] },
      select: { subdomain: true, name: true },
    });
    return NextResponse.json({
      claimed: true,
      subdomain: tenant?.subdomain,
      name: tenant?.name,
      stayUrl: tenant ? `https://${tenant.subdomain}.stay.amaldives.com` : undefined,
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

  if (provision.reason === 'no_verification_data') {
    return NextResponse.json({
      claimed: false,
      canClaim: false,
      slug,
      name: humanName,
      amaldivesUrl: `https://www.amaldives.com/guesthouses/${slug}`,
      error:
        'We need a business website or owner email on your amaldives.com listing before you can claim automatically. Contact support@amaldives.com.',
    });
  }

  return NextResponse.json({
    claimed: false,
    slug,
    name: humanName,
    suggestedSubdomain: slug.replace(/[^a-z0-9-]/g, '').slice(0, 48),
    amaldivesUrl: `https://www.amaldives.com/guesthouses/${slug}`,
    claimUrl: `https://stay.amaldives.com/claim?guesthouse=${encodeURIComponent(slug)}`,
  });
}
