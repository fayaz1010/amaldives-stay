import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createPublicBooking } from '@/lib/public-booking';
import { getStripe, isStripeConfigured } from '@/lib/stripe';
import { getPaymentsConfig, staySubdomainUrl } from '@/lib/tenant-settings';
import { sendBookingConfirmationEmail } from '@/lib/send-booking-confirmation';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { subdomain: string } }
) {
  try {
    const { subdomain } = params;
    const body = await request.json();
    const {
      roomId,
      checkIn,
      checkOut,
      adults,
      children,
      guestName,
      guestEmail,
      guestPhone,
      specialRequests,
      source = 'direct',
      paymentMethod = 'stripe',
    } = body;

    if (!roomId || !checkIn || !checkOut || !guestName || !guestEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: roomId, checkIn, checkOut, guestName, guestEmail' },
        { status: 400 }
      );
    }

    const payAtProperty = paymentMethod === 'pay_at_property';
    const useStripe = paymentMethod === 'stripe' && isStripeConfigured();
    const useMaya = paymentMethod === 'maya';
    const useBml = paymentMethod === 'bml_connect';

    const result = await createPublicBooking({
      subdomain,
      roomId,
      checkIn,
      checkOut,
      adults,
      children,
      guestName,
      guestEmail,
      guestPhone,
      specialRequests,
      source: typeof source === 'string' ? source : 'direct',
      status: payAtProperty ? 'CONFIRMED' : 'PENDING',
    });

    const { booking, guest, room, nights, tenant, currency } = result;
    const payments = getPaymentsConfig(tenant.settings);

    if (payAtProperty) {
      await sendBookingConfirmationEmail({
        to: guestEmail,
        guestName,
        tenantName: tenant.name,
        confirmationNumber: booking.confirmationNumber,
        checkIn: booking.checkInDate,
        checkOut: booking.checkOutDate,
        roomName: room.name || room.number,
        totalAmount: booking.totalAmount,
        currency,
      }).catch(() => {});

      return NextResponse.json(
        {
          booking: {
            confirmationNumber: booking.confirmationNumber,
            checkIn: booking.checkInDate,
            checkOut: booking.checkOutDate,
            nights,
            totalAmount: booking.totalAmount,
            roomName: room.number,
            propertyName: room.property.name,
            guestName: guest.name,
            guestEmail: guest.email,
          },
        },
        { status: 201 }
      );
    }

    if (useBml && payments.bmlConnect?.merchantId) {
      return NextResponse.json(
        {
          booking: { confirmationNumber: booking.confirmationNumber },
          bmlNote:
            'Initiate BML Connect payment with localId = confirmation number, then webhook will confirm.',
          confirmationNumber: booking.confirmationNumber,
        },
        { status: 201 }
      );
    }

    if (useMaya && payments.maya?.merchantId) {
      const mayaUrl = `https://pay.maya.ph/checkout?merchantId=${encodeURIComponent(payments.maya.merchantId)}&reference=${encodeURIComponent(booking.confirmationNumber)}&amount=${booking.totalAmount}&currency=${currency}`;
      return NextResponse.json(
        {
          checkoutUrl: mayaUrl,
          booking: { confirmationNumber: booking.confirmationNumber },
        },
        { status: 201 }
      );
    }

    if (useStripe) {
      const stripe = getStripe();
      if (!stripe) {
        return NextResponse.json({ error: 'Card payments are not configured' }, { status: 503 });
      }

      const origin = request.headers.get('origin') ?? staySubdomainUrl(subdomain);

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: guestEmail,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: currency.toLowerCase(),
              unit_amount: Math.round(booking.totalAmount * 100),
              product_data: {
                name: `${tenant.name} — ${room.name || room.number}`,
                description: `${nights} night(s) · ${checkIn} to ${checkOut}`,
              },
            },
          },
        ],
        metadata: {
          bookingId: booking.id,
          tenantId: tenant.id,
          subdomain,
          type: 'booking',
        },
        success_url: `${origin}/book/success?ref=${booking.confirmationNumber}`,
        cancel_url: `${origin}/book?cancelled=1`,
      });

      await prisma.booking.update({
        where: { id: booking.id },
        data: { stripeCheckoutSessionId: session.id },
      });

      return NextResponse.json(
        {
          checkoutUrl: session.url,
          booking: { confirmationNumber: booking.confirmationNumber },
        },
        { status: 201 }
      );
    }

    return NextResponse.json({ error: 'Selected payment method is unavailable' }, { status: 400 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    const status =
      msg.includes('not found') ? 404 : msg.includes('available') ? 409 : msg.includes('Invalid') ? 400 : 500;
    console.error('Public booking API error:', error);
    return NextResponse.json({ error: msg }, { status });
  }
}
