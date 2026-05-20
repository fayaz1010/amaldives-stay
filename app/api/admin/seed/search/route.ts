import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { searchPlaces } from '@/lib/places-search';

export const dynamic = 'force-dynamic';

/**
 * One-click setup, step 1.
 *
 * Owner types their guesthouse name (or a fragment) on /admin and we hit
 * the Google Places Text Search API to find matching Maldives lodging.
 * We never write anything here — this is a pure search. The owner picks
 * a candidate, then /api/admin/seed/apply does the actual seeding.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!['TENANT_ADMIN', 'OWNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const query = String(body?.query ?? '').trim();
    if (query.length < 2) {
      return NextResponse.json({ hits: [] });
    }

    const hits = await searchPlaces(query, 5);
    // The UI shape used to call these "hotellookId" — keep both keys so
    // we don't have to touch the client component in this hotfix PR.
    const compatHits = hits.map((h) => ({
      id: h.placeId,
      placeId: h.placeId,
      name: h.name,
      fullName: `${h.name} (${h.formattedAddress})`,
      city: h.city,
      country: h.country,
      stars: null,
      rating: h.rating,
      userRatingsTotal: h.userRatingsTotal,
      photos: h.photos,
    }));
    return NextResponse.json({ hits: compatHits });
  } catch (error) {
    console.error('Seed search error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Search failed', hits: [] },
      { status: 500 }
    );
  }
}
