/**
 * Idempotently provision STAY subscription billing in Stripe.
 *
 * Creates (or reuses, via price lookup_keys) the recurring monthly prices for
 * the STAY plans + Web Presence add-on, and ensures a webhook endpoint pointing
 * at the production /api/webhooks/stripe. Prints the price IDs and (if newly
 * created) the webhook signing secret so they can be set as env vars.
 *
 * Reads STRIPE_SECRET_KEY from env — never hard-code it here. Re-running is safe.
 *
 *   STRIPE_SECRET_KEY=... tsx scripts/setup-stripe-billing.ts
 */
import Stripe from 'stripe';

const key = process.env.STRIPE_SECRET_KEY?.trim();
if (!key) {
  console.error('STRIPE_SECRET_KEY env var is required');
  process.exit(1);
}
const stripe = new Stripe(key, { apiVersion: '2025-02-24.acacia' });

const WEBHOOK_URL = 'https://stay.amaldives.com/api/webhooks/stripe';
const WEBHOOK_EVENTS: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
];

const PLANS = [
  { key: 'growth', name: 'STAY Growth', amount: 1900, lookup: 'stay_growth_monthly', desc: 'Channel sync + SMS' },
  { key: 'business', name: 'STAY Business', amount: 4900, lookup: 'stay_business_monthly', desc: 'API + multi-property' },
  { key: 'channel', name: 'STAY Channel Plus', amount: 7900, lookup: 'stay_channel_monthly', desc: 'Priority sync + Stripe direct' },
  { key: 'web', name: 'STAY Web Presence', amount: 2900, lookup: 'stay_web_monthly', desc: 'Own-domain website + brand email + hosting' },
] as const;

async function ensurePrice(plan: (typeof PLANS)[number]): Promise<string> {
  // Reuse an existing price by lookup_key so re-runs don't duplicate.
  const existing = await stripe.prices.list({ lookup_keys: [plan.lookup], active: true, limit: 1 });
  if (existing.data[0]) {
    console.log(`  = ${plan.key}: reused ${existing.data[0].id} ($${plan.amount / 100}/mo)`);
    return existing.data[0].id;
  }
  const product = await stripe.products.create({
    name: plan.name,
    description: plan.desc,
    metadata: { stay_plan: plan.key },
  });
  const price = await stripe.prices.create({
    product: product.id,
    currency: 'usd',
    unit_amount: plan.amount,
    recurring: { interval: 'month' },
    lookup_key: plan.lookup,
    metadata: { stay_plan: plan.key },
  });
  console.log(`  + ${plan.key}: created ${price.id} ($${plan.amount / 100}/mo)`);
  return price.id;
}

async function ensureWebhook(): Promise<string | null> {
  try {
    const list = await stripe.webhookEndpoints.list({ limit: 100 });
    const found = list.data.find((w) => w.url === WEBHOOK_URL);
    if (found) {
      console.log(`  = webhook: exists ${found.id} (secret not retrievable on existing endpoints — reuse the stored STRIPE_WEBHOOK_SECRET)`);
      return null;
    }
    const created = await stripe.webhookEndpoints.create({
      url: WEBHOOK_URL,
      enabled_events: WEBHOOK_EVENTS,
      description: 'STAY subscriptions + booking checkout',
    });
    console.log(`  + webhook: created ${created.id}`);
    return created.secret ?? null;
  } catch (err) {
    console.warn(`  ! webhook step skipped: ${(err as Error).message}`);
    return null;
  }
}

async function main() {
  console.log(`Stripe key: ${key!.slice(0, 8)}… (${key!.startsWith('rk_') ? 'restricted' : 'secret'}, ${key!.includes('_live_') ? 'LIVE' : 'TEST'})`);
  console.log('Prices:');
  const ids: Record<string, string> = {};
  for (const plan of PLANS) ids[plan.key] = await ensurePrice(plan);
  console.log('Webhook:');
  const whsec = await ensureWebhook();

  console.log('\n=== ENV VARS TO SET ===');
  console.log(`STRIPE_PRICE_GROWTH=${ids.growth}`);
  console.log(`STRIPE_PRICE_BUSINESS=${ids.business}`);
  console.log(`STRIPE_PRICE_CHANNEL=${ids.channel}`);
  console.log(`STRIPE_PRICE_WEB=${ids.web}`);
  if (whsec) console.log(`STRIPE_WEBHOOK_SECRET=${whsec}`);
}

main()
  .catch((e) => {
    console.error('Error:', e.message);
    process.exit(1);
  });
