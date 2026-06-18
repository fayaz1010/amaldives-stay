import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/db';
import type { IcalEvent } from '@/lib/ical-parse';
import type { ExtractedOtaGuest } from '@/lib/ical-guest-extract';

interface PromoteFeed {
  id: string;
  tenantId: string;
  roomId: string | null;
  source: string;
}

interface PromoteResult {
  status: 'skipped' | 'created' | 'updated';
  bookingId?: string;
  reason?: string;
}

/**
 * If the VEVENT looks like a guest reservation (not just an owner-side
 * close-out / "Not available" block), upsert a Booking row keyed on
 * icalUid. The ExternalCalendarBlock that the caller already wrote is
 * intentionally left in place so the availability calendar continues
 * to treat the dates as unavailable — the Booking row is additive.
 *
 * Returns { status: 'skipped' } and a reason when nothing was promoted
 * (block, missing roomId, unparseable dates, etc.). Idempotent across
 * cron runs: the same OTA UID always maps to the same Booking row.
 */
export async function promoteIcalEventToBooking(
  feed: PromoteFeed,
  event: IcalEvent,
  guest: ExtractedOtaGuest
): Promise<PromoteResult> {
  // Feeds with roomId=null are tenant-wide blackouts; we can't pick a
  // specific room to bill so we never promote them.
  if (!feed.roomId) {
    return { status: 'skipped', reason: 'feed has no roomId' };
  }
  if (isOwnerBlock(event, guest)) {
    return { status: 'skipped', reason: 'looks like owner block' };
  }
  if (!(event.endDate > event.startDate)) {
    return { status: 'skipped', reason: 'invalid date range' };
  }

  const room = await prisma.room.findUnique({
    where: { id: feed.roomId },
    select: { id: true, propertyId: true, basePrice: true },
  });
  if (!room) {
    return { status: 'skipped', reason: 'room not found' };
  }

  const icalUid = `${feed.source}:${event.uid}`;
  const existing = await prisma.booking.findUnique({
    where: { icalUid },
    select: { id: true, guestId: true },
  });

  // Status confidence: if we got ANY guest detail (regex or AI) we treat
  // it as CONFIRMED; otherwise PENDING so staff know to verify before
  // check-in. This mirrors how a front-desk would handle a no-detail
  // "Reserved" row in their OTA extranet.
  const haveGuestInfo = !!(guest.guestEmail || guest.guestName || guest.guestPhone);
  const status: 'CONFIRMED' | 'PENDING' = haveGuestInfo ? 'CONFIRMED' : 'PENDING';

  if (existing) {
    await prisma.booking.update({
      where: { id: existing.id },
      data: {
        checkInDate: event.startDate,
        checkOutDate: event.endDate,
        roomId: room.id,
        propertyId: room.propertyId,
        status,
      },
    });
    return { status: 'updated', bookingId: existing.id };
  }

  const guestEmail = guest.guestEmail || syntheticEmail(feed.id, event.uid);
  const guestName = guest.guestName || `${prettySource(feed.source)} guest`;

  const guestUser = await ensureGuestUser({
    email: guestEmail,
    name: guestName,
    phone: guest.guestPhone ?? null,
  });

  const nights = Math.max(
    1,
    Math.ceil((event.endDate.getTime() - event.startDate.getTime()) / (1000 * 60 * 60 * 24))
  );
  // We don't know the real OTA payout — basePrice * nights is a best
  // guess so dashboard revenue isn't zeroed. Admins can correct it
  // post-arrival when they see the OTA payout statement.
  const totalAmount = room.basePrice * nights;

  const created = await prisma.booking.create({
    data: {
      tenantId: feed.tenantId,
      propertyId: room.propertyId,
      roomId: room.id,
      guestId: guestUser.id,
      confirmationNumber: buildConfirmationNumber(feed.id, feed.source, event.uid),
      checkInDate: event.startDate,
      checkOutDate: event.endDate,
      adults: 1,
      children: 0,
      totalAmount,
      platformFee: 0,
      status,
      source: feed.source,
      notes: `Imported from ${feed.source} via iCal (UID: ${event.uid})`,
      icalUid,
    },
    select: { id: true },
  });

  const { ensureCheckInCodes } = await import('@/lib/instant-checkin');
  await ensureCheckInCodes(created.id);

  return { status: 'created', bookingId: created.id };
}

/**
 * Bookings whose iCal UID is no longer present in the feed get marked
 * CANCELLED — the OTA either removed or cancelled the reservation.
 * We never delete, so payments/history stay attached.
 */
export async function cancelDisappearedIcalBookings(
  feed: PromoteFeed,
  seenUids: string[]
): Promise<number> {
  const seenIcalUids = seenUids.map((u) => `${feed.source}:${u}`);
  const res = await prisma.booking.updateMany({
    where: {
      tenantId: feed.tenantId,
      icalUid: { not: null, notIn: seenIcalUids },
      source: feed.source,
      status: { in: ['CONFIRMED', 'PENDING'] },
    },
    data: { status: 'CANCELLED' },
  });
  return res.count;
}

function isOwnerBlock(event: IcalEvent, guest: ExtractedOtaGuest): boolean {
  // If we extracted any guest detail it's a reservation, full stop.
  if (guest.guestName || guest.guestEmail || guest.guestPhone) return false;
  const summary = (event.summary || '').toLowerCase().trim();
  if (!summary) return false;
  // Booking.com publishes "CLOSED - Not available" for both reservations
  // and owner-blocks. With no extractable guest data we can't be sure,
  // so anything that *only* says "not available" / "blocked" / "closed"
  // is treated as a block. Real reservations will usually carry SOME
  // description text the extractor can latch onto.
  return /\b(not available|unavailable|blocked|owner block|closed - not avail)\b/.test(summary)
    || /^closed$/.test(summary)
    || /^airbnb \(?not available\)?$/.test(summary);
}

function syntheticEmail(feedId: string, uid: string): string {
  const h = crypto.createHash('sha1').update(`${feedId}:${uid}`).digest('hex').slice(0, 12);
  return `ota-${h}@ical.stay.local`;
}

function buildConfirmationNumber(feedId: string, source: string, uid: string): string {
  const tag = (source.split('_')[0] || 'OTA').toUpperCase().slice(0, 8);
  const h = crypto.createHash('sha1').update(`${feedId}:${uid}`).digest('hex').toUpperCase().slice(0, 10);
  return `OTA-${tag}-${h}`;
}

function prettySource(source: string): string {
  return source
    .split('_')
    .map((p) => (p.length === 0 ? p : p[0].toUpperCase() + p.slice(1).toLowerCase()))
    .join('.');
}

async function ensureGuestUser(input: {
  email: string;
  name: string;
  phone: string | null;
}) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) return existing;

  const parts = input.name.trim().split(/\s+/);
  const firstName = parts[0] || '—';
  const lastName = parts.slice(1).join(' ') || '—';

  return await prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      // Random password the guest never uses — OTA-imported guests sign
      // in via the magic guestToken issued per-booking, not via email/
      // password. We still need *something* in the column because the
      // User model marks password as required for the sign-in flow.
      password: await bcrypt.hash(randomUUID(), 10),
      role: 'GUEST',
      guestProfile: {
        create: {
          firstName,
          lastName,
          phone: input.phone,
        },
      },
    },
  });
}
