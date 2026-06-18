import { prisma } from '@/lib/db';
import { getStripe } from '@/lib/stripe';
import type { DepositConfig } from '@/lib/tenant-settings';

export function calculateDepositAmount(
  totalAmount: number,
  config: DepositConfig | null | undefined,
): number {
  if (!config?.enabled || totalAmount <= 0) return 0;
  const pct = config.percent ?? 0;
  if (pct <= 0) return 0;
  const fromPct = totalAmount * (pct / 100);
  const min = config.minAmount ?? 0;
  return Math.min(totalAmount, Math.max(fromPct, min));
}

/**
 * Issue a Stripe refund for a card payment recorded with a PaymentIntent id.
 */
export async function refundStripePayment(payment: {
  id: string;
  amount: number;
  transactionId: string | null;
  tenantId: string;
}): Promise<{ refunded: boolean; stripeRefundId?: string; reason?: string }> {
  const stripe = getStripe();
  if (!stripe || !payment.transactionId) {
    return { refunded: false, reason: 'no_stripe_or_transaction' };
  }

  try {
    const refund = await stripe.refunds.create({
      payment_intent: payment.transactionId,
      amount: Math.round(payment.amount * 100),
      metadata: { paymentId: payment.id, tenantId: payment.tenantId },
    });
    return { refunded: true, stripeRefundId: refund.id };
  } catch (err) {
    console.error('[stripe] refund failed', err);
    return { refunded: false, reason: 'stripe_error' };
  }
}

export async function markPaymentRefunded(paymentId: string, tenantId: string) {
  const existing = await prisma.payment.findFirst({
    where: { id: paymentId, tenantId },
  });
  if (!existing) throw new Error('Payment not found');
  if (existing.status === 'REFUNDED') return existing;

  let stripeRefundId: string | undefined;
  if (existing.method === 'CARD' && existing.status === 'COMPLETED') {
    const result = await refundStripePayment({
      id: existing.id,
      amount: existing.amount,
      transactionId: existing.transactionId,
      tenantId,
    });
    if (result.refunded) stripeRefundId = result.stripeRefundId;
    else if (existing.transactionId?.startsWith('pi_')) {
      throw new Error('Stripe refund failed — check logs');
    }
  }

  const payment = await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: 'REFUNDED',
      notes: stripeRefundId ? `Stripe refund ${stripeRefundId}` : existing.notes,
      gatewayResponse: stripeRefundId
        ? { ...(existing.gatewayResponse as object), stripeRefundId }
        : existing.gatewayResponse,
    },
  });

  if (existing.status === 'COMPLETED') {
    await prisma.booking.update({
      where: { id: existing.bookingId },
      data: { paidAmount: { decrement: existing.amount } },
    });
  }

  return payment;
}
