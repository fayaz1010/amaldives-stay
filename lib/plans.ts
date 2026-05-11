/**
 * amaldives STAY subscription tiers.
 *
 * basic    – all operational features (bookings, housekeeping, staff, finance, etc.)
 * web      – basic + amaldives.com page editing + iCal export for channel managers
 * channel  – web + channel manager Plus (manual 2-way sync guidance + Stripe direct booking)
 */
export const PLAN_TIERS = {
  BASIC: 'basic',
  FREE: 'free',     // legacy alias for basic
  WEB: 'web',
  CHANNEL: 'channel',
} as const;

export type PlanTier = typeof PLAN_TIERS[keyof typeof PLAN_TIERS];

export function hasWebFeatures(plan: string): boolean {
  return ['web', 'channel', 'pro', 'enterprise'].includes(plan.toLowerCase());
}

export function hasChannelFeatures(plan: string): boolean {
  return ['channel', 'enterprise'].includes(plan.toLowerCase());
}

export const PLAN_LABELS: Record<string, string> = {
  basic: 'Basic',
  free: 'Basic',
  web: 'Web',
  channel: 'Channel',
  pro: 'Pro',
  enterprise: 'Enterprise',
};
