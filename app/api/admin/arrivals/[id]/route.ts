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
  transportOption: { select: { id: true, name: true, contactName: true, contactPhone: true, schedule: true } },
  jettyTransportOption: { select: { id: true, name: true, contactName: true, contactPhone: true, capacity: true } },
} as const;

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
    const updates: any = {};

    // Scalar fields
    const scalars = [
      'transportType', 'transportRef', 'transportCost', 'costPaid',
      'transportOptionId', 'jettyTransportOptionId',
      'pickupBy', 'pickupStaffId', 'pickupVendor',
      'luggageCount', 'jettyTransport', 'jettyTransportSeats', 'jettyTransportCapacity',
      'specialNotes', 'cardIssued', 'welcomeDrink', 'status',
      'ticketsPurchased', 'seatNumbers', 'airportPickupConfirmed',
    ];
    for (const key of scalars) {
      if (data[key] !== undefined) updates[key] = data[key];
    }

    // DateTime fields — set now if value is literal true, otherwise use provided value
    const dateFields = [
      'scheduledArrival', 'departedAt', 'eta',
      'arrivedJettyAt', 'arrivedPropertyAt', 'checkedInAt',
    ];
    for (const field of dateFields) {
      if (data[field] !== undefined) {
        updates[field] = data[field] === true ? new Date() : new Date(data[field]);
      }
    }

    // Auto-advance status based on milestone if status not explicitly set
    if (updates.status === undefined) {
      if (updates.checkedInAt) updates.status = 'CHECKED_IN';
      else if (updates.arrivedPropertyAt) updates.status = 'AT_PROPERTY';
      else if (updates.arrivedJettyAt) updates.status = 'AT_JETTY';
      else if (updates.departedAt) updates.status = 'IN_TRANSIT';
    }

    // If checking in, also update booking status
    if (updates.status === 'CHECKED_IN') {
      const arrival = await prisma.arrivalRecord.findFirst({
        where: { id: params.id, tenantId: session.user.tenantId },
        select: { bookingId: true },
      });
      if (arrival) {
        await prisma.booking.update({
          where: { id: arrival.bookingId },
          data: { status: 'CHECKED_IN' },
        });
      }
    }

    const arrival = await prisma.arrivalRecord.update({
      where: { id: params.id, tenantId: session.user.tenantId },
      data: updates,
      include: ARRIVAL_INCLUDE,
    });

    return NextResponse.json({ arrival });
  } catch (error) {
    console.error('Arrivals PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await prisma.arrivalRecord.delete({
      where: { id: params.id, tenantId: session.user.tenantId },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Arrivals DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
