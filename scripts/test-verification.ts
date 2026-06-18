/**
 * One-off verification script — exercises pure functions and zod schemas
 * without touching the DB. Run with:
 *   npx tsx --env-file=.env.local scripts/test-verification.ts
 */
import { z } from 'zod';
import {
  normalizeFlightRef,
  matchArrivalToFlight,
} from '../lib/flight-arrival-sync';
import type { FlightArrival } from '../lib/flights';

let pass = 0;
let fail = 0;
const failures: string[] = [];

function assert(cond: boolean, label: string) {
  if (cond) {
    pass++;
    console.log(`  ok  ${label}`);
  } else {
    fail++;
    failures.push(label);
    console.log(`  FAIL ${label}`);
  }
}

// ─── normalizeFlightRef ──────────────────────────────────────────────────
console.log('\n[1] normalizeFlightRef');
assert(normalizeFlightRef('QR676') === 'QR676', 'plain code');
assert(normalizeFlightRef('qr 676') === 'QR676', 'lowercased + space');
assert(normalizeFlightRef('QR-676') === 'QR676', 'with dash');
assert(normalizeFlightRef('  ek 652  ') === 'EK652', 'padding + lowercase');
assert(normalizeFlightRef('6E1423') === '6E1423', 'leading digit');
assert(normalizeFlightRef('') === '', 'empty string');
assert(normalizeFlightRef(null) === '', 'null');
assert(normalizeFlightRef(undefined) === '', 'undefined');

// ─── matchArrivalToFlight ────────────────────────────────────────────────
console.log('\n[2] matchArrivalToFlight');
const arrivals: FlightArrival[] = [
  { flight: 'QR676', airline: 'Qatar', from: 'DOH', scheduled: '', estimated: null, status: 'Scheduled' },
  { flight: 'EK652', airline: 'Emirates', from: 'DXB', scheduled: '', estimated: null, status: 'Expected' },
];
assert(matchArrivalToFlight('QR 676', arrivals)?.flight === 'QR676', 'matches case+space variants');
assert(matchArrivalToFlight('ek-652', arrivals)?.flight === 'EK652', 'matches different OTA formatting');
assert(matchArrivalToFlight('XX999', arrivals) === null, 'no match returns null');
assert(matchArrivalToFlight('', arrivals) === null, 'empty ref returns null');
assert(matchArrivalToFlight(null, arrivals) === null, 'null ref returns null');

// ─── PublicBookingSchema ─────────────────────────────────────────────────
// Re-construct the same schema shape used in the route since the route
// file is a Next.js route, not exportable.
const isoDate = z
  .string()
  .min(1)
  .refine((v) => !Number.isNaN(new Date(v).getTime()), 'Invalid date');

const PublicBookingSchema = z
  .object({
    roomId: z.string().min(1),
    checkIn: isoDate,
    checkOut: isoDate,
    adults: z.number().int().positive().max(20).optional(),
    children: z.number().int().nonnegative().max(20).optional(),
    guestName: z.string().trim().min(1).max(200),
    guestEmail: z.string().trim().email(),
    guestPhone: z.string().trim().max(40).optional(),
    specialRequests: z.string().max(2000).optional(),
    source: z.string().max(60).optional().default('direct'),
    paymentMethod: z
      .enum(['stripe', 'pay_at_property', 'maya', 'bml_connect'])
      .optional()
      .default('stripe'),
  })
  .refine((v) => new Date(v.checkOut) > new Date(v.checkIn), {
    message: 'checkOut must be after checkIn',
    path: ['checkOut'],
  });

