import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * FPOS Webhook — receives payment confirmations from connected POS terminals.
 *
 * Authentication: Bearer token in Authorization header matching
 * tenant.settings.fpos.webhookSecret (set in Admin → Settings → FPOS).
 *
 * Expected payload (flexible — we accept multiple POS formats):
 * {
 *   subdomain: string;          // tenant identifier
 *   bookingRef: string;         // booking confirmationNumber
 *   amount: number;
 *   currency?: string;
 *   method?: string;            // "CASH" | "CARD" | "DIGITAL_WALLET" etc.
 *   transactionId?: string;     // POS terminal transaction ref
 *   notes?: string;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Identify tenant — by subdomain in payload or X-Tenant header
    const subdomain =
      body.subdomain ??
      request.headers.get('x-tenant-subdomain') ??
      null;

    if (!subdomain) {
      return NextResponse.json(
        { error: 'subdomain is required to identify tenant' },
        { status: 400 }
      );
    }

    const tenant = await prisma.tenant.findUnique({
      where: { subdomain },
      select: { id: true, settings: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Authenticate using webhook secret stored in tenant settings
    const settings = (tenant.settings as any) ?? {};
    const webhookSecret = settings?.fpos?.webhookSecret ?? null;

    if (webhookSecret) {
      const authHeader = request.headers.get('authorization') ?? '';
      const provided = authHeader.replace(/^Bearer\s+/i, '').trim();
      if (provided !== webhookSecret) {
        return NextResponse.json({ error: 'Invalid webhook secret' }, { status: 401 });
      }
    }

    // Find the booking by confirmation number
    const { bookingRef, amount, currency, method, transactionId, notes } = body;
    if (!bookingRef || !amount) {
      return NextResponse.json(
        { error: 'bookingRef and amount are required' },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.findFirst({
      where: { tenantId: tenant.id, confirmationNumber: bookingRef },
      select: { id: true, paidAmount: true },
    });

    if (!booking) {
      return NextResponse.json({ error: `Booking ${bookingRef} not found` }, { status: 404 });
    }

    const numAmount = Number(amount);

    // Record the payment
    const payment = await prisma.payment.create({
      data: {
        tenantId: tenant.id,
        bookingId: booking.id,
        amount: numAmount,
        currency: currency ?? 'USD',
        method: normaliseMethod(method),
        status: 'COMPLETED',
        transactionId: transactionId ?? null,
        notes: notes ? String(notes) : 'Via FPOS webhook',
        gatewayResponse: body,
        processedAt: new Date(),
      },
    });

    // Update paidAmount
    await prisma.booking.update({
      where: { id: booking.id },
      data: { paidAmount: { increment: numAmount } },
    });

    return NextResponse.json({ success: true, paymentId: payment.id });
  } catch (error) {
    console.error('FPOS webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function normaliseMethod(m?: string): any {
  const map: Record<string, string> = {
    cash: 'CASH',
    card: 'CARD',
    credit: 'CARD',
    debit: 'CARD',
    bank: 'BANK_TRANSFER',
    transfer: 'BANK_TRANSFER',
    wallet: 'DIGITAL_WALLET',
    digital: 'DIGITAL_WALLET',
    crypto: 'CRYPTO',
  };
  if (!m) return 'CARD';
  return map[m.toLowerCase()] ?? 'CARD';
}
