import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { ensureGuestUser } from '@/lib/ical-booking-promote';
import type { ParsedOtaEmail } from '@/lib/ota-email-parse';

export interface IngestResult {
  status: 'created' | 'updated' | 'cancelled' | 'skipped';
  bookingId?: string;
  reason?: string;
  roomMatched?: boolean;
}

/** Dedupe key reuses the unique Booking.icalUid column so an OTA reservation
 *  maps to exactly one Booking row no matter how many notification emails
 *  (new + modified) arrive for it. Namespaced by source so refs can't collide. */
function dedupeKey(source: string, otaRef: string): string {
  return `email:${source}:${otaRef.toUpperCase()}`;
}

/** Best-effort map of the email's room description to one of the tenant's
 *  rooms. Matches on name / typeLabel, in either direction (contains). Falls
 *  back to the property's first active room and flags it for staff. */
async function resolveRoom(tenantId: string, roomHint: string | null) {
  const rooms = await prisma.room.findMany({
    where: { tenantId, isActive: true },
    select: { id: true, propertyId: true, basePrice: true, name: true, number: true,
      // typeLabel exists at runtime; select via cast below
    },
    orderBy: [{ name: 'asc' }, { number: 'asc' }],
  });
  if (rooms.length === 0) return { room: null as null | typeof rooms[number], matched: false };

  if (roomHint) {
    const hint = roomHint.toLowerCase().trim();
    const match = rooms.find((r) => {
      const name = (r.name || '').toLowerCase();
      return name && (name.includes(hint) || hint.includes(name));
    });
    if (match) return { room: match, matched: true };
  }
  return { room: rooms[0], matched: false };
}

/**
 * Create / update / cancel a Booking from a parsed OTA email. Idempotent on
 * (source, otaRef) via Booking.icalUid. Never deletes.
 */
export async function ingestOtaEmailBooking(
  tenantId: string,
  parsed: ParsedOtaEmail
): Promise<IngestResult> {
  const key = dedupeKey(parsed.source, parsed.otaRef);
  const existing = await prisma.booking.findUnique({
    where: { icalUid: key },
    select: { id: true },
  });

  // ── Cancellation ────────────────────────────────────────────────
  if (parsed.action === 'cancelled') {
    if (!existing) return { status: 'skipped', reason: 'cancellation for unknown reservation' };
    await prisma.booking.update({
      where: { id: existing.id },
      data: { status: 'CANCELLED' },
    });
    return { status: 'cancelled', bookingId: existing.id };
  }

  if (!parsed.checkIn || !parsed.checkOut || !(parsed.checkOut > parsed.checkIn)) {
    return { status: 'skipped', reason: 'invalid date range' };
  }

  const { room, matched } = await resolveRoom(tenantId, parsed.roomHint);
  if (!room) return { status: 'skipped', reason: 'tenant has no rooms to assign' };

  const haveGuestInfo = !!(parsed.guestEmail || parsed.guestName || parsed.guestPhone);
  const status: 'CONFIRMED' | 'PENDING' = haveGuestInfo ? 'CONFIRMED' : 'PENDING';

  const unmatchedNote = matched
    ? ''
    : ` ⚠ Room not matched from "${parsed.roomHint ?? 'unknown'}" — assigned ${room.name} ${room.number}; please verify.`;

  // ── Update existing (e.g. modified reservation email) ────────────
  if (existing) {
    await prisma.booking.update({
      where: { id: existing.id },
      data: {
        checkInDate: parsed.checkIn,
        checkOutDate: parsed.checkOut,
        roomId: room.id,
        propertyId: room.propertyId,
        adults: parsed.adults ?? undefined,
        children: parsed.children ?? undefined,
        status,
      },
    });
    return { status: 'updated', bookingId: existing.id, roomMatched: matched };
  }

  // ── Create new ───────────────────────────────────────────────────
  const guestEmail = parsed.guestEmail || syntheticEmail(parsed.source, parsed.otaRef);
  const guestName = parsed.guestName || `${prettySource(parsed.source)} guest`;
  const guestUser = await ensureGuestUser({
    email: guestEmail,
    name: guestName,
    phone: parsed.guestPhone ?? null,
  });

  const nights = Math.max(
    1,
    Math.ceil((parsed.checkOut.getTime() - parsed.checkIn.getTime()) / (1000 * 60 * 60 * 24))
  );
  const totalAmount = parsed.amount ?? room.basePrice * nights;

  const created = await prisma.booking.create({
    data: {
      tenantId,
      propertyId: room.propertyId,
      roomId: room.id,
      guestId: guestUser.id,
      confirmationNumber: buildConfirmationNumber(parsed.source, parsed.otaRef),
      checkInDate: parsed.checkIn,
      checkOutDate: parsed.checkOut,
      adults: parsed.adults ?? 1,
      children: parsed.children ?? 0,
      totalAmount,
      platformFee: 0,
      status,
      source: parsed.source,
      notes: `Imported from ${parsed.source} via email (ref ${parsed.otaRef}).${unmatchedNote}`.trim(),
      icalUid: key,
    },
    select: { id: true },
  });

  try {
    const { ensureCheckInCodes } = await import('@/lib/instant-checkin');
    await ensureCheckInCodes(created.id);
  } catch {
    /* check-in codes are non-critical for import; ignore failures */
  }

  return { status: 'created', bookingId: created.id, roomMatched: matched };
}

function syntheticEmail(source: string, otaRef: string): string {
  const h = crypto.createHash('sha1').update(`${source}:${otaRef}`).digest('hex').slice(0, 12);
  return `ota-${h}@email.stay.local`;
}

function buildConfirmationNumber(source: string, otaRef: string): string {
  const tag = (source.split(/[.\s_]/)[0] || 'OTA').toUpperCase().slice(0, 8);
  const clean = otaRef.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 12);
  return `OTA-${tag}-${clean}`;
}

function prettySource(source: string): string {
  return source
    .split(/[.\s_]/)
    .map((p) => (p.length === 0 ? p : p[0].toUpperCase() + p.slice(1).toLowerCase()))
    .join('.');
}
