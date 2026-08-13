import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getAgentContext } from '@/lib/agent-context';
import { calculateStayRate } from '@/lib/calculate-stay-rate';
import { createPublicBooking } from '@/lib/public-booking';

export const dynamic = 'force-dynamic';

// Resolve the tenant an agent request targets. Tenant-scoped agencies are
// pinned to their tenant; platform agencies (tenantId null) pick by subdomain.
async function resolveAgentTenant(
  ctx: NonNullable<Awaited<ReturnType<typeof getAgentContext>>>,
  subdomain: string | null,
) {
  if (ctx.tenantId) {
    return prisma.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: { id: true, name: true, subdomain: true, status: true },
    });
  }
  if (!subdomain) return null;
  return prisma.tenant.findUnique({
    where: { subdomain },
    select: { id: true, name: true, subdomain: true, status: true },
  });
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const ctx = await getAgentContext(session);
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const subdomainParam = url.searchParams.get('subdomain');

  // Platform agency with no property chosen → directory of bookable tenants.
  if (!ctx.tenantId && !subdomainParam) {
    const tenants = await prisma.tenant.findMany({
      where: { status: 'ACTIVE', rooms: { some: { isActive: true } } },
      select: {
        id: true,
        name: true,
        subdomain: true,
        properties: { take: 1, select: { city: true, country: true } },
      },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({
      agency: { id: ctx.agency.id, name: ctx.agency.name, markupPercent: ctx.agency.markupPercent },
      tenants: tenants.map((t) => ({
        name: t.name,
        subdomain: t.subdomain,
        island: t.properties[0]?.city ?? null,
        country: t.properties[0]?.country ?? null,
      })),
    });
  }

  const tenant = await resolveAgentTenant(ctx, subdomainParam);
  if (!tenant || tenant.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Property not available' }, { status: 404 });
  }

  const checkInParam = url.searchParams.get('checkIn');
  const checkOutParam = url.searchParams.get('checkOut');
  const adultsParam = url.searchParams.get('adults');

  if (!checkInParam || !checkOutParam) {
    return NextResponse.json({ error: 'checkIn and checkOut required' }, { status: 400 });
  }

  const checkIn = new Date(checkInParam);
  const checkOut = new Date(checkOutParam);
  const adults = adultsParam ? parseInt(adultsParam, 10) : 2;

  const rooms = await prisma.room.findMany({
    where: {
      tenantId: tenant.id,
      isActive: true,
      capacity: { gte: adults },
    },
    select: {
      id: true,
      number: true,
      name: true,
      type: true,
      capacity: true,
      basePrice: true,
      rackRate: true,
      tenantId: true,
      propertyId: true,
    },
  });

  const results = await Promise.all(
    rooms.map(async (room) => {
      const rate = await calculateStayRate({
        room,
        checkIn,
        checkOut,
        agentMarkupPercent: ctx.agency.markupPercent,
      });
      return {
        id: room.id,
        number: room.number,
        name: room.name,
        type: room.type,
        capacity: room.capacity,
        basePrice: room.basePrice,
        rackRate: room.rackRate ?? room.basePrice,
        nights: rate.nights,
        agentTotal: rate.totalAmount,
        rackTotal: rate.rackTotal,
        markupPercent: ctx.agency.markupPercent,
      };
    }),
  );

  return NextResponse.json({
    tenant,
    agency: {
      id: ctx.agency.id,
      name: ctx.agency.name,
      markupPercent: ctx.agency.markupPercent,
    },
    rooms: results,
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const ctx = await getAgentContext(session);
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const {
    roomId,
    checkIn,
    checkOut,
    adults = 2,
    children = 0,
    guestName,
    guestEmail,
    guestPhone,
    specialRequests,
    subdomain: bodySubdomain,
  } = body;

  if (!roomId || !checkIn || !checkOut || !guestName || !guestEmail) {
    return NextResponse.json(
      { error: 'roomId, checkIn, checkOut, guestName, guestEmail required' },
      { status: 400 },
    );
  }

  const tenant = await resolveAgentTenant(ctx, typeof bodySubdomain === 'string' ? bodySubdomain : null);
  if (!tenant || tenant.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Property not available' }, { status: 404 });
  }

  // Platform bookings: the room must belong to the selected tenant.
  const roomOk = await prisma.room.findFirst({
    where: { id: roomId, tenantId: tenant.id },
    select: { id: true },
  });
  if (!roomOk) {
    return NextResponse.json({ error: 'Room not found for property' }, { status: 404 });
  }

  const result = await createPublicBooking({
    subdomain: tenant.subdomain,
    roomId,
    checkIn,
    checkOut,
    adults,
    children,
    guestName,
    guestEmail,
    guestPhone,
    specialRequests,
    source: 'agent_portal',
    status: 'CONFIRMED',
    agentMarkupPercent: ctx.agency.markupPercent,
    agencyId: ctx.agencyId,
  });

  return NextResponse.json({
    booking: {
      id: result.booking.id,
      confirmationNumber: result.booking.confirmationNumber,
      totalAmount: result.booking.totalAmount,
      checkInDate: result.booking.checkInDate,
      checkOutDate: result.booking.checkOutDate,
    },
    agencyMarkupPercent: ctx.agency.markupPercent,
  }, { status: 201 });
}
