import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const bookingId = new URL(request.url).searchParams.get('bookingId');
    const payments = await prisma.payment.findMany({
      where: {
        tenantId: session.user.tenantId,
        ...(bookingId ? { bookingId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ payments });
  } catch (error) {
    console.error('Payments GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const data = await request.json();
    if (!data.bookingId || !data.amount || !data.method) {
      return NextResponse.json(
        { error: 'bookingId, amount and method are required' },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.findFirst({
      where: { id: data.bookingId, tenantId: session.user.tenantId },
      select: { id: true, totalAmount: true, paidAmount: true, currency: true },
    });
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const amount = Number(data.amount);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 });
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        tenantId: session.user.tenantId,
        bookingId: data.bookingId,
        amount,
        currency: data.currency ?? booking.currency ?? 'USD',
        method: data.method,
        status: 'COMPLETED',
        transactionId: data.transactionId ?? null,
        notes: data.notes ?? null,
        gatewayResponse: data.gatewayResponse ?? null,
        processedAt: new Date(),
      },
    });

    // Update booking paidAmount
    const newPaid = booking.paidAmount + amount;
    await prisma.booking.update({
      where: { id: booking.id },
      data: { paidAmount: newPaid },
    });

    return NextResponse.json({ payment, newPaidAmount: newPaid }, { status: 201 });
  } catch (error) {
    console.error('Payments POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
