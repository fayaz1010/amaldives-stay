/**
 * Platform commission policy for Vayves bookings.
 *
 * Two-tier model:
 *   - Marketplace bookings (source = amaldives.com) on a Vayves-live tenant
 *     pay STAY_MARKETPLACE_COMMISSION (10%) — this funds the marketplace
 *     surface that delivers the booking.
 *   - Direct bookings (any other source) on the tenant's vayves.com
 *     subdomain pay tenant.commissionRate (default 4%).
 *
 * A tenant is "Vayves-live for marketplace" when its account is ACTIVE
 * (paid/active subscription) AND a non-null amaldivesSlug links it to a
 * listing on amaldives.com — both are required for the 10% rate to apply.
 */

export const STAY_MARKETPLACE_COMMISSION = 0.10;
export const STAY_DIRECT_COMMISSION_DEFAULT = 0.04;

export type CommissionTenant = {
  status: string | null | undefined;
  amaldivesSlug: string | null | undefined;
  commissionRate?: number | null | undefined;
};

/**
 * True when the tenant has an active Vayves subscription AND is wired
 * up to an amaldives.com listing.
 */
export function isStayLiveForMarketplace(
  tenant: CommissionTenant | null | undefined,
): boolean {
  if (!tenant) return false;
  if (tenant.status !== 'ACTIVE') return false;
  if (!tenant.amaldivesSlug) return false;
  return true;
}

/**
 * Normalize a booking-source label so amaldives.com / Amaldives / etc.
 * all match the marketplace rule. Anything else is treated as a direct
 * booking source.
 */
function normalizeSource(source: string | null | undefined): string {
  if (!source) return '';
  return String(source).trim().toLowerCase();
}

export function isAmaldivesMarketplaceSource(
  source: string | null | undefined,
): boolean {
  const s = normalizeSource(source);
  if (!s) return false;
  return s === 'amaldives.com' || s === 'amaldives' || s === 'www.amaldives.com';
}

/**
 * Compute the platform commission rate (0..1) for a booking. Marketplace
 * bookings on a Vayves-live tenant get 10%; anything else falls back to the
 * tenant's stored commissionRate (default 4%).
 */
export function getPlatformCommissionRate(
  tenant: CommissionTenant | null | undefined,
  source: string | null | undefined,
): number {
  if (isAmaldivesMarketplaceSource(source) && isStayLiveForMarketplace(tenant)) {
    return STAY_MARKETPLACE_COMMISSION;
  }
  return tenant?.commissionRate ?? STAY_DIRECT_COMMISSION_DEFAULT;
}

/**
 * Multiply the booking total by the commission rate. Negative totals or
 * NaN rates collapse to 0 so we never write a negative platformFee.
 */
export function calculatePlatformFee(totalAmount: number, rate: number): number {
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) return 0;
  if (!Number.isFinite(rate) || rate <= 0) return 0;
  return totalAmount * rate;
}
