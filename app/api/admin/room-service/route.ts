import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** Ensure a default "Room Service" service exists for the tenant, return its id. */
async function ensureDefaultService(tenantId: string): Promise<string> {
  const existing = await prisma.service.findFirst({
    where: { tenantId, name: 'Room Service Request' },
    select: { id: true },
  });
  if (existing) return existing.id;
  const created = await prisma.service.create({
    data: {
      tenantId,
      name: 'Room Service Request',
      description: 'General room service order raised by staff',
      category: 'room_service',
      price: 0,
      isActive: true,
      images: [],
    },
  });
  return created.id;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const orders = await prisma.serviceOrder.findMany({
      where: { tenantId: session.user.tenantId },
      include: {
        service: { select: { name: true, category: true } },
        booking: {
          select: {
            id: true,
            room: { select: { number: true } },
          },
        },
        guest: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Room service GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const serviceId = await ensureDefaultService(session.user.tenantId);

    // Find active booking for the room to link bookingId if available
    let bookingId: string | undefined;
    if (data.roomId) {
      const activeBooking = await prisma.booking.findFirst({
        where: {
          tenantId: session.user.tenantId,
          roomId: data.roomId,
          status: { in: ['CONFIRMED', 'CHECKED_IN'] },
        },
        select: { id: true },
        orderBy: { checkInDate: 'desc' },
      });
      bookingId = activeBooking?.id;
    }

    const order = await prisma.serviceOrder.create({
      data: {
        tenantId: session.user.tenantId,
        serviceId,
        // Use the session user (staff) as guest since this is a staff-raised order
        guestId: session.user.id,
        bookingId: bookingId ?? null,
        quantity: data.quantity ?? 1,
        totalAmount: 0,
        status: 'PENDING',
        scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
        notes: data.notes ?? null,
      },
      include: {
        service: { select: { name: true, category: true } },
        booking: {
          select: {
            id: true,
            room: { select: { number: true } },
          },
        },
        guest: { select: { name: true } },
      },
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    console.error('Room service POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
