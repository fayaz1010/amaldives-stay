import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const DEPARTURE_INCLUDE = {
  booking: {
    include: {
      guest: { select: { id: true, name: true, email: true } },
      room: { select: { id: true, number: true, name: true } },
    },
  },
  transportOption: { select: { id: true, name: true, contactName: true, contactPhone: true, schedule: true } },
  jettyTransportOption: { select: { id: true, name: true, contactName: true, contactPhone: true, capacity: true } },
} as const;

const SCALARS = [
  'transportType', 'transportRef', 'transportOptionId', 'transportCost', 'costPaid',
  'ticketsPurchased', 'seatNumbers',
  'jettyTransport', 'jettyTransportSeats', 'jettyTransportCapacity', 'jettyTransportOptionId',
  'luggageCount', 'specialNotes', 'status',
];

const DATE_FIELDS = [
  'scheduledDeparture', 'billSettledAt', 'luggageReadyAt',
  'leftPropertyAt', 'arrivedJettyAt', 'boardedAt',
];

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await request.json();
    const updates: any = {};

    for (const key of SCALARS) {
      if (data[key] !== undefined) updates[key] = data[key];
    }
    for (const field of DATE_FIELDS) {
      if (data[field] !== undefined) {
        updates[field] = data[field] === true ? new Date() : new Date(data[field]);
      }
    }

    // Auto-advance status
    if (updates.status === undefined) {
      if (updates.boardedAt) updates.status = 'DEPARTED';
      else if (updates.arrivedJettyAt) updates.status = 'AT_JETTY';
      else if (updates.leftPropertyAt || updates.luggageReadyAt) updates.status = 'PREPARING';
    }

    // If departing, mark booking as CHECKED_OUT
    if (updates.status === 'DEPARTED') {
      const rec = await prisma.departureRecord.findFirst({
        where: { id: params.id, tenantId: session.user.tenantId },
        select: { bookingId: true },
      });
      if (rec) {
        await prisma.booking.update({ where: { id: rec.bookingId }, data: { status: 'CHECKED_OUT' } });
      }
    }

    const record = await prisma.departureRecord.update({
      where: { id: params.id, tenantId: session.user.tenantId },
      data: updates,
      include: DEPARTURE_INCLUDE,
    });
    return NextResponse.json({ record });
  } catch (error) {
    console.error('Departures PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await prisma.departureRecord.delete({
      where: { id: params.id, tenantId: session.user.tenantId },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Departures DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
