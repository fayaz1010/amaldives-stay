import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hotellookPhoto } from '@/lib/hotellook';

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

    const hotellookId = Number(body.hotellookId);
    const name = String(body.name ?? '').trim();
    const city = String(body.city ?? '').trim() || '—';
    const country = String(body.country ?? 'Maldives').trim() || 'Maldives';
    const starterRoomCount = Math.max(1, Math.min(20, Number(body.starterRoomCount ?? 4)));
    const starterRoomPrice = Math.max(20, Math.min(5000, Number(body.starterRoomPrice ?? 85)));

    if (!Number.isFinite(hotellookId) || hotellookId <= 0 || !name) {
      return NextResponse.json({ error: 'hotellookId and name are required' }, { status: 400 });
    }

    const tenantId = session.user.tenantId;

    // Build the photo list. Hotellook hosts up to ~10 per hotel; we grab
    // the first 6 by convention. They'll 404-on-render for hotels with
    // fewer photos but Next.js' <Image> handles that gracefully.
    const photos = [1, 2, 3, 4, 5, 6].map((i) => hotellookPhoto(hotellookId, i));

    const property = await prisma.$transaction(async (tx) => {
      // Update tenant name + draft flag.
      const t = await tx.tenant.findUnique({
        where: { id: tenantId },
        select: { settings: true, name: true },
      });
      const existingSettings = (t?.settings as Record<string, unknown> | null) ?? {};

      await tx.tenant.update({
        where: { id: tenantId },
        data: {
          name,
          settings: {
            ...existingSettings,
            draftMode: true,
            seededFromHotellook: hotellookId,
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
        description: `${name} — direct booking page on stay.amaldives.com. Edit this description in /admin/web before publishing.`,
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
              address: '—',
              state: '—',
              zipCode: '—',
              phone: '—',
              email: '—',
            },
          });

      // Drop a starter room set so the owner can immediately see what the
      // storefront looks like. They can edit numbers / prices in /admin/rooms.
      // We skip rooms that already exist (e.g. if owner re-runs the wizard).
      const existingRooms = await tx.room.findMany({
        where: { tenantId },
        select: { number: true },
      });
      const usedNumbers = new Set(existingRooms.map((r) => r.number));
      const wanted = Array.from({ length: starterRoomCount }, (_, i) => `${101 + i}`);
      const toCreate = wanted.filter((n) => !usedNumbers.has(n));

      if (toCreate.length > 0) {
        await tx.room.createMany({
          data: toCreate.map((number) => ({
            tenantId,
            propertyId: property.id,
            number,
            name: `Room ${number}`,
            type: 'STANDARD',
            capacity: 2,
            basePrice: starterRoomPrice,
            amenities: [],
            images: [],
          })),
        });
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
