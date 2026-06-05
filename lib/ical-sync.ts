import { prisma } from '@/lib/db';
import { parseIcal } from '@/lib/ical-parse';
import { extractGuestFromIcalText, extractGuestWithAi } from '@/lib/ical-guest-extract';

interface SyncResult {
  feedId: string;
  ok: boolean;
  eventCount: number;
  error?: string;
}

/**
 * Fetch a single feed and reconcile its blocks against ExternalCalendarBlock.
 * Idempotent: we upsert by (feedId, uid) and delete blocks whose UID no
 * longer appears in the feed (cancellations).
 */
export async function syncFeed(feedId: string): Promise<SyncResult> {
  const feed = await prisma.externalCalendarFeed.findUnique({
    where: { id: feedId },
  });
  if (!feed || !feed.isActive) {
    return { feedId, ok: false, eventCount: 0, error: 'feed not found or inactive' };
  }

  try {
    const res = await fetch(feed.icalUrl, {
      // Pretend to be a calendar app so OTAs that gate on User-Agent
      // (Airbnb does) still serve us the feed.
      headers: { 'User-Agent': 'amaldives-STAY/1.0 (iCal sync)' },
      cache: 'no-store',
    });
    if (!res.ok) {
      throw new Error(`Feed returned HTTP ${res.status}`);
    }
    const text = await res.text();
    const events = parseIcal(text);

    // Upsert each event. Booking.com / Airbnb both emit stable UIDs, so
    // an existing block whose dates changed gets updated rather than
    // duplicated.
    for (const e of events) {
      let guest = extractGuestFromIcalText(e.summary, e.description);
      if (guest.confidence === 'none' && (e.summary || e.description)) {
        guest = await extractGuestWithAi(e.summary, e.description, feed.source, feed.tenantId);
      }

      await prisma.externalCalendarBlock.upsert({
        where: { feedId_uid: { feedId: feed.id, uid: e.uid } },
        update: {
          startDate: e.startDate,
          endDate: e.endDate,
          summary: e.summary ?? null,
          description: e.description ?? null,
          guestName: guest.guestName ?? null,
          guestEmail: guest.guestEmail ?? null,
          guestPhone: guest.guestPhone ?? null,
          roomId: feed.roomId,
        },
        create: {
          feedId: feed.id,
          tenantId: feed.tenantId,
          roomId: feed.roomId,
          uid: e.uid,
          summary: e.summary ?? null,
          description: e.description ?? null,
          guestName: guest.guestName ?? null,
          guestEmail: guest.guestEmail ?? null,
          guestPhone: guest.guestPhone ?? null,
          startDate: e.startDate,
          endDate: e.endDate,
          source: feed.source,
        },
      });
    }

    await prisma.$transaction(async (tx) => {
      const seenUids = events.map((e) => e.uid);

      if (seenUids.length > 0) {
        await tx.externalCalendarBlock.deleteMany({
          where: {
            feedId: feed.id,
            uid: { notIn: seenUids },
          },
        });
      } else {
        // Empty feed = no bookings. Clear everything.
        await tx.externalCalendarBlock.deleteMany({ where: { feedId: feed.id } });
      }
    });

    await prisma.externalCalendarFeed.update({
      where: { id: feed.id },
      data: {
        lastSyncedAt: new Date(),
        lastError: null,
        lastEventCount: events.length,
      },
    });

    return { feedId, ok: true, eventCount: events.length };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await prisma.externalCalendarFeed.update({
      where: { id: feed.id },
      data: { lastSyncedAt: new Date(), lastError: msg.slice(0, 500) },
    }).catch(() => {}); // never let logging itself crash the cron
    return { feedId, ok: false, eventCount: 0, error: msg };
  }
}

/**
 * Sync every active feed across all tenants. Used by /api/cron/ical-sync.
 * We run in parallel with a concurrency cap so a slow feed doesn't stall
 * the others.
 */
export async function syncAllFeeds(opts: { concurrency?: number } = {}): Promise<SyncResult[]> {
  const concurrency = opts.concurrency ?? 4;
  const feeds = await prisma.externalCalendarFeed.findMany({
    where: { isActive: true },
    select: { id: true },
  });
  const results: SyncResult[] = [];
  const queue = [...feeds];

  async function worker() {
    while (queue.length > 0) {
      const next = queue.shift();
      if (!next) break;
      results.push(await syncFeed(next.id));
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, feeds.length) }, () => worker()));
  return results;
}
