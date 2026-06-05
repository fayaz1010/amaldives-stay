import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/db';
import { getStripe, planFromStripePrice } from '@/lib/stripe';
import { sendBookingConfirmationEmail } from '@/lib/send-booking-confirmation';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: 'Stripe webhook not configured' }, { status: 503 });
  }

  const body = await request.text();
  const sig = request.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error('Stripe webhook signature failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const meta = session.metadata ?? {};

      if (meta.type === 'booking' && meta.bookingId) {
        const booking = await prisma.booking.update({
          where: { id: meta.bookingId },
          data: { status: 'CONFIRMED', paidAmount: (session.amount_total ?? 0) / 100 },
          include: {
            guest: true,
            room: { include: { property: true } },
            tenant: true,
          },
        });

        await prisma.payment.create({
          data: {
            tenantId: booking.tenantId,
            bookingId: booking.id,
            amount: (session.amount_total ?? 0) / 100,
            currency: (session.currency ?? 'usd').toUpperCase(),
            method: 'CARD',
            status: 'COMPLETED',
            transactionId: session.payment_intent as string | undefined,
            notes: 'Stripe Checkout',
            gatewayResponse: session as object,
            processedAt: new Date(),
          },
        });

        if (booking.guest.email) {
          await sendBookingConfirmationEmail({
            to: booking.guest.email,
            guestName: booking.guest.name ?? 'Guest',
            tenantName: booking.tenant.name,
            confirmationNumber: booking.confirmationNumber,
            checkIn: booking.checkInDate,
            checkOut: booking.checkOutDate,
            roomName: booking.room.name || booking.room.number,
            totalAmount: booking.totalAmount,
            currency: booking.room.property.currency || 'USD',
            propertyPhone: booking.room.property.phone,
            propertyEmail: booking.room.property.email,
          }).catch(() => {});
        }
      }

      if (meta.type === 'subscription' && meta.tenantId) {
        const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
        await prisma.tenant.update({
          where: { id: meta.tenantId },
          data: {
            stripeSubscriptionId: subId ?? undefined,
            stripeCustomerId:
              typeof session.customer === 'string' ? session.customer : session.customer?.id,
            plan: meta.planTier ?? 'web',
          },
        });
      }
    }

    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.created') {
      const sub = event.data.object as Stripe.Subscription;
      const tenantId = sub.metadata?.tenantId;
      if (tenantId) {
        const priceId = sub.items.data[0]?.price?.id ?? '';
        await prisma.tenant.update({
          where: { id: tenantId },
          data: {
            stripeSubscriptionId: sub.id,
            plan: planFromStripePrice(priceId),
            status: sub.status === 'active' || sub.status === 'trialing' ? 'ACTIVE' : undefined,
          },
        });
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription;
      const tenantId = sub.metadata?.tenantId;
      if (tenantId) {
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { plan: 'basic', stripeSubscriptionId: null },
        });
      }
    }
  } catch (error) {
    console.error('Stripe webhook handler error:', error);
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
