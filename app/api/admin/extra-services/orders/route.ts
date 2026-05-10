import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const EXTRA_CATEGORIES = [
  'EXCURSION',
  'DIVING',
  'SNORKELLING',
  'PICNIC',
  'FISHING',
  'RENTAL',
];

const VALID_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
];

const ORDER_INCLUDE = {
  service: {
    select: { id: true, name: true, category: true, price: true, duration: true },
  },
  room: { select: { id: true, number: true, type: true } },
  booking: {
    select: {
      id: true,
      confirmationNumber: true,
      checkInDate: true,
      checkOutDate: true,
      room: { select: { id: true, number: true } },
      guest: {
        select: {
          id: true,
          name: true,
          guestProfile: { select: { firstName: true, lastName: true } },
        },
      },
    },
  },
  guest: {
    select: {
      id: true,
      name: true,
      email: true,
      guestProfile: { select: { firstName: true, lastName: true } },
    },
  },
} as const;

function serializeOrder(order: any) {
  return {
    ...order,
    scheduledDate: order.scheduledDate ? order.scheduledDate.toISOString() : null,
    completedAt: order.completedAt ? order.completedAt.toISOString() : null,
    rentalDueAt: order.rentalDueAt ? order.rentalDueAt.toISOString() : null,
    rentalReturnedAt: order.rentalReturnedAt
      ? order.rentalReturnedAt.toISOString()
      : null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    booking: order.booking
      ? {
          ...order.booking,
          checkInDate: order.booking.checkInDate
            ? order.booking.checkInDate.toISOString()
            : null,
          checkOutDate: order.booking.checkOutDate
            ? order.booking.checkOutDate.toISOString()
            : null,
        }
      : null,
  };
}

async function getOrCreateWalkInGuest(tenantId: string): Promise<string> {
  const existing = await prisma.user.findFirst({
    where: { tenantId, email: 'walkin@stay.local' },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await prisma.user.create({
    data: {
      tenantId,
      email: 'walkin@stay.local',
      name: 'Walk-In Guest',
      role: 'GUEST',
      isActive: true,
    },
    select: { id: true },
  });
  return created.id;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const roomId = searchParams.get('roomId');

    const where: any = {
      tenantId: session.user.tenantId,
      service: { category: { in: EXTRA_CATEGORIES } },
    };

    if (status && VALID_STATUSES.includes(status)) {
      where.status = status;
    }
    if (roomId) {
      where.OR = [
        { roomId },
        { booking: { roomId } },
      ];
    }

    const orders = await prisma.serviceOrder.findMany({
      where,
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(orders.map(serializeOrder));
  } catch (error) {
    console.error('Extra service orders GET error:', error);
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
    const {
      serviceId,
      bookingId,
      quantity,
      scheduledDate,
      notes,
      isRental,
      rentalItem,
      rentalDueAt,
      roomId,
    } = data;

    if (!serviceId) {
      return NextResponse.json({ error: 'serviceId is required' }, { status: 400 });
    }

    const service = await prisma.service.findFirst({
      where: {
        id: serviceId,
        tenantId: session.user.tenantId,
        category: { in: EXTRA_CATEGORIES },
      },
    });
    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    let guestId: string;
    let resolvedBookingId: string | null = null;
    let resolvedRoomId: string | null = roomId ?? null;

    if (bookingId) {
      const booking = await prisma.booking.findFirst({
        where: { id: bookingId, tenantId: session.user.tenantId },
        select: { id: true, guestId: true, roomId: true },
      });
      if (!booking) {
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
      }
      guestId = booking.guestId;
      resolvedBookingId = booking.id;
      if (!resolvedRoomId) resolvedRoomId = booking.roomId;
    } else {
      guestId = await getOrCreateWalkInGuest(session.user.tenantId);
    }

    if (resolvedRoomId) {
      const room = await prisma.room.findFirst({
        where: { id: resolvedRoomId, tenantId: session.user.tenantId },
        select: { id: true },
      });
      if (!room) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      }
    }

    const qty = Math.max(1, Number(quantity) || 1);
    const totalAmount = service.price * qty;

    const order = await prisma.serviceOrder.create({
      data: {
        tenantId: session.user.tenantId,
        serviceId: service.id,
        bookingId: resolvedBookingId,
        guestId,
        roomId: resolvedRoomId,
        quantity: qty,
        totalAmount,
        status: 'PENDING',
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        notes: notes ?? null,
        isRental: Boolean(isRental ?? service.category === 'RENTAL'),
        rentalItem: rentalItem ?? null,
        rentalDueAt: rentalDueAt ? new Date(rentalDueAt) : null,
      },
      include: ORDER_INCLUDE,
    });

    return NextResponse.json(serializeOrder(order), { status: 201 });
  } catch (error) {
    console.error('Extra service orders POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
