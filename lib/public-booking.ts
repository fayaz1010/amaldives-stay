import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

export interface CreatePublicBookingInput {
  subdomain: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  adults?: number;
  children?: number;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  specialRequests?: string;
  source?: string;
  status?: 'PENDING' | 'CONFIRMED';
}

export async function createPublicBooking(input: CreatePublicBookingInput) {
  const {
    subdomain,
    roomId,
    checkIn,
    checkOut,
    adults = 1,
    children = 0,
    guestName,
    guestEmail,
    guestPhone,
    specialRequests,
    source = 'direct',
    status = 'CONFIRMED',
  } = input;

  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);

  if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
    throw new Error('Invalid date format');
  }
  if (checkOutDate <= checkInDate) {
    throw new Error('checkOut must be after checkIn');
  }

  const tenant = await prisma.tenant.findFirst({
    where: {
      status: 'ACTIVE',
      OR: [{ subdomain }, { amaldivesSlug: subdomain }],
    },
  });
  if (!tenant) throw new Error('Guesthouse not found');

  const room = await prisma.room.findFirst({
    where: { id: roomId, tenantId: tenant.id },
    include: { property: { select: { id: true, name: true, currency: true } } },
  });
  if (!room) throw new Error('Room not found');

  const [bookingConflicts, externalBlocks] = await Promise.all([
    prisma.booking.findMany({
      where: {
        roomId: room.id,
        status: { in: ['CONFIRMED', 'CHECKED_IN', 'PENDING'] },
        AND: [
          { checkInDate: { lt: checkOutDate } },
          { checkOutDate: { gt: checkInDate } },
        ],
      },
      select: { id: true },
    }),
    prisma.externalCalendarBlock.findMany({
      where: {
        tenantId: tenant.id,
        OR: [{ roomId: room.id }, { roomId: null }],
        AND: [
          { startDate: { lt: checkOutDate } },
          { endDate: { gt: checkInDate } },
        ],
      },
      select: { id: true },
    }),
  ]);

  if (bookingConflicts.length > 0 || externalBlocks.length > 0) {
    throw new Error('Room is not available for the selected dates');
  }

  let guest = await prisma.user.findUnique({ where: { email: guestEmail } });
  if (!guest) {
    const parts = guestName.trim().split(/\s+/);
    const firstName = parts[0] || '—';
    const lastName = parts.slice(1).join(' ') || '—';
    guest = await prisma.user.create({
      data: {
        email: guestEmail,
        name: guestName,
        password: await bcrypt.hash(randomUUID(), 10),
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
  const platformFee = totalAmount * tenant.commissionRate;
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
      adults,
      children,
      totalAmount,
      platformFee,
      status,
      source,
      specialRequests,
      guestToken: randomUUID(),
    },
  });

  return {
    booking,
    guest,
    room,
    nights,
    tenant,
    currency: room.property.currency || 'USD',
  };
}
