/**
 * Guest-facing booking reference. Guests read these out over the phone and OTAs
 * quote them back, so the prefix is brand-visible.
 *
 * Bookings created before the Vayves rebrand carry the old `STAY-` prefix and
 * are still looked up by exact `confirmationNumber` match, so both forms
 * resolve indefinitely — nothing parses the prefix.
 */
export const BOOKING_REF_PREFIX = 'VYV-';

export function generateConfirmationNumber(): string {
  return BOOKING_REF_PREFIX + Date.now().toString(36).toUpperCase();
}
