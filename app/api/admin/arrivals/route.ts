import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const ARRIVAL_INCLUDE = {
  booking: {
    include: {
      guest: { select: { id: true, name: true, email: true } },
      room: { select: { id: true, number: true, name: true } },
    },
  },
  pickupStaff: { select: { id: true, name: true } },
} as const;

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const arrivals = await prisma.arrivalRecord.findMany({
      where: { tenantId: session.user.tenantId },
      include: ARRIVAL_INCLUDE,
      orderBy: { scheduledArrival: 'asc' },
    });
    return NextResponse.json({ arrivals });
  } catch (error) {
    console.error('Arrivals GET error:', error);
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
    if (!data.bookingId) {
      return NextResponse.json({ error: 'bookingId is required' }, { status: 400 });
    }

    // Verify booking belongs to tenant
    const booking = await prisma.booking.findFirst({
      where: { id: data.bookingId, tenantId: session.user.tenantId },
    });
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const arrival = await prisma.arrivalRecord.create({
      data: {
        tenantId: session.user.tenantId,
        bookingId: data.bookingId,
        transportType: data.transportType ?? 'SPEEDBOAT',
        transportRef: data.transportRef ?? null,
        transportCost: data.transportCost != null ? Number(data.transportCost) : null,
        costPaid: data.costPaid ?? false,
        pickupBy: data.pickupBy ?? 'STAFF',
        pickupStaffId: data.pickupStaffId ?? null,
        pickupVendor: data.pickupVendor ?? null,
        scheduledArrival: data.scheduledArrival ? new Date(data.scheduledArrival) : null,
        luggageCount: data.luggageCount != null ? Number(data.luggageCount) : null,
        jettyTransport: data.jettyTransport ?? null,
        jettyTransportSeats: data.jettyTransportSeats != null ? Number(data.jettyTransportSeats) : null,
        jettyTransportCapacity: data.jettyTransportCapacity != null ? Number(data.jettyTransportCapacity) : null,
        specialNotes: data.specialNotes ?? null,
        ticketsPurchased: data.ticketsPurchased ?? false,
        seatNumbers: data.seatNumbers ?? null,
        airportPickupConfirmed: data.airportPickupConfirmed ?? false,
        status: 'SCHEDULED',
      },
      include: ARRIVAL_INCLUDE,
    });

    return NextResponse.json({ arrival }, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'An arrival record already exists for this booking.' },
        { status: 409 }
      );
    }
    console.error('Arrivals POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
