import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const data = await request.json();

    const existing = await prisma.payment.findFirst({
      where: { id: params.id, tenantId: session.user.tenantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    const updates: any = {};
    if (data.status !== undefined) updates.status = data.status;
    if (data.notes !== undefined) updates.notes = data.notes;
    if (data.transactionId !== undefined) updates.transactionId = data.transactionId;

    const payment = await prisma.payment.update({
      where: { id: params.id },
      data: updates,
    });

    // If refunding, reduce paidAmount on booking
    if (data.status === 'REFUNDED' && existing.status === 'COMPLETED') {
      await prisma.booking.update({
        where: { id: existing.bookingId },
        data: { paidAmount: { decrement: existing.amount } },
      });
    }

    return NextResponse.json({ payment });
  } catch (error) {
    console.error('Payments PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
