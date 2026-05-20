import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * One-click setup, step 2.
 *
 * Takes a chosen Hotellook hit and seeds the owner's Property with it:
 * name, city, country, photos, a starter description, and one starter
 * room type. The tenant is then marked as a DRAFT (in `settings.draftMode`)
 * so the public storefront shows a "coming soon" notice and the admin
 * dashboard renders a "Review and Publish" banner. Owner reviews the
 * imported data on /admin/web and presses Publish to go live.
 *
 * Why draft mode and not auto-publish: hotel photos and inferred prices
 * can be wrong (especially when several properties share a name). We
 * don't want guests to land on the wrong photos.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!['TENANT_ADMIN', 'OWNER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // The UI sends one of three seed sources:
    //   1. Google Places search → { placeId, name, city, country, photos }
    //   2. Booking.com URL extract → { source: "url", extracted: {...} }
    //   3. Screenshot extract     → { source: "screenshot", extracted: {...} }
    // We normalise all three into the same set of variables before writing.
    const extracted = (body.extracted ?? null) as null | {
      name?: string;
      description?: string;
      city?: string;
      country?: string;
      address?: string;
      amenities?: string[];
      photoUrls?: string[];
      rooms?: Array<{
        name?: string;
        type?: string;
        capacity?: number;
        beds?: string;
        description?: string;
        basePrice?: number;
        currency?: string;
      }>;
      checkInTime?: string;
      checkOutTime?: string;
    };

    const placeId = String(body.placeId ?? body.hotellookId ?? '').trim();
    const name = String(body.name ?? extracted?.name ?? '').trim();
    const city = String(body.city ?? extracted?.city ?? '').trim() || '—';
    const country = String(body.country ?? extracted?.country ?? 'Maldives').trim() || 'Maldives';
    const address = String(body.address ?? extracted?.address ?? '').trim() || '—';
    const description = String(body.description ?? extracted?.description ?? '').trim()
      || `${name} — direct booking page on stay.amaldives.com. Edit this description in /admin/web before publishing.`;
    const amenities = Array.isArray(body.amenities ?? extracted?.amenities)
      ? ((body.amenities ?? extracted?.amenities) as unknown[]).map(String).filter(Boolean).slice(0, 30)
      : [];
    const photos = Array.isArray(body.photos ?? extracted?.photoUrls)
      ? ((body.photos ?? extracted?.photoUrls) as unknown[]).map(String).filter(Boolean).slice(0, 12)
      : [];

    const extractedRooms = Array.isArray(extracted?.rooms) ? extracted!.rooms! : [];
    const starterRoomCount = Math.max(1, Math.min(20, Number(body.starterRoomCount ?? 4)));
    const starterRoomPrice = Math.max(20, Math.min(5000, Number(body.starterRoomPrice ?? 85)));

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    // Either a placeId OR a non-empty extracted payload must accompany the name.
    if (!placeId && extractedRooms.length === 0 && !extracted) {
      return NextResponse.json({ error: 'placeId or extracted payload is required' }, { status: 400 });
    }

    const tenantId = session.user.tenantId;

    const property = await prisma.$transaction(async (tx) => {
      // Update tenant name + draft flag.
      const t = await tx.tenant.findUnique({
        where: { id: tenantId },
        select: { settings: true, name: true },
      });
      const existingSettings = (t?.settings as Record<string, unknown> | null) ?? {};

      const seedSource = body.source ?? (placeId ? 'places' : extracted ? 'extract' : 'manual');
      await tx.tenant.update({
        where: { id: tenantId },
        data: {
          name,
          settings: {
            ...existingSettings,
            draftMode: true,
            seededFromHotellook: placeId || null, // legacy key
            seededFromPlaceId: placeId || null,
            seedSource,
            seededAt: new Date().toISOString(),
          },
        },
      });

      // Update OR create the tenant's Property. The /api/public/onboard
      // route creates a placeholder Property when a tenant signs up, so
      // we normally find one to update. We handle the missing case to be
      // safe for older tenants.
      const existing = await tx.property.findFirst({ where: { tenantId } });
      const propertyData = {
        name,
        city,
        country,
        images: photos,
        description,
        amenities,
        ...(address && address !== '—' ? { address } : {}),
        ...(extracted?.checkInTime ? { checkInTime: extracted.checkInTime } : {}),
        ...(extracted?.checkOutTime ? { checkOutTime: extracted.checkOutTime } : {}),
      };

      const property = existing
        ? await tx.property.update({
            where: { id: existing.id },
            data: propertyData,
          })
        : await tx.property.create({
            data: {
              ...propertyData,
              tenantId,
              address: ('address' in propertyData ? propertyData.address : null) || '—',
              state: '—',
              zipCode: '—',
              phone: '—',
              email: '—',
            },
          });

      // Build the starter room list. If we have extracted rooms from a
      // Booking.com listing, mint one Room per type using the extracted
      // names, capacities, and prices. Otherwise drop generic STANDARD
      // rooms numbered 101, 102, … so the storefront isn't empty.
      const existingRooms = await tx.room.findMany({
        where: { tenantId },
        select: { number: true },
      });
      const usedNumbers = new Set(existingRooms.map((r) => r.number));
      let cursor = 101;
      const nextNumber = () => {
        while (usedNumbers.has(String(cursor))) cursor++;
        const n = String(cursor);
        usedNumbers.add(n);
        cursor++;
        return n;
      };

      // Prisma's RoomType enum: STANDARD, DELUXE, SUITE, FAMILY, DORMITORY.
      // "TWIN" comes back from Gemini for two-single-bed rooms — collapse to
      // STANDARD since we don't have a dedicated enum value.
      const validRoomTypes = new Set(['STANDARD', 'DELUXE', 'SUITE', 'FAMILY', 'DORMITORY']);

      const roomsToCreate = extractedRooms.length > 0
        ? extractedRooms.slice(0, 20).map((r) => {
            const type = (r.type || '').toUpperCase();
            return {
              tenantId,
              propertyId: property.id,
              number: nextNumber(),
              name: (r.name || `Room`).slice(0, 80),
              type: (validRoomTypes.has(type) ? type : 'STANDARD') as
                'STANDARD' | 'DELUXE' | 'SUITE' | 'FAMILY' | 'DORMITORY',
              capacity: Math.max(1, Math.min(10, Number(r.capacity) || 2)),
              basePrice: Math.max(20, Math.min(50_000, Number(r.basePrice) || starterRoomPrice)),
              bedType: (r.beds || '').slice(0, 80) || null,
              description: (r.description || '').slice(0, 500) || null,
              amenities: [],
              images: [],
            };
          })
        : Array.from({ length: starterRoomCount }, () => ({
            tenantId,
            propertyId: property.id,
            number: nextNumber(),
            name: `Room`,
            type: 'STANDARD' as const,
            capacity: 2,
            basePrice: starterRoomPrice,
            bedType: null as string | null,
            description: null as string | null,
            amenities: [] as string[],
            images: [] as string[],
          }));

      if (roomsToCreate.length > 0) {
        // Number each room sequentially after a name we already used so a
        // second "Deluxe" gets "Deluxe 2" rather than two copies of the
        // same row.
        const nameCounts: Record<string, number> = {};
        const dedup = roomsToCreate.map((r) => {
          const key = r.name;
          nameCounts[key] = (nameCounts[key] || 0) + 1;
          return {
            ...r,
            name: nameCounts[key] > 1 ? `${r.name} ${nameCounts[key]}` : r.name,
          };
        });
        await tx.room.createMany({ data: dedup });
      }

      return property;
    });

    return NextResponse.json({
      success: true,
      propertyId: property.id,
      draftMode: true,
      next: '/admin/web?tab=branding',
    });
  } catch (error) {
    console.error('Seed apply error:', error);
    return NextResponse.json(
      { error: 'Failed to apply seed' },
      { status: 500 }
    );
  }
}
