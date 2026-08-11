/**
 * Vayves subscription tiers — single source of truth for plan gating.
 *
 * basic    – all operational features (bookings, housekeeping, staff, finance, etc.)
 * free     – claimed/auto-provisioned tenants. Web editing intentionally
 *            UNLOCKED: the claim-first onboarding depends on owners setting up
 *            their page (and amaldives.com featuring) before they ever pay.
 * growth   – $19/mo: channel sync + SMS
 * web      – $29/mo add-on: amaldives.com page editing + own-domain website + iCal export
 * business – $49/mo: web + API + multi-property
 * channel  – $79/mo: everything + channel manager Plus + Stripe direct booking
 * pro/enterprise – legacy/manual tiers, everything unlocked
 */
export const PLAN_TIERS = {
  BASIC: 'basic',
  FREE: 'free',
  GROWTH: 'growth',
  WEB: 'web',
  BUSINESS: 'business',
  CHANNEL: 'channel',
} as const;

export type PlanTier = typeof PLAN_TIERS[keyof typeof PLAN_TIERS];

const WEB_PLANS = new Set(['free', 'web', 'growth', 'business', 'channel', 'pro', 'enterprise']);
const CHANNEL_PLANS = new Set(['growth', 'business', 'channel', 'pro', 'enterprise']);

/** amaldives.com page editing, web profile, own-domain website tools. */
export function hasWebFeatures(plan: string): boolean {
  return WEB_PLANS.has(plan.toLowerCase());
}

/** Channel manager features (OTA sync guidance, priority sync). */
export function hasChannelFeatures(plan: string): boolean {
  return CHANNEL_PLANS.has(plan.toLowerCase());
}

export const PLAN_LABELS: Record<string, string> = {
  basic: 'Basic',
  free: 'Free',
  growth: 'Growth',
  web: 'Web',
  business: 'Business',
  channel: 'Channel Plus',
  pro: 'Pro',
  enterprise: 'Enterprise',
};
