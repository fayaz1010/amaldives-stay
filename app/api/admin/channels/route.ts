import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { syncFeed } from '@/lib/ical-sync';

export const dynamic = 'force-dynamic';

const VALID_SOURCES = new Set(['BOOKING_COM', 'AIRBNB', 'VRBO', 'OTHER']);

/**
 * GET — list this tenant's iCal feeds with their last sync status.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const feeds = await prisma.externalCalendarFeed.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { createdAt: 'asc' },
    include: {
      room: { select: { id: true, number: true, name: true } },
    },
  });

  return NextResponse.json({ feeds });
}

/**
 * POST — add a new feed. Performs an immediate sync so the owner sees
 * the block count update right away, rather than waiting up to 15 min
 * for the cron to run.
 */
export async function POST(request: NextRequest) {
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

  const icalUrl = String(body.icalUrl ?? '').trim();
  const label = String(body.label ?? '').trim() || 'External calendar';
  const sourceRaw = String(body.source ?? 'OTHER').toUpperCase();
  const source = VALID_SOURCES.has(sourceRaw) ? sourceRaw : 'OTHER';
  const roomId = body.roomId ? String(body.roomId) : null;

  if (!/^https?:\/\//i.test(icalUrl)) {
    return NextResponse.json(
      { error: 'icalUrl must be a full https:// URL from your OTA extranet.' },
      { status: 400 }
    );
  }

  // If a room was specified, double-check it belongs to this tenant so a
  // crafted payload can't bind a feed to someone else's room.
  if (roomId) {
    const room = await prisma.room.findFirst({
      where: { id: roomId, tenantId: session.user.tenantId },
      select: { id: true },
    });
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }
  }

  let feed;
  try {
    feed = await prisma.externalCalendarFeed.create({
      data: {
        tenantId: session.user.tenantId,
        roomId,
        icalUrl,
        label,
        source,
      },
    });
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json(
        { error: 'You already have a feed with this URL.' },
        { status: 409 }
      );
    }
    throw e;
  }

  // Fire and forget the first sync — wait up to 10s so the owner sees the
  // result inline, but don't block the create response forever if the OTA
  // is slow.
  const syncResult = await Promise.race([
    syncFeed(feed.id),
    new Promise<{ ok: false; eventCount: 0; error: string }>((resolve) =>
      setTimeout(() => resolve({ ok: false, eventCount: 0, error: 'Sync still running — refresh shortly to see the result' }), 10_000)
    ),
  ]);

  return NextResponse.json({ feed, sync: syncResult }, { status: 201 });
}
