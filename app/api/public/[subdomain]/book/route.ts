import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { createPublicBooking } from '@/lib/public-booking';
import { getStripe, isStripeConfigured } from '@/lib/stripe';
import { getPaymentsConfig, getDepositConfig } from '@/lib/tenant-settings';
import { tenantUrl } from '@/lib/domain';
import { calculateDepositAmount } from '@/lib/stripe-booking';
import { sendBookingConfirmationEmail } from '@/lib/send-booking-confirmation';

export const dynamic = 'force-dynamic';

const isoDate = z
  .string()
  .min(1)
  .refine((v) => !Number.isNaN(new Date(v).getTime()), 'Invalid date');

const PublicBookingSchema = z
  .object({
    roomId: z.string().min(1),
    checkIn: isoDate,
    checkOut: isoDate,
    adults: z.number().int().positive().max(20).optional(),
    children: z.number().int().nonnegative().max(20).optional(),
    guestName: z.string().trim().min(1).max(200),
    guestEmail: z.string().trim().email(),
    guestPhone: z.string().trim().max(40).optional(),
    specialRequests: z.string().max(2000).optional(),
    source: z.string().max(60).optional().default('direct'),
    promotionCode: z.string().trim().max(40).optional(),
    paymentMethod: z.enum(['stripe', 'pay_at_property', 'maya', 'bml_connect']).optional().default('stripe'),
    addonItems: z
      .array(
        z.object({
          serviceId: z.string().min(1),
          quantity: z.number().int().positive().max(20),
        }),
      )
      .optional()
      .default([]),
  })
  .refine((v) => new Date(v.checkOut) > new Date(v.checkIn), {
    message: 'checkOut must be after checkIn',
    path: ['checkOut'],
  });

export async function POST(
  request: NextRequest,
  { params }: { params: { subdomain: string } }
) {
  try {
    const { subdomain } = params;
    const rawBody = await request.json().catch(() => null);
    const parsed = PublicBookingSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
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
      source,
      paymentMethod,
    } = parsed.data;

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
      source,
      promotionCode: parsed.data.promotionCode,
      status: payAtProperty ? 'CONFIRMED' : 'PENDING',
      addonItems: parsed.data.addonItems,
    });

    const { booking, guest, room, nights, tenant, currency, addonLines, addonsTotal } = result;
    const roomTotal = booking.totalAmount;
    const bookingGrandTotal = roomTotal + addonsTotal;
    const payments = getPaymentsConfig(tenant.settings);
    const depositConfig = getDepositConfig(tenant.settings);
    const depositAmount = calculateDepositAmount(bookingGrandTotal, depositConfig);
    const stripeChargeAmount =
      depositAmount > 0 && depositAmount < bookingGrandTotal
        ? depositAmount
        : bookingGrandTotal;
    const isDepositCharge = stripeChargeAmount < bookingGrandTotal;

    if (payAtProperty) {
      await sendBookingConfirmationEmail({
        to: guestEmail,
        guestName,
        tenantName: tenant.name,
        confirmationNumber: booking.confirmationNumber,
        checkIn: booking.checkInDate,
        checkOut: booking.checkOutDate,
        roomName: room.name || room.number,
        totalAmount: bookingGrandTotal,
        currency,
      }).catch(() => {});

      return NextResponse.json(
        {
          booking: {
            confirmationNumber: booking.confirmationNumber,
            checkIn: booking.checkInDate,
            checkOut: booking.checkOutDate,
            nights,
            roomTotal,
            addonsTotal,
            totalAmount: bookingGrandTotal,
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
          totalAmount: bookingGrandTotal,
        },
        { status: 201 }
      );
    }

    if (useMaya && payments.maya?.merchantId) {
      const mayaUrl = `https://pay.maya.ph/checkout?merchantId=${encodeURIComponent(payments.maya.merchantId)}&reference=${encodeURIComponent(booking.confirmationNumber)}&amount=${bookingGrandTotal}&currency=${currency}`;
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

      const origin = request.headers.get('origin') ?? tenantUrl(subdomain);

      const stripeLineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
        {
          quantity: 1,
          price_data: {
            currency: currency.toLowerCase(),
            unit_amount: Math.round(roomTotal * 100),
            product_data: {
              name: `${tenant.name} — ${room.name || room.number}`,
              description: `${nights} night(s) · ${checkIn} to ${checkOut}`,
            },
          },
        },
        ...addonLines.map((line) => ({
          quantity: 1,
          price_data: {
            currency: currency.toLowerCase(),
            unit_amount: Math.round(line.totalAmount * 100),
            product_data: {
              name: line.name,
              description:
                line.unit === 'per night'
                  ? `${line.quantity} × ${nights} night(s)`
                  : line.unit === 'per hour'
                    ? `${line.quantity} hour(s)`
                    : `Qty ${line.quantity}`,
            },
          },
        })),
      ];

      // Deposit: single line item when charging less than full total
      const lineItems =
        isDepositCharge
          ? [
              {
                quantity: 1,
                price_data: {
                  currency: currency.toLowerCase(),
                  unit_amount: Math.round(stripeChargeAmount * 100),
                  product_data: {
                    name: `${tenant.name} — booking deposit`,
                    description: `Deposit (${depositConfig.percent ?? 0}%) · balance due before arrival`,
                  },
                },
              },
            ]
          : stripeLineItems;

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: guestEmail,
        line_items: lineItems,
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