console.log('\n[3] PublicBookingSchema');
assert(
  PublicBookingSchema.safeParse({
    roomId: 'rm_1',
    checkIn: '2026-07-01',
    checkOut: '2026-07-05',
    guestName: 'Jane',
    guestEmail: 'jane@example.com',
  }).success,
  'minimal valid payload',
);
assert(
  !PublicBookingSchema.safeParse({}).success,
  'empty payload rejected',
);
assert(
  !PublicBookingSchema.safeParse({
    roomId: 'rm_1',
    checkIn: '2026-07-05',
    checkOut: '2026-07-01',
    guestName: 'Jane',
    guestEmail: 'jane@example.com',
  }).success,
  'reversed dates rejected',
);
assert(
  !PublicBookingSchema.safeParse({
    roomId: 'rm_1',
    checkIn: '2026-07-01',
    checkOut: '2026-07-05',
    guestName: '',
    guestEmail: 'jane@example.com',
  }).success,
  'empty guestName rejected',
);
assert(
  !PublicBookingSchema.safeParse({
    roomId: 'rm_1',
    checkIn: '2026-07-01',
    checkOut: '2026-07-05',
    guestName: 'Jane',
    guestEmail: 'not-an-email',
  }).success,
  'invalid email rejected',
);
assert(
  !PublicBookingSchema.safeParse({
    roomId: 'rm_1',
    checkIn: 'not-a-date',
    checkOut: '2026-07-05',
    guestName: 'Jane',
    guestEmail: 'jane@example.com',
  }).success,
  'invalid date rejected',
);
assert(
  !PublicBookingSchema.safeParse({
    roomId: 'rm_1',
    checkIn: '2026-07-01',
    checkOut: '2026-07-05',
    guestName: 'Jane',
    guestEmail: 'jane@example.com',
    paymentMethod: 'bitcoin',
  }).success,
  'unknown paymentMethod rejected',
);
assert(
  !PublicBookingSchema.safeParse({
    roomId: '',
    checkIn: '2026-07-01',
    checkOut: '2026-07-05',
    guestName: 'Jane',
    guestEmail: 'jane@example.com',
  }).success,
  'empty roomId rejected',
);

// ─── AdminBookingSchema (mirrored from admin route) ──────────────────────
const GuestDataSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email(),
  firstName: z.string().trim().max(120).optional(),
  lastName: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(40).optional(),
  nationality: z.string().trim().max(80).optional(),
});

const AdminBookingSchema = z
  .object({
    roomId: z.string().min(1),
    propertyId: z.string().min(1),
    checkInDate: isoDate,
    checkOutDate: isoDate,
    adults: z.number().int().positive().max(20),
    children: z.number().int().nonnegative().max(20).optional().default(0),
    totalAmount: z.number().nonnegative().optional(),
    status: z.string().max(40).optional().default('CONFIRMED'),
    source: z.string().max(60).optional().default('DIRECT'),
    guestData: GuestDataSchema.optional(),
    guestId: z.string().min(1).optional(),
    specialRequests: z.string().max(2000).optional(),
    notes: z.string().max(2000).optional(),
    confirmationNumber: z.string().max(60).optional(),
  })
  .refine((v) => new Date(v.checkOutDate) > new Date(v.checkInDate), {
    message: 'checkOutDate must be after checkInDate',
    path: ['checkOutDate'],
  })
  .refine((v) => Boolean(v.guestId || v.guestData), {
    message: 'guestData (name + email) is required when guestId is not provided',
    path: ['guestData'],
  });

console.log('\n[4] AdminBookingSchema');
assert(
  AdminBookingSchema.safeParse({
    roomId: 'r1',
    propertyId: 'p1',
    checkInDate: '2026-07-01',
    checkOutDate: '2026-07-05',
    adults: 2,
    guestData: { name: 'Joe', email: 'joe@example.com' },
  }).success,
  'minimal valid admin booking',
);
assert(
  !AdminBookingSchema.safeParse({
    roomId: 'r1',
    propertyId: 'p1',
    checkInDate: '2026-07-01',
    checkOutDate: '2026-07-05',
    adults: 2,
  }).success,
  'rejected without guestData or guestId',
);
assert(
  !AdminBookingSchema.safeParse({
    roomId: 'r1',
    propertyId: 'p1',
    checkInDate: '2026-07-05',
    checkOutDate: '2026-07-01',
    adults: 2,
    guestData: { name: 'Joe', email: 'joe@example.com' },
  }).success,
  'rejected with reversed dates',
);
assert(
  !AdminBookingSchema.safeParse({
    roomId: 'r1',
    propertyId: 'p1',
    checkInDate: '2026-07-01',
    checkOutDate: '2026-07-05',
    adults: 0,
    guestData: { name: 'Joe', email: 'joe@example.com' },
  }).success,
  'rejected with zero adults',
);
assert(
  !AdminBookingSchema.safeParse({
    roomId: 'r1',
    propertyId: 'p1',
    checkInDate: '2026-07-01',
    checkOutDate: '2026-07-05',
    adults: 2,
    guestData: { name: 'Joe', email: 'not-an-email' },
  }).success,
  'rejected with bad email',
);

