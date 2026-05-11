import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface OrderItem {
  serviceId: string;
  quantity: number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const booking = await prisma.booking.findUnique({
      where: { guestToken: params.token },
      select: {
        id: true,
        tenantId: true,
        roomId: true,
        guestId: true,
        status: true,
      },
    });
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }
    if (booking.status !== 'CHECKED_IN') {
      return NextResponse.json(
        { error: 'Orders are only available while you are checked in.' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const items: OrderItem[] = Array.isArray(body.items) ? body.items : [];
    const notes: string | undefined = typeof body.notes === 'string' ? body.notes : undefined;

    const validItems = items
      .map((i) => ({ serviceId: String(i.serviceId || ''), quantity: Math.max(1, Number(i.quantity) || 1) }))
      .filter((i) => i.serviceId);

    if (validItems.length === 0) {
      return NextResponse.json({ error: 'No items in order' }, { status: 400 });
    }

    const services = await prisma.service.findMany({
      where: {
        tenantId: booking.tenantId,
        isActive: true,
        id: { in: validItems.map((i) => i.serviceId) },
      },
      select: { id: true, price: true },
    });

    const priceById = new Map(services.map((s) => [s.id, s.price]));
    const missing = validItems.filter((i) => !priceById.has(i.serviceId));
    if (missing.length > 0) {
      return NextResponse.json({ error: 'One or more services unavailable' }, { status: 400 });
    }

    const orders = await Promise.all(
      validItems.map((item) =>
        prisma.serviceOrder.create({
          data: {
            tenantId: booking.tenantId,
            bookingId: booking.id,
            roomId: booking.roomId,
            guestId: booking.guestId,
            serviceId: item.serviceId,
            quantity: item.quantity,
            totalAmount: (priceById.get(item.serviceId) || 0) * item.quantity,
            status: 'PENDING',
            scheduledDate: new Date(),
            notes: notes || null,
          },
        })
      )
    );

    return NextResponse.json({ success: true, orders });
  } catch (error: any) {
    console.error('Guest portal order error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
