import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { subdomain: string } }
) {
  try {
    const { subdomain } = params;
    const body = await request.json();
    const {
      roomId,
      checkIn,
      checkOut,
      adults,
      children,
      guestName,
      guestEmail,
      guestPhone,
      specialRequests,
    } = body;

    if (!subdomain) {
      return NextResponse.json({ error: 'Subdomain is required' }, { status: 400 });
    }

    if (!roomId || !checkIn || !checkOut || !guestName || !guestEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: roomId, checkIn, checkOut, guestName, guestEmail' },
        { status: 400 }
      );
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    if (checkOutDate <= checkInDate) {
      return NextResponse.json(
        { error: 'checkOut must be after checkIn' },
        { status: 400 }
      );
    }

    const tenant = await prisma.tenant.findUnique({
      where: { subdomain, status: 'ACTIVE' },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Guesthouse not found' }, { status: 404 });
    }

    const room = await prisma.room.findFirst({
      where: { id: roomId, tenantId: tenant.id },
      include: {
        property: { select: { id: true, name: true } },
      },
    });

    if (!room) {
      return NextResponse.json(
        { error: 'Room not found for this guesthouse' },
        { status: 404 }
      );
    }

    const conflicts = await prisma.booking.findMany({
      where: {
        roomId: room.id,
        status: { in: ['CONFIRMED', 'CHECKED_IN'] },
        AND: [
          { checkInDate: { lt: checkOutDate } },
          { checkOutDate: { gt: checkInDate } },
        ],
      },
      select: { id: true },
    });

    if (conflicts.length > 0) {
      return NextResponse.json(
        { error: 'Room is not available for the selected dates' },
        { status: 409 }
      );
    }

    let guest = await prisma.user.findUnique({
      where: { email: guestEmail },
    });

    if (!guest) {
      const tempPassword = randomUUID();
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      // Split "First Last" → firstName / lastName for the GuestProfile.
      // Both fields are non-nullable; we fall back to '—' for missing parts
      // so the create doesn't blow up on a single-word name.
      const parts = (guestName as string).trim().split(/\s+/);
      const firstName = parts[0] || '—';
      const lastName = parts.slice(1).join(' ') || '—';

      guest = await prisma.user.create({
        data: {
          email: guestEmail,
          name: guestName,
          password: hashedPassword,
          role: 'GUEST',
          guestProfile: {
            create: {
              firstName,
              lastName,
              phone: guestPhone ?? null,
            },
          },
        },
      });
    }

    const nights = Math.ceil(
      (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const totalAmount = room.basePrice * nights;
    const platformFee = totalAmount * (tenant as any).commissionRate;
    const confirmationNumber = `AMS-${randomUUID().substring(0, 8).toUpperCase()}`;

    const booking = await prisma.booking.create({
      data: {
        tenantId: tenant.id,
        propertyId: room.propertyId,
        roomId: room.id,
        guestId: guest.id,
        confirmationNumber,
        checkInDate,
        checkOutDate,
        adults: adults || 1,
        children: children || 0,
        totalAmount,
        platformFee,
        status: 'CONFIRMED',
        source: 'amaldives.com',
        specialRequests,
      } as any,
    });

    return NextResponse.json(
      {
        booking: {
          confirmationNumber: booking.confirmationNumber,
          checkIn: booking.checkInDate,
          checkOut: booking.checkOutDate,
          nights,
          totalAmount: booking.totalAmount,
          roomName: room.number,
          propertyName: room.property.name,
          guestName: guest.name,
          guestEmail: guest.email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Public booking API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
