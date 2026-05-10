import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const VALID_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
] as const;

type ServiceOrderStatus = (typeof VALID_STATUSES)[number];

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existing = await prisma.serviceOrder.findFirst({
      where: { id: params.id, tenantId: session.user.tenantId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const data = await request.json();
    const updates: Record<string, unknown> = {};

    if (data.status !== undefined) {
      if (!VALID_STATUSES.includes(data.status)) {
        return NextResponse.json(
          { error: `status must be one of: ${VALID_STATUSES.join(', ')}` },
          { status: 400 }
        );
      }
      updates.status = data.status as ServiceOrderStatus;
      if (data.status === 'COMPLETED') {
        updates.completedAt = new Date();
      }
    }

    if (data.rentalReturnedAt !== undefined) {
      updates.rentalReturnedAt = data.rentalReturnedAt
        ? new Date(data.rentalReturnedAt)
        : null;
    }

    if (data.notes !== undefined) {
      updates.notes = data.notes;
    }

    const order = await prisma.serviceOrder.update({
      where: { id: params.id },
      data: updates,
      include: ORDER_INCLUDE,
    });

    return NextResponse.json(serializeOrder(order));
  } catch (error) {
    console.error('Extra service order PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
