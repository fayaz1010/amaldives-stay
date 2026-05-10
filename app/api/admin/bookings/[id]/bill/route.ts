import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const booking = await prisma.booking.findFirst({
      where: { id: params.id, tenantId: session.user.tenantId },
      include: {
        guest: { select: { id: true, name: true, email: true } },
        room: {
          select: {
            id: true, number: true, name: true, type: true, basePrice: true,
            property: {
              select: {
                id: true, name: true, address: true, city: true, country: true,
                phone: true, email: true, website: true, currency: true,
              },
            },
          },
        },
        serviceOrders: {
          where: { status: { not: 'CANCELLED' } },
          include: { service: { select: { name: true, category: true } } },
          orderBy: { createdAt: 'asc' },
        },
        // Mini bar usages — all non-waived charges
        minIBarUsages: {
          where: { status: { not: 'WAIVED' } },
          include: { item: { select: { name: true, category: true, isFree: true } } },
          orderBy: { recordedAt: 'asc' },
        },
        payments: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // F&B bills linked to this booking (not voided)
    const fnbBills = await prisma.fnBBill.findMany({
      where: {
        tenantId: session.user.tenantId,
        bookingId: params.id,
        status: { not: 'VOIDED' },
      },
      include: { outlet: { select: { name: true, outletType: true } } },
      orderBy: { createdAt: 'asc' },
    });

    // Extra service orders for the room (room-linked without a booking)
    const roomExtraOrders = await prisma.serviceOrder.findMany({
      where: {
        tenantId: session.user.tenantId,
        roomId: booking.roomId,
        bookingId: null,
        status: { not: 'CANCELLED' },
      },
      include: { service: { select: { name: true, category: true } } },
      orderBy: { createdAt: 'asc' },
    });

    const serialize = (obj: any) => JSON.parse(JSON.stringify(obj));

    return NextResponse.json({
      booking: serialize(booking),
      fnbBills: serialize(fnbBills),
      roomExtraOrders: serialize(roomExtraOrders),
    });
  } catch (error) {
    console.error('Bill GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
