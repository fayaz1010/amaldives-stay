import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { subdomain: string } }
) {
  try {
    const { subdomain } = params;
    const url = new URL(request.url);
    const checkInParam = url.searchParams.get('checkIn');
    const checkOutParam = url.searchParams.get('checkOut');
    const adultsParam = url.searchParams.get('adults');

    if (!subdomain) {
      return NextResponse.json({ error: 'Subdomain is required' }, { status: 400 });
    }

    if (!checkInParam || !checkOutParam) {
      return NextResponse.json(
        { error: 'checkIn and checkOut query params are required' },
        { status: 400 }
      );
    }

    const checkIn = new Date(checkInParam);
    const checkOut = new Date(checkOutParam);

    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    if (checkOut <= checkIn) {
      return NextResponse.json(
        { error: 'checkOut must be after checkIn' },
        { status: 400 }
      );
    }

    const adults = adultsParam ? parseInt(adultsParam, 10) : 1;
    const nights = Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
    );

    const tenant = await prisma.tenant.findUnique({
      where: { subdomain, status: 'ACTIVE' },
      select: { id: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Guesthouse not found' }, { status: 404 });
    }

    const rooms = await prisma.room.findMany({
      where: {
        tenantId: tenant.id,
        status: { in: ['AVAILABLE', 'OCCUPIED'] },
        capacity: { gte: adults },
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            city: true,
            country: true,
          },
        },
        bookings: {
          where: {
            status: { in: ['CONFIRMED', 'CHECKED_IN'] },
            AND: [
              { checkInDate: { lt: checkOut } },
              { checkOutDate: { gt: checkIn } },
            ],
          },
          select: { id: true },
        },
      },
    });

    // External (iCal) blocks for the same window. If any feed covers a
    // room — directly or tenant-wide — exclude that room from the
    // availability response so a guest can't double-book a date that's
    // already taken on Booking.com or Airbnb.
    const externalBlocks = await prisma.externalCalendarBlock.findMany({
      where: {
        tenantId: tenant.id,
        startDate: { lt: checkOut },
        endDate: { gt: checkIn },
      },
      select: { roomId: true },
    });
    const blockedRoomIds = new Set<string>();
    const tenantWideBlock = externalBlocks.some((b) => !b.roomId);
    for (const b of externalBlocks) if (b.roomId) blockedRoomIds.add(b.roomId);

    const availableRooms = rooms
      .filter((room) => room.bookings.length === 0)
      .filter((room) => !tenantWideBlock && !blockedRoomIds.has(room.id))
      .map((room) => ({
        id: room.id,
        number: room.number,
        type: room.type,
        capacity: room.capacity,
        basePrice: room.basePrice,
        description: room.description,
        amenities: room.amenities,
        images: room.images,
        property: room.property,
        nights,
        totalPrice: room.basePrice * nights,
      }));

    return NextResponse.json({ rooms: availableRooms, nights });
  } catch (error) {
    console.error('Public rooms API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
