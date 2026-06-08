import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getStripe, isStripeConfigured, planFromStripePrice } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/billing/confirm  { sessionId }
 *
 * Called from the billing page on the Stripe success redirect. Verifies the
 * Checkout Session belongs to the caller's tenant and is paid, then activates
 * the plan in our DB. This makes plan activation work WITHOUT a Stripe webhook
 * (the webhook handler still works too, for renewals/cancellations once a
 * webhook endpoint is registered).
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'Subscriptions are not configured yet' }, { status: 503 });
  }
  const stripe = getStripe()!;

  let sessionId: string;
  try {
    sessionId = String((await request.json()).sessionId || '').trim();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

  const cs = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['subscription'] });

  // Only the tenant that started this checkout may confirm it.
  if (cs.metadata?.tenantId !== session.user.tenantId) {
    return NextResponse.json({ error: 'Session does not belong to this tenant' }, { status: 403 });
  }

  const paid = cs.status === 'complete' || cs.payment_status === 'paid' || cs.payment_status === 'no_payment_required';
  if (!paid) {
    return NextResponse.json({ pending: true });
  }

  const sub = typeof cs.subscription === 'object' && cs.subscription ? cs.subscription : null;
  const subId = typeof cs.subscription === 'string' ? cs.subscription : sub?.id;
  const priceId = sub?.items?.data?.[0]?.price?.id ?? '';
  const plan = (cs.metadata?.planTier as string) || (priceId ? planFromStripePrice(priceId) : 'web');

  await prisma.tenant.update({
    where: { id: session.user.tenantId },
    data: {
      plan,
      stripeSubscriptionId: subId ?? undefined,
      stripeCustomerId:
        typeof cs.customer === 'string' ? cs.customer : (cs.customer as { id?: string } | null)?.id ?? undefined,
    },
  });

  return NextResponse.json({ ok: true, plan });
}
