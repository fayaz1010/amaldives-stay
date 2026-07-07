// Google Places-backed property search for the one-click setup flow.
//
// We originally used the open Hotellook lookup endpoint, but that route
// has been returning HTTP 404 for several months (Travelpayouts moved
// hotel data behind a paid contract). Google Places returns better data
// anyway — proper photos, real addresses, and a stable contract.
//
// The Places API key lives in GOOGLE_PLACES_API_KEY and is restricted in
// the Cloud Console to the vayves.com referrer.

const TEXTSEARCH_URL = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
const PHOTO_URL = 'https://maps.googleapis.com/maps/api/place/photo';

const KEY = process.env.GOOGLE_PLACES_API_KEY || '';

export interface PlaceHit {
  // Google's place_id — we keep this rather than a synthetic numeric ID
  // because /api/admin/seed/apply uses it to fetch the full Place Detail
  // payload (photos, address components, opening hours) when applying.
  placeId: string;
  name: string;
  formattedAddress: string;
  city: string;
  country: string;
  rating?: number | null;
  userRatingsTotal?: number | null;
  location: { lat: number; lng: number };
  photos: string[]; // public photo URLs (Place Photo endpoint)
}

/**
 * Build a public Place Photo URL. Google's Place Photo endpoint redirects
 * to a CDN image; the URL is safe to drop into <img src>.
 */
export function placePhoto(photoReference: string, maxWidth = 800): string {
  const u = new URL(PHOTO_URL);
  u.searchParams.set('maxwidth', String(maxWidth));
  u.searchParams.set('photo_reference', photoReference);
  u.searchParams.set('key', KEY);
  return u.toString();
}

interface PlacesTextResult {
  place_id: string;
  name: string;
  formatted_address: string;
  business_status?: string;
  rating?: number;
  user_ratings_total?: number;
  geometry?: { location?: { lat: number; lng: number } };
  photos?: Array<{ photo_reference: string }>;
}

/**
 * Search by free-text guesthouse name, biased to Maldives lodging.
 *
 * We append "Maldives" to the query so the regional bias is implicit, and
 * filter `business_status === OPERATIONAL` so we never offer a closed
 * property as a candidate.
 */
export async function searchPlaces(query: string, limit = 5): Promise<PlaceHit[]> {
  if (!KEY) {
    throw new Error('GOOGLE_PLACES_API_KEY is not configured');
  }
  if (!query || query.trim().length < 2) return [];

  const u = new URL(TEXTSEARCH_URL);
  // Including "Maldives" in the query is more reliable than relying on
  // `region=mv` for biasing — Google honours the appended location term.
  u.searchParams.set('query', `${query.trim()} Maldives`);
  u.searchParams.set('type', 'lodging');
  u.searchParams.set('key', KEY);

  const res = await fetch(u.toString(), {
    headers: { accept: 'application/json' },
    // Place results don't change minute-to-minute — let Next cache for 5min.
    next: { revalidate: 300 },
  });
  if (!res.ok) {
    throw new Error(`Places search failed (${res.status})`);
  }
  const json = (await res.json()) as {
    status?: string;
    error_message?: string;
    results?: PlacesTextResult[];
  };

  if (json.status && json.status !== 'OK' && json.status !== 'ZERO_RESULTS') {
    throw new Error(`Places API: ${json.status}${json.error_message ? ' — ' + json.error_message : ''}`);
  }

  const hits: PlaceHit[] = (json.results ?? [])
    .filter((r) => (r.business_status ?? 'OPERATIONAL') === 'OPERATIONAL')
    .filter((r) => /\bMaldives\b/i.test(r.formatted_address ?? ''))
    .slice(0, limit)
    .map((r) => {
      // formatted_address: "Lot 11070, 11070, Maldives" or "Malé, Maldives"
      // Extract a best-effort city: token before "Maldives".
      const parts = (r.formatted_address ?? '').split(',').map((s) => s.trim()).filter(Boolean);
      const country = parts[parts.length - 1] || 'Maldives';
      const city = parts.length >= 2 ? parts[parts.length - 2] : '';
      const photoRefs = (r.photos ?? []).slice(0, 6).map((p) => p.photo_reference);
      return {
        placeId: r.place_id,
        name: r.name,
        formattedAddress: r.formatted_address ?? '',
        city,
        country,
        rating: r.rating ?? null,
        userRatingsTotal: r.user_ratings_total ?? null,
        location: r.geometry?.location ?? { lat: 0, lng: 0 },
        photos: photoRefs.map((ref) => placePhoto(ref)),
      };
    });

  return hits;
}
