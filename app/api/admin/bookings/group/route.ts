import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

function generateConfirmationNumber() {
  return 'STAY-' + Date.now().toString(36).toUpperCase();
}

function calcNights(checkIn: Date, checkOut: Date) {
  return Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!session.user?.tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 403 });

    const allowedRoles = ['TENANT_ADMIN', 'MANAGER', 'FRONT_DESK'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const tenantId = session.user.tenantId;
    const data = await request.json();
    const {
      roomIds,
      propertyId,
      checkInDate,
      checkOutDate,
      adults = 2,
      children = 0,
      guestData,
      guestId: providedGuestId,
      notes,
      specialRequests,
    } = data || {};

    // Validate required fields
    if (!Array.isArray(roomIds) || roomIds.length === 0) {
      return NextResponse.json({ error: 'roomIds array is required' }, { status: 400 });
    }
    if (!propertyId || !checkInDate || !checkOutDate) {
      return NextResponse.json({ error: 'propertyId, checkInDate, checkOutDate are required' }, { status: 400 });
    }

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }
    if (checkOut <= checkIn) {
      return NextResponse.json({ error: 'checkOutDate must be after checkInDate' }, { status: 400 });
    }

    // Validate property belongs to tenant
    let resolvedPropertyId = propertyId;
    if (!resolvedPropertyId || resolvedPropertyId === '_auto_') {
      // Look up property from the first room
      const firstRoom = await prisma.room.findFirst({
        where: { id: roomIds[0], tenantId },
        select: { propertyId: true },
      });
      if (!firstRoom) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      resolvedPropertyId = firstRoom.propertyId;
    } else {
      const property = await prisma.property.findFirst({
        where: { id: resolvedPropertyId, tenantId },
        select: { id: true },
      });
      if (!property) return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    // Validate all rooms belong to tenant and fetch basePrice + number
    const rooms = await prisma.room.findMany({
      where: { id: { in: roomIds }, tenantId },
      select: { id: true, number: true, basePrice: true },
    });
    if (rooms.length !== roomIds.length) {
      return NextResponse.json({ error: 'One or more rooms not found for this tenant' }, { status: 404 });
    }

    // Check none of the rooms are already booked for these dates
    const conflicts = await prisma.booking.findMany({
      where: {
        tenantId,
        roomId: { in: roomIds },
        status: { in: ['CONFIRMED', 'CHECKED_IN'] },
        AND: [
          { checkInDate: { lt: checkOut } },
          { checkOutDate: { gt: checkIn } },
        ],
      },
      select: { roomId: true, room: { select: { number: true } } },
    });
    if (conflicts.length > 0) {
      const conflictNums = conflicts.map((c) => `Rm ${c.room?.number ?? c.roomId}`).join(', ');
      return NextResponse.json(
        { error: `Date conflict for: ${conflictNums}` },
        { status: 409 }
      );
    }

    // Resolve or create guest
    let guestId = providedGuestId as string | undefined;
    if (!guestId) {
      if (!guestData?.email || !guestData?.name) {
        return NextResponse.json(
          { error: 'guestData with name and email is required when guestId is not provided' },
          { status: 400 }
        );
      }
      const email = String(guestData.email).trim().toLowerCase();
      const name = String(guestData.name).trim();
      const guest = await prisma.user.upsert({
        where: { email },
        update: { name, tenantId },
        create: { email, name, role: 'GUEST', tenantId },
      });
      guestId = guest.id;

      const firstName = (guestData.firstName && String(guestData.firstName).trim()) || name.split(' ')[0] || name;
      const lastName = (guestData.lastName && String(guestData.lastName).trim()) || name.split(' ').slice(1).join(' ') || '';
      await prisma.guestProfile.upsert({
        where: { userId: guest.id },
        update: {
          firstName, lastName,
          phone: guestData.phone ? String(guestData.phone) : undefined,
          nationality: guestData.nationality ? String(guestData.nationality) : undefined,
        },
        create: {
          userId: guest.id,
          firstName, lastName,
          phone: guestData.phone ? String(guestData.phone) : undefined,
          nationality: guestData.nationality ? String(guestData.nationality) : undefined,
        },
      });
    }

    const nights = calcNights(checkIn, checkOut);
    const guestLabel = guestData?.name ?? 'Guest';
    const checkInLabel = checkIn.toLocaleDateString();

    // Create GroupBooking + all individual Bookings atomically
    const groupBooking = await prisma.$transaction(async (tx) => {
      const group = await tx.groupBooking.create({
        data: { tenantId, notes: notes ?? null },
      });

      for (const room of rooms) {
        const confirmationNumber = generateConfirmationNumber();
        const totalAmount = room.basePrice * nights;
        await tx.booking.create({
          data: {
            tenantId,
            propertyId: resolvedPropertyId,
            roomId: room.id,
            guestId: guestId!,
            groupBookingId: group.id,
            confirmationNumber,
            checkInDate: checkIn,
            checkOutDate: checkOut,
            adults,
            children,
            totalAmount,
            platformFee: totalAmount * 0.04,
            status: 'CONFIRMED',
            source: 'DIRECT',
            specialRequests: specialRequests ?? null,
            notes: notes ?? null,
          },
        });
      }

      return group;
    });

    // Fetch created bookings for task creation and response
    const createdBookings = await prisma.booking.findMany({
      where: { groupBookingId: groupBooking.id },
      select: { id: true, roomId: true, confirmationNumber: true },
    });

    // Auto-create arrival tasks per room — fire and forget
    try {
      const taskData: any[] = [];
      for (const booking of createdBookings) {
        const room = rooms.find((r) => r.id === booking.roomId);
        const roomLabel = room?.number ? ` Rm ${room.number}` : '';
        taskData.push(
          {
            tenantId, bookingId: booking.id, source: 'BOOKING', category: 'TRANSFER',
            title: `Arrange transfer — ${guestLabel}${roomLabel} (${checkInLabel})`,
            description: 'Book and confirm transport from airport to property.',
            priority: 'HIGH', status: 'PENDING', dueDate: checkIn,
          },
          {
            tenantId, bookingId: booking.id, source: 'BOOKING', category: 'AIRPORT_PICKUP',
            title: `Airport pickup — ${guestLabel}${roomLabel} (${checkInLabel})`,
            description: 'Confirm who is picking up the guest at the airport.',
            priority: 'HIGH', status: 'PENDING', dueDate: checkIn,
          },
          {
            tenantId, bookingId: booking.id, source: 'BOOKING', category: 'ARRIVAL_WELCOME',
            title: `Arrival welcome — ${guestLabel}${roomLabel} (${checkInLabel})`,
            description: 'Prepare welcome drinks, room key, and check-in materials.',
            priority: 'MEDIUM', status: 'PENDING', dueDate: checkIn,
          },
        );
      }
      await prisma.staffTask.createMany({ data: taskData });
    } catch (taskErr) {
      console.error('Auto-task creation failed (group booking still created):', taskErr);
    }

    return NextResponse.json(
      {
        groupBookingId: groupBooking.id,
        roomCount: rooms.length,
        nights,
        bookings: createdBookings,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Group booking API error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
