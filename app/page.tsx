
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { GuestHomePage } from '@/components/guest/guest-home-page';
import { WelcomePage } from '@/components/welcome-page';
import {
  BOOKING_EXTRA_CATEGORIES,
  getGuestExtrasForProperty,
  parsePropertyPolicies,
} from '@/lib/guest-extras';

export default async function HomePage() {
  const headersList = headers();
  const subdomain = headersList.get('X-Tenant-Subdomain');
  const customDomain = headersList.get('X-Tenant-Domain');

  if (subdomain || customDomain) {
    // This is a tenant site — resolved by stay subdomain OR the guesthouse's
    // own custom domain (Tenant.domain), so the same site serves on both.
    const tenant = await prisma.tenant.findFirst({
      where: subdomain ? { subdomain } : { domain: customDomain! },
      include: {
        properties: {
          include: {
            rooms: {
              where: { isActive: true },
              orderBy: { basePrice: 'asc' },
              include: {
                bookings: {
                  where: {
                    status: { in: ['CONFIRMED', 'CHECKED_IN'] },
                  },
                },
              },
            },
          },
        },
      },
    });
    
    if (!tenant) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Property Not Found</h1>
            <p className="text-gray-600">The requested property could not be found.</p>
          </div>
        </div>
      );
    }
    
    if (tenant.status !== 'ACTIVE') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Property Unavailable</h1>
            <p className="text-gray-600">This property is currently unavailable.</p>
          </div>
        </div>
      );
    }

    // Draft mode — set by /api/admin/seed/apply, cleared by
    // /api/admin/seed/publish. Show a "coming soon" splash so guests who
    // happen onto a draft URL don't see half-finished content.
    const tenantSettings = (tenant.settings as Record<string, unknown> | null) ?? {};
    if (tenantSettings.draftMode === true) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 via-white to-blue-50 px-4">
          <div className="text-center max-w-md">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              {tenant.name}
            </h1>
            <p className="text-gray-600 text-base md:text-lg">
              Our booking page is launching soon. Please check back shortly.
            </p>
          </div>
        </div>
      );
    }

    // Pull "activities near the hotel" from amaldives' operator directory so the
    // site has rich, locally-relevant content + backlinks. Cached 1h; best-effort
    // (never blocks the page if amaldives is slow/unreachable).
    const island = (tenant.properties?.[0]?.city || '').trim();
    // Strip diacritics BEFORE slugifying so "Hulhumalé" → "hulhumale" (not "hulhumal").
    const islandSlug = island
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    let nearbyOperators: any[] = [];
    let nearbyScoped = false;
    try {
      const r = await fetch(
        `https://amaldives.com/api/public/operators?limit=6${islandSlug ? `&island=${islandSlug}` : ''}`,
        { next: { revalidate: 3600 } },
      );
      if (r.ok) {
        const j = await r.json();
        nearbyOperators = Array.isArray(j.operators) ? j.operators : [];
        nearbyScoped = !!j.scoped;
      }
    } catch {
      // ignore — falls back to the static category links
    }

    const property = tenant.properties?.[0];
    const guestExtras = property
      ? await getGuestExtrasForProperty(tenant.id, property.id, BOOKING_EXTRA_CATEGORIES)
      : [];
    const guestPolicies = parsePropertyPolicies(property?.policies);

    return (
      <GuestHomePage
        tenant={tenant}
        nearbyOperators={nearbyOperators}
        nearbyScoped={nearbyScoped}
        guestExtras={guestExtras}
        guestPolicies={guestPolicies}
      />
    );
  }
  
  // Main platform page
  return <WelcomePage />;
}
