/**
 * Smoke test for TASK-06, TASK-10, TASK-11, TASK-18 modules.
 * Run: npx tsx --env-file=.env.local scripts/verify-new-features.ts
 */
import { z } from 'zod';
import { getMaleArrivals } from '../lib/flights';
import {
  matchArrivalToFlight,
  normalizeFlightRef,
} from '../lib/flight-arrival-sync';

async function main() {
  const out: Record<string, unknown> = {};

  // ── TASK-06: flight matcher ─────────────────────────────────────────────
  const board = await getMaleArrivals();
  out.flightBoard = {
    source: board.source,
    arrivalCount: board.arrivals.length,
    firstFlight: board.arrivals[0]?.flight,
  };
  const matched = matchArrivalToFlight('QR-676', board.arrivals);
  out.flightMatcher = {
    normalize_QR676: normalizeFlightRef('QR-676 '),
    matchedQR676: !!matched && matched.flight === 'QR676',
  };

  // ── TASK-18: zod boundary (mirror of app/api/public/.../book/route.ts) ─
  const isoDate = z
    .string()
    .min(1)
    .refine((v) => !Number.isNaN(new Date(v).getTime()), 'Invalid date');
  const Schema = z
    .object({
      roomId: z.string().min(1),
      checkIn: isoDate,
      checkOut: isoDate,
      guestName: z.string().trim().min(1).max(200),
      guestEmail: z.string().trim().email(),
    })
    .refine((v) => new Date(v.checkOut) > new Date(v.checkIn), {
      message: 'checkOut must be after checkIn',
      path: ['checkOut'],
    });

  const bad = Schema.safeParse({
    roomId: '',
    checkIn: 'not-a-date',
    checkOut: 'also-not',
    guestName: '',
    guestEmail: 'bad',
  });
  const reversed = Schema.safeParse({
    roomId: 'r1',
    checkIn: '2026-07-10',
    checkOut: '2026-07-05',
    guestName: 'Test',
    guestEmail: 'a@b.com',
  });
  const ok = Schema.safeParse({
    roomId: 'r1',
    checkIn: '2026-07-01',
    checkOut: '2026-07-05',
    guestName: 'Test',
    guestEmail: 'a@b.com',
  });
  out.zod = {
    rejectsBadInput: !bad.success,
    badIssueCount: !bad.success
      ? Object.keys(bad.error.flatten().fieldErrors).length
      : 0,
    rejectsReversedDates: !reversed.success,
    acceptsValid: ok.success,
  };

  // ── TASK-11: notifications module — import surface only (no DB write) ──
  const notif = await import('../lib/notifications');
  out.notifications = {
    queueExported: typeof notif.queueNotification === 'function',
    sendExported: typeof notif.sendPendingNotifications === 'function',
  };

  // ── TASK-10: ical-booking-promote module surface ───────────────────────
  const promo = await import('../lib/ical-booking-promote');
  out.icalPromote = {
    promoteExported: typeof promo.promoteIcalEventToBooking === 'function',
    cancelExported: typeof promo.cancelDisappearedIcalBookings === 'function',
  };

  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
