import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getPaymentsConfig } from '@/lib/tenant-settings';

export const dynamic = 'force-dynamic';

/**
 * Maya Business webhook — per-tenant subdomain endpoint.
 * Configure in Maya portal:
 *   https://<subdomain>.vayves.com/api/webhooks/maya/<subdomain>
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

    const payments = getPaymentsConfig(tenant.settings);
    const secret = payments.maya?.webhookSecret;
    const incomingSecret = request.headers.get('x-maya-signature') ?? body.signature;
    if (secret && incomingSecret !== secret) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const status = String(body.status ?? body.paymentStatus ?? '').toUpperCase();
    if (status && !['SUCCESS', 'COMPLETED', 'PAID'].includes(status)) {
      return NextResponse.json({ received: true, action: 'ignored' });
    }

    const bookingRef =
      body.reference ?? body.merchantReference ?? body.requestReferenceNumber ?? null;
    if (!bookingRef) {
      return NextResponse.json({ error: 'No booking reference' }, { status: 400 });
    }

    const amount = parseFloat(body.amount ?? body.totalAmount ?? '0');
    const booking = await prisma.booking.findFirst({
      where: { tenantId: tenant.id, confirmationNumber: bookingRef },
    });
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    await prisma.payment.create({
      data: {
        tenantId: tenant.id,
        bookingId: booking.id,
        amount: amount || booking.totalAmount,
        currency: (body.currency ?? 'USD').toUpperCase(),
        method: 'DIGITAL_WALLET',
        status: 'COMPLETED',
        transactionId: body.transactionId ?? body.id ?? null,
        notes: 'Maya Business',
        gatewayResponse: body,
        processedAt: new Date(),
      },
    });

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: 'CONFIRMED',
        paidAmount: { increment: amount || booking.totalAmount },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Maya webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'Vayves / Maya webhook' });
}
