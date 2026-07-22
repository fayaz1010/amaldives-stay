import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { tenantUrl } from '@/lib/domain';
import { getPaymentsConfig } from '@/lib/tenant-settings';

/**
 * Public discovery feed for amaldives.com.
 *
 * Returns every ACTIVE tenant that has opted into featuring
 * (`amaldivesFeatured = true`) AND has an `amaldivesSlug` set — the properties
 * amaldives.com promotes in its "Book Direct — Verified" grid. amaldives.com
 * fetches this server-side (no CORS needed) and renders a card per listing,
 * each deep-linking to a direct booking attributed with source=amaldives.com
 * (→ 4% commission via Tenant.commissionRate).
 *
 * This is the discovery half of the bridge: the per-property
 * /api/public/[subdomain]/info + /rooms endpoints power the live widget once a
 * traveller lands on a specific property; this endpoint is how they get
 * surfaced/found in the first place.
 *
 * Cached at the edge for 30 min (listings change slowly; prices are indicative
 * "from" values — exact availability is resolved live on the property page).
 */
export const dynamic = 'force-dynamic';

interface ListingCard {
  slug: string;                 // amaldivesSlug — the join key + URL slug
  subdomain: string;
  name: string;
  island: string | null;        // property.city (island/atoll label)
  country: string | null;
  heroImage: string | null;
  images: string[];
  tagline: string | null;
  highlights: string[];
  amenities: string[];
  fromPrice: number | null;     // min room-only nightly rate, pre-tax
  currency: string;
  isVerifiedDirect: boolean;
  bookUrl: string;              // direct-booking deep link, attributed
}

export async function GET() {
  try {
    const tenants = await prisma.tenant.findMany({
      where: {
        status: 'ACTIVE',
        amaldivesFeatured: true,
        amaldivesSlug: { not: null },
      },
      select: {
        name: true,
        description: true,
        logo: true,
        subdomain: true,
        amaldivesSlug: true,
        isVerifiedDirect: true,
        settings: true,
        properties: {
          take: 1,
          select: {
            name: true,
            city: true,
            country: true,
            images: true,
            amenities: true,
            settings: true,
          },
        },
        rooms: {
          where: { status: { in: ['AVAILABLE', 'OCCUPIED'] } },
          select: { basePrice: true },
        },
      },
      orderBy: [{ isVerifiedDirect: 'desc' }, { name: 'asc' }],
    });

    const listings: ListingCard[] = tenants.map((t) => {
      const property = t.properties[0] ?? null;
      const webProfile = (property?.settings as any)?.webProfile ?? {};
      const payments = getPaymentsConfig(t.settings);
      const prices = t.rooms.map((r) => r.basePrice).filter((p) => typeof p === 'number' && p > 0);
      const fromPrice = prices.length ? Math.min(...prices) : null;
      const images = property?.images ?? [];

      return {
        slug: t.amaldivesSlug as string,
        subdomain: t.subdomain,
        name: property?.name || t.name,
        island: property?.city ?? null,
        country: property?.country ?? null,
        heroImage: images[0] ?? t.logo ?? null,
        images: images.slice(0, 5),
        tagline: webProfile.tagline ?? t.description ?? null,
        highlights: Array.isArray(webProfile.highlights) ? webProfile.highlights.slice(0, 4) : [],
        amenities: (property?.amenities ?? []).slice(0, 8),
        fromPrice,
        currency: payments.currency || 'USD',
        isVerifiedDirect: t.isVerifiedDirect,
        bookUrl: tenantUrl(t.subdomain, '/book?source=amaldives.com'),
      };
    });

    return NextResponse.json(
      { listings, count: listings.length },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
        },
      },
    );
  } catch (error) {
    console.error('Public amaldives listings API error:', error);
    return NextResponse.json({ error: 'Internal server error', listings: [], count: 0 }, { status: 500 });
  }
}
