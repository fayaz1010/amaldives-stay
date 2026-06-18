import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { calculateStayRate } from '@/lib/calculate-stay-rate';
import {
  calculatePlatformFee,
  getPlatformCommissionRate,
} from '@/lib/commission';
import { ensureCheckInCodes } from '@/lib/instant-checkin';
import { createBookingAddonOrders, resolveBookingAddons } from '@/lib/booking-addons';

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
  promotionCode?: string;
  agentMarkupPercent?: number;
  agencyId?: string;
  addonItems?: Array<{ serviceId: string; quantity: number }>;
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
  const rate = await calculateStayRate({
    room,
    checkIn: checkInDate,
    checkOut: checkOutDate,
    promotionCode: input.promotionCode,
    agentMarkupPercent: input.agentMarkupPercent,
  });
  const totalAmount = rate.totalAmount;
  const commissionRate = getPlatformCommissionRate(tenant, source);
  const platformFee = calculatePlatformFee(totalAmount, commissionRate);
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
      agencyId: input.agencyId ?? null,
    },
  });

  await ensureCheckInCodes(booking.id);

  const addonItems = input.addonItems ?? [];
  const { lines: addonLines, addonsTotal } = await resolveBookingAddons({
    tenantId: tenant.id,
    propertyId: room.propertyId,
    addonItems,
    nights,
  });

  const addonOrderStatus =
    status === 'CONFIRMED' ? 'CONFIRMED' : ('PENDING' as const);

  if (addonLines.length > 0) {
    await createBookingAddonOrders({
      tenantId: tenant.id,
      propertyId: room.propertyId,
      bookingId: booking.id,
      roomId: room.id,
      guestId: guest.id,
      lines: addonLines,
      status: addonOrderStatus,
      notes: 'Selected at online booking',
    });
  }

  return {
    booking,
    guest,
    room,
    nights,
    tenant,
    currency: room.property.currency || 'USD',
    addonLines,
    addonsTotal,
  };
}
