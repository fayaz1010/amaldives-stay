import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getStripe, isStripeConfigured, STRIPE_PLAN_PRICES } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

const PLAN_MAP: Record<string, string> = {
  growth: STRIPE_PLAN_PRICES.growth,
  business: STRIPE_PLAN_PRICES.business,
  channel: STRIPE_PLAN_PRICES.channel,
  web: STRIPE_PLAN_PRICES.web,
};

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'Subscriptions are not configured yet' }, { status: 503 });
  }

  const stripe = getStripe()!;
  const { planKey } = await request.json();
  const priceId = PLAN_MAP[String(planKey).toLowerCase()];
  if (!priceId) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    include: { users: { where: { role: 'TENANT_ADMIN' }, take: 1 } },
  });
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

  let customerId = tenant.stripeCustomerId;
  const ownerEmail = tenant.users[0]?.email;
  if (!customerId && ownerEmail) {
    const customer = await stripe.customers.create({
      email: ownerEmail,
      name: tenant.name,
      metadata: { tenantId: tenant.id, subdomain: tenant.subdomain },
    });
    customerId = customer.id;
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const origin = request.headers.get('origin') ?? `https://${tenant.subdomain}.stay.amaldives.com`;
  // Store the real tier (growth/business/channel/web) so the plan is recorded accurately.
  const planTier = String(planKey).toLowerCase();

  const checkout = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId ?? undefined,
    customer_email: customerId ? undefined : ownerEmail,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: {
      type: 'subscription',
      tenantId: tenant.id,
      planTier,
    },
    subscription_data: {
      metadata: { tenantId: tenant.id, planTier },
    },
    // session_id lets the billing page confirm + activate the plan on return,
    // so activation doesn't depend on a webhook being registered.
    success_url: `${origin}/admin/settings/billing?success=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/admin/settings/billing?cancelled=1`,
  });

  return NextResponse.json({ checkoutUrl: checkout.url });
}
