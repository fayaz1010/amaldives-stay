import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getActivePropertyId } from '@/lib/active-property';

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

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const activePropertyId = await getActivePropertyId(session.user.tenantId);
    const records = await prisma.departureRecord.findMany({
      where: {
        tenantId: session.user.tenantId,
        ...(activePropertyId ? { propertyId: activePropertyId } : {}),
      },
      include: DEPARTURE_INCLUDE,
      orderBy: { scheduledDeparture: 'asc' },
    });
    return NextResponse.json({ records });
  } catch (error) {
    console.error('Departures GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const data = await request.json();
    if (!data.bookingId) return NextResponse.json({ error: 'bookingId is required' }, { status: 400 });

    const booking = await prisma.booking.findFirst({
      where: { id: data.bookingId, tenantId: session.user.tenantId },
    });
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

    const record = await prisma.departureRecord.create({
      data: {
        tenantId: session.user.tenantId,
        propertyId: booking.propertyId,
        bookingId: data.bookingId,
        transportType: data.transportType ?? 'SPEEDBOAT',
        transportRef: data.transportRef ?? null,
        transportOptionId: data.transportOptionId ?? null,
        transportCost: data.transportCost != null ? Number(data.transportCost) : null,
        costPaid: data.costPaid ?? false,
        ticketsPurchased: data.ticketsPurchased ?? false,
        seatNumbers: data.seatNumbers ?? null,
        jettyTransport: data.jettyTransport ?? null,
        jettyTransportSeats: data.jettyTransportSeats != null ? Number(data.jettyTransportSeats) : null,
        jettyTransportCapacity: data.jettyTransportCapacity != null ? Number(data.jettyTransportCapacity) : null,
        jettyTransportOptionId: data.jettyTransportOptionId ?? null,
        scheduledDeparture: data.scheduledDeparture ? new Date(data.scheduledDeparture) : null,
        luggageCount: data.luggageCount != null ? Number(data.luggageCount) : null,
        specialNotes: data.specialNotes ?? null,
        status: 'SCHEDULED',
      },
      include: DEPARTURE_INCLUDE,
    });
    return NextResponse.json({ record }, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'A departure plan already exists for this booking.' }, { status: 409 });
    }
    console.error('Departures POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
