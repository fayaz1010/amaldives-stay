/**
 * Maldives tax computation — per property (MIRA).
 *
 * Each Property files its OWN MIRA return (separate TIN), so tax config and all
 * computed figures are scoped to a single property. Rates are CONFIGURABLE on
 * the Property record (taxTin / tgstRate / greenTaxUsdPerNight / serviceChargeRate);
 * when a field is null we fall back to the platform defaults below.
 *
 * Verified facts (June 2026 — keep these as defaults, override per property):
 *  - TGST 17% on tourism sales (rooms, F&B, services), since 1 Jul 2025.
 *  - Green Tax USD 6/guest/night for guesthouses <=50 rooms on inhabited islands;
 *    USD 12 for >50 rooms and resorts. Under-2s are exempt.
 *  - Service charge 10% on tourism bills (distributed to staff — NOT a government tax).
 *  - MIRA filing is monthly (taxable supply > MVR 1M/period) else quarterly; due ~28th.
 *
 * These functions are PURE (no DB) so they are easy to test and reuse.
 */

export const TAX_DEFAULTS = {
  TGST_RATE: 0.17,
  SERVICE_CHARGE_RATE: 0.10,
  GREEN_TAX_SMALL_USD: 6, // guesthouse <= 50 rooms
  GREEN_TAX_LARGE_USD: 12, // > 50 rooms / resort
  GREEN_TAX_ROOM_THRESHOLD: 50,
} as const;

export interface PropertyTaxConfig {
  tin: string | null;
  tgstRate: number;
  greenTaxUsdPerNight: number;
  serviceChargeRate: number;
}

/** A property record (or partial) carrying the tax fields + a room count. */
export interface PropertyTaxInput {
  taxTin?: string | null;
  tgstRate?: number | null;
  greenTaxUsdPerNight?: number | null;
  serviceChargeRate?: number | null;
  roomCount?: number | null;
}

/**
 * Resolve the effective tax config for a property: explicit value → default.
 * Green Tax default is tiered by room count (<=50 → USD 6, else USD 12).
 */
export function resolvePropertyTaxConfig(p: PropertyTaxInput): PropertyTaxConfig {
  const greenDefault =
    (p.roomCount ?? 0) > TAX_DEFAULTS.GREEN_TAX_ROOM_THRESHOLD
      ? TAX_DEFAULTS.GREEN_TAX_LARGE_USD
      : TAX_DEFAULTS.GREEN_TAX_SMALL_USD;
  return {
    tin: p.taxTin?.trim() || null,
    tgstRate: p.tgstRate ?? TAX_DEFAULTS.TGST_RATE,
    greenTaxUsdPerNight: p.greenTaxUsdPerNight ?? greenDefault,
    serviceChargeRate: p.serviceChargeRate ?? TAX_DEFAULTS.SERVICE_CHARGE_RATE,
  };
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Number of occupied nights between two dates (checkout exclusive). */
export function nightsBetween(checkIn: Date, checkOut: Date): number {
  const ms = checkOut.getTime() - checkIn.getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

/**
 * TGST is generally tax-INCLUSIVE in displayed tourism prices in practice, but
 * for a return we compute the OUTPUT tax on the taxable base provided. Caller
 * decides whether the base is tax-exclusive (then tax = base*rate) — which is
 * what we use here for a clean output-tax figure.
 */
export function computeTgst(taxableBase: number, rate: number): number {
  return round2(taxableBase * rate);
}

/** Green Tax = guest-nights × USD rate. (Under-2 exemption not modelled — no age data.) */
export function computeGreenTax(guestNights: number, usdPerNight: number): number {
  return round2(guestNights * usdPerNight);
}

export interface MiraBookingLike {
  adults: number;
  children: number;
  totalAmount: number;
  checkInDate: Date;
  checkOutDate: Date;
}

export interface MiraReturn {
  config: PropertyTaxConfig;
  roomRevenue: number; // taxable tourism sales base (room charges)
  guestNights: number; // sum of (adults+children) * nights
  tgstOutput: number; // TGST due on room revenue
  greenTaxDue: number; // Green Tax due
  serviceCharge: number; // 10% service charge (informational — paid to staff)
  totalGovTaxDue: number; // tgstOutput + greenTaxDue (the MIRA cash)
  bookingCount: number;
  greenTaxExemptNote: string;
}

/**
 * Compute a property's MIRA figures for a set of bookings (already filtered to
 * the property + period by the caller). Revenue/guest-nights are attributed to
 * a booking if its stay overlaps the period; for simplicity the full booking is
 * counted when it overlaps (period-proration can be added later).
 */
export function computeMiraReturn(
  bookings: MiraBookingLike[],
  prop: PropertyTaxInput,
): MiraReturn {
  const config = resolvePropertyTaxConfig(prop);
  let roomRevenue = 0;
  let guestNights = 0;
  for (const b of bookings) {
    roomRevenue += b.totalAmount || 0;
    const n = nightsBetween(b.checkInDate, b.checkOutDate) || 1;
    guestNights += ((b.adults || 0) + (b.children || 0)) * n;
  }
  roomRevenue = round2(roomRevenue);
  const tgstOutput = computeTgst(roomRevenue, config.tgstRate);
  const greenTaxDue = computeGreenTax(guestNights, config.greenTaxUsdPerNight);
  const serviceCharge = round2(roomRevenue * config.serviceChargeRate);
  return {
    config,
    roomRevenue,
    guestNights,
    tgstOutput,
    greenTaxDue,
    serviceCharge,
    totalGovTaxDue: round2(tgstOutput + greenTaxDue),
    bookingCount: bookings.length,
    greenTaxExemptNote: 'Under-2 guests are Green Tax exempt; not deducted here (no age data captured).',
  };
}

/** MIRA filing due date for a period: the 28th of the FOLLOWING month. */
export function miraDueDate(periodYear: number, periodMonth1to12: number): Date {
  // following month, day 28 (UTC)
  const y = periodMonth1to12 === 12 ? periodYear + 1 : periodYear;
  const m = periodMonth1to12 === 12 ? 1 : periodMonth1to12 + 1; // 1..12
  return new Date(Date.UTC(y, m - 1, 28));
}
