import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  if (!stripeClient) {
    stripeClient = new Stripe(key, { apiVersion: '2025-02-24.acacia' });
  }
  return stripeClient;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export const STRIPE_PLAN_PRICES = {
  growth: process.env.STRIPE_PRICE_GROWTH ?? '',
  business: process.env.STRIPE_PRICE_BUSINESS ?? '',
  channel: process.env.STRIPE_PRICE_CHANNEL ?? '',
  // Web Presence add-on: own-domain website + brand email + hosting.
  web: process.env.STRIPE_PRICE_WEB ?? '',
} as const;

export function planFromStripePrice(priceId: string): string {
  if (!priceId) return 'basic';
  if (priceId === STRIPE_PLAN_PRICES.channel) return 'channel';
  if (priceId === STRIPE_PLAN_PRICES.business) return 'business';
  if (priceId === STRIPE_PLAN_PRICES.growth) return 'growth';
  if (priceId === STRIPE_PLAN_PRICES.web) return 'web';
  return 'basic';
}