// ─── Commission (TASK-25) ────────────────────────────────────────────────
import {
  getPlatformCommissionRate,
  calculatePlatformFee,
  isAmaldivesMarketplaceSource,
  STAY_MARKETPLACE_COMMISSION,
  STAY_DIRECT_COMMISSION_DEFAULT,
} from '../lib/commission';
import { canAccessStayChat } from '../lib/stay-chat';
import { agentRateFromRack } from '../lib/agent-rate';
import { applyPromotion } from '../lib/calculate-stay-rate';

console.log('\n[5] Commission policy');
const liveTenant = { status: 'ACTIVE', amaldivesSlug: 'demo-gh', commissionRate: 0.04 };
assert(isAmaldivesMarketplaceSource('amaldives.com'), 'amaldives.com is marketplace source');
assert(isAmaldivesMarketplaceSource('www.amaldives.com'), 'www.amaldives.com matches');
assert(!isAmaldivesMarketplaceSource('direct'), 'direct is not marketplace');
assert(
  getPlatformCommissionRate(liveTenant, 'amaldives.com') === STAY_MARKETPLACE_COMMISSION,
  'marketplace + live tenant = 10%',
);
assert(
  getPlatformCommissionRate(liveTenant, 'direct') === 0.04,
  'direct on live tenant = tenant rate 4%',
);
assert(
  getPlatformCommissionRate({ status: 'TRIAL', amaldivesSlug: 'x' }, 'amaldives.com') === STAY_DIRECT_COMMISSION_DEFAULT,
  'non-ACTIVE tenant stays at default on marketplace source',
);
assert(calculatePlatformFee(100, 0.1) === 10, 'platform fee math');
assert(calculatePlatformFee(-5, 0.1) === 0, 'negative total → 0 fee');

console.log('\n[6] Stay chat window');
const checkIn = new Date('2026-07-10T12:00:00Z');
const checkOut = new Date('2026-07-13T12:00:00Z');
assert(
  canAccessStayChat({ checkInDate: checkIn, checkOutDate: checkOut, status: 'CHECKED_IN' }, new Date('2026-07-11')),
  'open mid-stay',
);
assert(
  !canAccessStayChat({ checkInDate: checkIn, checkOutDate: checkOut, status: 'CHECKED_IN' }, new Date('2026-07-09')),
  'closed before check-in day',
);
assert(
  canAccessStayChat({ checkInDate: checkIn, checkOutDate: checkOut, status: 'CHECKED_IN' }, new Date('2026-07-13')),
  'open on departure day',
);
assert(
  !canAccessStayChat({ checkInDate: checkIn, checkOutDate: checkOut, status: 'CANCELLED' }, new Date('2026-07-11')),
  'cancelled booking closed',
);

console.log('\n[7] Agent rack markup');
assert(agentRateFromRack(100, 10) === 110, '+10% on rack');
assert(agentRateFromRack(200, -5) === 190, '-5% on rack');

console.log('\n[8] Promotion discount');
assert(applyPromotion(80, 100, { discountPercent: 10, appliesTo: 'RACK' }) === 80, 'rack discount capped at sell');
assert(applyPromotion(80, 100, { discountPercent: 10, appliesTo: 'ALL' }) === 72, 'sell discount 10%');

// ─── Summary ─────────────────────────────────────────────────────────────
console.log(`\n=== ${pass} passed, ${fail} failed ===`);
if (fail > 0) {
  console.log('Failures:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
