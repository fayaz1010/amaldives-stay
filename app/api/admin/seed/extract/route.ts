import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { generateJSON } from '@/lib/ai';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Gemini calls can take ~20-30s when grounding

interface ExtractedProperty {
  name: string;
  description: string;
  city: string;
  country: string;
  address?: string;
  starRating?: number | null;
  rating?: number | null;
  reviewCount?: number | null;
  amenities: string[];
  rooms: Array<{
    name: string;
    type?: string;
    capacity?: number;
    beds?: string;
    description?: string;
    basePrice?: number;
    currency?: string;
  }>;
  photoUrls: string[];
  checkInTime?: string;
  checkOutTime?: string;
}

const EXTRACTION_INSTRUCTIONS = `You are extracting hotel/guesthouse data into structured JSON.
Return ONLY a single JSON object matching the schema. No commentary, no prose, no markdown.

Schema:
{
  "name": string,                  // property name
  "description": string,           // 2–4 paragraph description of the property
  "city": string,                  // city/island name (not postal code)
  "country": string,               // usually "Maldives"
  "address": string,               // street address if available
  "starRating": number | null,     // hotel star class 1-5 if shown
  "rating": number | null,         // guest review average if shown (any scale)
  "reviewCount": number | null,    // number of reviews if shown
  "amenities": string[],           // e.g. ["Free WiFi","Breakfast","Beachfront"]
  "rooms": [
    {
      "name": string,              // e.g. "Deluxe Double Room with Sea View"
      "type": string,              // STANDARD | DELUXE | SUITE | FAMILY | TWIN
      "capacity": number,          // max guests
      "beds": string,              // e.g. "1 double bed"
      "description": string,       // 1-2 sentences
      "basePrice": number,         // numeric only, no currency symbol
      "currency": string           // ISO-4217 e.g. "USD","MVR","EUR"
    }
  ],
  "photoUrls": string[],           // direct image URLs visible on the page
  "checkInTime": string,           // "14:00" 24h, if shown
  "checkOutTime": string           // "12:00" 24h, if shown
}

Rules:
- Use the listing's own wording for the description; keep it factual.
- For rooms, prefer the structured room table over the description.
- For room "type", map names: "Suite" → SUITE, "Twin" → TWIN, "Family" → FAMILY,
  "Deluxe Double" → DELUXE, anything else → STANDARD.
- For photoUrls, only include direct .jpg/.webp/.png URLs hosted on the
  property listing's CDN (skip icons, maps, profile pictures).
- If a field is unknown, use null (not "unknown" or empty string).
- Return an empty array for rooms[] if you can't determine any.`;

/**
 * One-click setup, step 1b (alternative to /api/admin/seed/search).
 *
 * Owner pastes a Booking.com URL OR uploads a screenshot of their listing.
 * Gemini extracts the structured shape we need to seed the tenant. The
 * client then calls /api/admin/seed/apply with the result.
 *
 * Two input modes:
 *   { url: "https://booking.com/hotel/mv/..." }   — Gemini fetches via Google
 *                                                    Search grounding because
 *                                                    Booking.com challenges
 *                                                    raw datacentre fetches.
 *   { imageBase64: "...", mimeType: "image/jpeg" } — Gemini Vision parses
 *                                                    a screenshot directly.
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

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const url = typeof body.url === 'string' ? body.url.trim() : '';
    const imageBase64 = typeof body.imageBase64 === 'string' ? body.imageBase64 : '';
    const mimeType = typeof body.mimeType === 'string' ? body.mimeType : 'image/jpeg';

    if (!url && !imageBase64) {
      return NextResponse.json(
        { error: 'Provide either a `url` (Booking.com listing) or an `imageBase64` screenshot.' },
        { status: 400 }
      );
    }

    let parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>;
    let useGrounding = false;

    if (imageBase64) {
      // Vision path — Gemini reads the screenshot directly. No external
      // fetch needed, so no grounding required.
      parts = [
        { text: `${EXTRACTION_INSTRUCTIONS}\n\nThe attached image is a screenshot of the owner's property listing. Extract the data.` },
        {
          inlineData: {
            mimeType,
            // The client sends a data: URL; strip the prefix if present.
            data: imageBase64.replace(/^data:[^,]+,/, ''),
          },
        },
      ];
    } else {
      // URL path — ask Gemini to use Google Search grounding so it can
      // fetch the page (Google has crawl rights, our datacentre IPs don't).
      parts = [
        {
          text:
            `${EXTRACTION_INSTRUCTIONS}\n\n` +
            `Fetch and extract data from this hotel listing URL:\n${url}\n\n` +
            `Use Google Search to access the page. ` +
            `Return only the JSON object. Do not include any URLs in the response other than direct image URLs in photoUrls.`,
        },
      ];
      useGrounding = true;
    }

    const extracted = await generateJSON<ExtractedProperty>(parts, {
      temperature: 0.2,
      maxTokens: 4096,
      useSearchGrounding: useGrounding,
    });

    // Light validation so a hallucinated response can't crash the seed step.
    if (!extracted || typeof extracted !== 'object' || !extracted.name) {
      return NextResponse.json(
        { error: 'Could not extract a property from the input. Try a different URL or a clearer screenshot.' },
        { status: 422 }
      );
    }
    if (!Array.isArray(extracted.rooms)) extracted.rooms = [];
    if (!Array.isArray(extracted.amenities)) extracted.amenities = [];
    if (!Array.isArray(extracted.photoUrls)) extracted.photoUrls = [];

    return NextResponse.json({
      success: true,
      source: imageBase64 ? 'screenshot' : 'url',
      extracted,
    });
  } catch (error) {
    console.error('Seed extract error:', error);
    const msg = error instanceof Error ? error.message : 'Extraction failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
