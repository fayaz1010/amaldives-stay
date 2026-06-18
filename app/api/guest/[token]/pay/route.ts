import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getStripe } from '@/lib/stripe';
import { getCheckInOutConfig } from '@/lib/checkin-out-config';
import { getPaymentsConfig, staySubdomainUrl } from '@/lib/tenant-settings';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } },
) {
  const booking = await prisma.booking.findUnique({
    where: { guestToken: params.token },
    include: {
      guest: true,
      room: { include: { property: true } },
      tenant: { select: { id: true, subdomain: true, name: true, settings: true } },
      serviceOrders: { where: { status: { not: 'CANCELLED' } } },
    },
  });

  if (!booking) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const checkInOut = getCheckInOutConfig(booking.tenant.settings);
  if (!checkInOut.allowInAppCheckoutPay) {
    return NextResponse.json({ error: 'In-app checkout payment is disabled' }, { status: 403 });
  }

  const serviceTotal = booking.serviceOrders.reduce((s, o) => s + o.totalAmount, 0);
  const grandTotal = booking.totalAmount + serviceTotal + booking.platformFee;
  const balance = grandTotal - booking.paidAmount;
  if (balance <= 0.01) {
    return NextResponse.json({ error: 'No balance due' }, { status: 400 });
  }

  const payments = getPaymentsConfig(booking.tenant.settings);
  if (!payments.enabledProviders.includes('stripe')) {
    return NextResponse.json({ error: 'Card payment not enabled for this property' }, { status: 503 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: 'Card payments not configured' }, { status: 503 });
  }

  const currency = (booking.room?.property?.currency ?? payments.currency ?? 'USD').toLowerCase();
  const origin = request.headers.get('origin') ?? staySubdomainUrl(booking.tenant.subdomain);

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: booking.guest.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency,
          unit_amount: Math.round(balance * 100),
          product_data: {
            name: `${booking.tenant.name} — balance`,
            description: `Checkout · ${booking.confirmationNumber}`,
          },
        },
      },
    ],
    metadata: {
      type: 'balance',
      bookingId: booking.id,
      tenantId: booking.tenant.id,
      subdomain: booking.tenant.subdomain,
    },
    success_url: `${origin}/guest/${params.token}?paid=1`,
    cancel_url: `${origin}/guest/${params.token}?cancelled=1`,
  });

  return NextResponse.json({ checkoutUrl: session.url });
}
