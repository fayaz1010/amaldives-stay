// Hotellook lookup wrapper for the one-click setup flow.
//
// We use the open `engine.hotellook.com/api/v2/lookup.json` endpoint that
// the amaldives.com sibling site already uses for resort pricing — it
// returns hotel IDs we can convert to photo URLs without scraping any
// OTA directly.

const LOOKUP_URL = 'https://engine.hotellook.com/api/v2/lookup.json';

const TOKEN = process.env.TRAVELPAYOUTS_API_TOKEN || '';

export interface HotellookHit {
  id: number;
  name: string;
  fullName: string;
  city: string;
  country: string;
  countryCode: string;
  stars?: number | null;
  location?: { lat: number; lon: number } | null;
  // We synthesise photos via Hotellook's CDN convention. Hotellook hosts up
  // to ~10 images per hotel under hxxxxxx_n.jpg, but we cap at 6 so we can
  // show a candidate gallery without spamming the wire.
  photos: string[];
}

/**
 * Build a public photo URL for a Hotellook hotel + index.
 * Pattern matches Hotellook's own CDN: photo.hotellook.com/image_v2/limit/h{id}_{i}/{w}/{h}.jpg.
 */
export function hotellookPhoto(hotelId: number, index = 1, width = 800, height = 520): string {
  return `https://photo.hotellook.com/image_v2/limit/h${hotelId}_${index}/${width}/${height}.jpg`;
}

/**
 * Search Hotellook by free-text guesthouse name. Restricted to Maldives by
 * filtering on countryCode === 'MV'.
 *
 * Returns up to `limit` hits with synthesised photo URLs ready for the UI.
 */
export async function searchHotels(query: string, limit = 5): Promise<HotellookHit[]> {
  if (!query || query.trim().length < 2) return [];

  const url = new URL(LOOKUP_URL);
  url.searchParams.set('query', query.trim());
  url.searchParams.set('lang', 'en');
  url.searchParams.set('lookFor', 'hotel');
  url.searchParams.set('limit', '15');
  if (TOKEN) url.searchParams.set('token', TOKEN);

  const res = await fetch(url.toString(), {
    headers: { 'accept': 'application/json' },
    next: { revalidate: 300 },
  });
  if (!res.ok) {
    throw new Error(`Hotellook lookup failed (${res.status})`);
  }
  const json = (await res.json()) as {
    results?: {
      hotels?: Array<{
        id: number;
        label?: string;
        locationName?: string;
        countryCode?: string;
        stars?: number;
        location?: { lat?: number; lon?: number };
      }>;
    };
  };

  const hotels = json.results?.hotels ?? [];

  // Hotellook returns label = "Hotel Name (City, Country)" — split it back
  // for the UI. We filter to Maldives because the platform is Maldives-only.
  const mvHits = hotels
    .filter((h) => (h.countryCode || '').toUpperCase() === 'MV')
    .slice(0, limit)
    .map<HotellookHit>((h) => {
      const rawLabel = h.label || '';
      const m = rawLabel.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
      const name = (m?.[1] || rawLabel).trim();
      const where = (m?.[2] || '').trim();
      const parts = where.split(',').map((p) => p.trim());
      const city = parts[0] || h.locationName || '';
      const country = parts[parts.length - 1] || 'Maldives';
      return {
        id: h.id,
        name,
        fullName: rawLabel,
        city,
        country,
        countryCode: 'MV',
        stars: h.stars ?? null,
        location:
          h.location?.lat != null && h.location?.lon != null
            ? { lat: h.location.lat, lon: h.location.lon }
            : null,
        photos: [1, 2, 3, 4, 5, 6].map((i) => hotellookPhoto(h.id, i)),
      };
    });

  return mvHits;
}

/**
 * Probe a synthesised photo URL with a HEAD request so we can drop missing
 * images before showing them. Keeps the candidate gallery from rendering 404s.
 */
export async function verifyPhoto(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}
