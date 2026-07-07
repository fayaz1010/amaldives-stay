import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * BML Connect (Internet Payment Gateway) webhook receiver.
 *
 * BML Connect sends an HTTP POST to this URL after a successful card payment
 * on their IPG. Configure the webhook URL in your BML Connect merchant portal:
 *   https://<subdomain>.vayves.com/api/webhooks/bml-connect
 *
 * BML Connect webhook payload (standard fields):
 * {
 *   localId:     string;  // your order/booking reference
 *   receiptNo:   string;  // BML transaction receipt number
 *   amount:      string;  // payment amount
 *   currency:    string;  // "USD" | "MVR"
 *   status:      string;  // "SUCCESS" | "FAILED"
 *   cardType:    string;  // "VISA" | "MASTERCARD" etc.
 *   maskedPAN:   string;  // masked card number
 *   signature:   string;  // HMAC signature (if configured)
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { subdomain: string } }
) {
  try {
    const subdomain = params.subdomain;
    const body = await request.json().catch(() => ({}));

    const tenant = await prisma.tenant.findUnique({
      where: { subdomain },
      select: { id: true, settings: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Only process successful payments
    const status = (body.status ?? body.Status ?? '').toUpperCase();
    if (status === 'FAILED' || status === 'CANCELLED') {
      return NextResponse.json({ received: true, action: 'ignored', reason: status });
    }

    // localId should be the booking confirmationNumber
    const bookingRef = body.localId ?? body.orderId ?? body.merchantRef ?? null;
    if (!bookingRef) {
      return NextResponse.json({ error: 'No booking reference in payload' }, { status: 400 });
    }

    const amount = parseFloat(body.amount ?? body.Amount ?? '0');
    if (!amount || isNaN(amount)) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const booking = await prisma.booking.findFirst({
      where: { tenantId: tenant.id, confirmationNumber: bookingRef },
      select: { id: true, paidAmount: true },
    });

    if (!booking) {
      return NextResponse.json({ error: `Booking ${bookingRef} not found` }, { status: 404 });
    }

    const payment = await prisma.payment.create({
      data: {
        tenantId: tenant.id,
        bookingId: booking.id,
        amount,
        currency: (body.currency ?? body.Currency ?? 'USD').toUpperCase(),
        method: 'CARD',
        status: 'COMPLETED',
        transactionId: body.receiptNo ?? body.transactionId ?? null,
        notes: `BML Connect · ${body.cardType ?? 'Card'} ${body.maskedPAN ? `ending ${body.maskedPAN.slice(-4)}` : ''}`.trim(),
        gatewayResponse: body,
        processedAt: new Date(),
      },
    });

    await prisma.booking.update({
      where: { id: booking.id },
      data: { paidAmount: { increment: amount } },
    });

    return NextResponse.json({ success: true, paymentId: payment.id });
  } catch (error) {
    console.error('BML Connect webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// BML Connect may send GET to verify the endpoint
export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'Vayves / BML Connect webhook' });
}
