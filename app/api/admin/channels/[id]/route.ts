import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { syncFeed } from '@/lib/ical-sync';

export const dynamic = 'force-dynamic';

/**
 * PATCH — manual "sync now" trigger for a single feed. The cron handles
 * routine refreshes; this endpoint exists so the owner can hit a button
 * after adding a booking on the OTA and not wait up to 15 minutes.
 */
export async function PATCH(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const feed = await prisma.externalCalendarFeed.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    select: { id: true },
  });
  if (!feed) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const result = await syncFeed(feed.id);
  return NextResponse.json({ sync: result });
}

/**
 * DELETE — remove a feed and all blocks derived from it. The blocks
 * cascade-delete via the FK so we just need to delete the feed row.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!['TENANT_ADMIN', 'OWNER'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const feed = await prisma.externalCalendarFeed.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    select: { id: true },
  });
  if (!feed) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.externalCalendarFeed.delete({ where: { id: feed.id } });
  return NextResponse.json({ success: true });
}
