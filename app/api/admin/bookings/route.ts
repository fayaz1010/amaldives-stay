import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { TenantDb, prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user || !session.user.tenantId) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 403 });
    }

    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const limit = url.searchParams.get('limit');

    const tenantDb = new TenantDb(session.user.tenantId);
    const filters: any = {};

    if (status) {
      filters.status = status;
    }

    if (limit) {
      filters.limit = parseInt(limit);
    }

    const bookings = await tenantDb.getBookings(filters);

    return NextResponse.json({ bookings });
  } catch (error) {
    console.error('Bookings API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateConfirmationNumber() {
  return 'STAY-' + Date.now().toString(36).toUpperCase();
}

function calcNights(checkIn: Date, checkOut: Date) {
  return Math.max(
    1,
    Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
    )
  );
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user || !session.user.tenantId) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 403 });
    }

    const allowedRoles = ['TENANT_ADMIN', 'MANAGER', 'FRONT_DESK'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const tenantId = session.user.tenantId;
    const data = await request.json();

    const {
      roomId,
      propertyId,
      checkInDate,
      checkOutDate,
      adults,
      children = 0,
      totalAmount,
      status = 'CONFIRMED',
      source = 'DIRECT',
      guestData,
      guestId: providedGuestId,
      specialRequests,
      notes,
      confirmationNumber: providedConfirmation,
    } = data || {};

    if (!roomId || !propertyId || !checkInDate || !checkOutDate || typeof adults !== 'number') {
      return NextResponse.json(
        { error: 'Missing required fields: roomId, propertyId, checkInDate, checkOutDate, adults' },
        { status: 400 }
      );
    }

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }
    if (checkOut <= checkIn) {
      return NextResponse.json(
        { error: 'checkOutDate must be after checkInDate' },
        { status: 400 }
      );
    }

    const room = await prisma.room.findFirst({
      where: { id: roomId, tenantId },
      select: { id: true, basePrice: true },
    });
    if (!room) {
      return NextResponse.json({ error: 'Room not found for this tenant' }, { status: 404 });
    }

    const property = await prisma.property.findFirst({
      where: { id: propertyId, tenantId },
      select: { id: true },
    });
    if (!property) {
      return NextResponse.json({ error: 'Property not found for this tenant' }, { status: 404 });
    }

    const nights = calcNights(checkIn, checkOut);
    const computedTotal =
      typeof totalAmount === 'number' && totalAmount >= 0
        ? totalAmount
        : room.basePrice * nights;

    let guestId = providedGuestId as string | undefined;

    if (!guestId) {
      if (!guestData || !guestData.email || !guestData.name) {
        return NextResponse.json(
          { error: 'guestData with name and email is required when guestId is not provided' },
          { status: 400 }
        );
      }

      const email = String(guestData.email).trim().toLowerCase();
      const name = String(guestData.name).trim();

      const guest = await prisma.user.upsert({
        where: { email },
        update: {
          name,
          tenantId,
        },
        create: {
          email,
          name,
          role: 'GUEST',
          tenantId,
        },
      });
      guestId = guest.id;

      const firstName =
        (guestData.firstName && String(guestData.firstName).trim()) ||
        name.split(' ')[0] ||
        name;
      const lastName =
        (guestData.lastName && String(guestData.lastName).trim()) ||
        name.split(' ').slice(1).join(' ') ||
        '';

      await prisma.guestProfile.upsert({
        where: { userId: guest.id },
        update: {
          firstName,
          lastName,
          phone: guestData.phone ? String(guestData.phone) : undefined,
          nationality: guestData.nationality
            ? String(guestData.nationality)
            : undefined,
        },
        create: {
          userId: guest.id,
          firstName,
          lastName,
          phone: guestData.phone ? String(guestData.phone) : undefined,
          nationality: guestData.nationality
            ? String(guestData.nationality)
            : undefined,
        },
      });
    }

    const tenantDb = new TenantDb(tenantId);
    const confirmationNumber = providedConfirmation || generateConfirmationNumber();

    const booking = await tenantDb.createBooking({
      roomId,
      propertyId,
      guestId,
      confirmationNumber,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      adults,
      children,
      totalAmount: computedTotal,
      status,
      source,
      specialRequests,
      notes,
    });

    // Auto-create arrival prep tasks — fire and forget, never block the booking response
    try {
      // Fetch guest name for task titles
      const guestRecord = await prisma.user.findUnique({
        where: { id: guestId },
        select: { name: true, guestProfile: { select: { firstName: true, lastName: true } } },
      });
      const profile = guestRecord?.guestProfile;
      const guestLabel = profile
        ? `${profile.firstName} ${profile.lastName}`.trim()
        : (guestRecord?.name ?? guestData?.name ?? 'Guest');
      const checkInLabel = checkIn.toLocaleDateString();
      // Get room number
      const roomRecord = await prisma.room.findUnique({
        where: { id: roomId },
        select: { number: true },
      });
      const roomLabel = roomRecord?.number ?? '';

      await prisma.staffTask.createMany({
        data: [
          {
            tenantId,
            bookingId: booking.id,
            source: 'BOOKING',
            category: 'TRANSFER',
            title: `Arrange transfer — ${guestLabel}${roomLabel ? ` Rm ${roomLabel}` : ''} (${checkInLabel})`,
            description: 'Book and confirm transport from airport to property for arriving guest.',
            priority: 'HIGH',
            status: 'PENDING',
            dueDate: checkIn,
          },
          {
            tenantId,
            bookingId: booking.id,
            source: 'BOOKING',
            category: 'AIRPORT_PICKUP',
            title: `Airport pickup — ${guestLabel}${roomLabel ? ` Rm ${roomLabel}` : ''} (${checkInLabel})`,
            description: 'Confirm who is picking up the guest at the airport and arrange logistics.',
            priority: 'HIGH',
            status: 'PENDING',
            dueDate: checkIn,
          },
          {
            tenantId,
            bookingId: booking.id,
            source: 'BOOKING',
            category: 'ARRIVAL_WELCOME',
            title: `Arrival welcome — ${guestLabel}${roomLabel ? ` Rm ${roomLabel}` : ''} (${checkInLabel})`,
            description: 'Prepare welcome drinks, room key, and check-in materials.',
            priority: 'MEDIUM',
            status: 'PENDING',
            dueDate: checkIn,
          },
        ],
      });
    } catch (taskErr) {
      console.error('Auto-task creation failed (booking still created):', taskErr);
    }

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error: any) {
    console.error('Create booking API error:', error);
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'A booking with this confirmation number already exists. Try again.' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
