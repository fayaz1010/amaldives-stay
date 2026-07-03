/**
 * GET /api/admin/finance/mira?period=YYYY-MM
 *
 * Per-property MIRA return summary (TGST + Green Tax + service charge) for the
 * ACTIVE property and a month period. Each property files its own return, so we
 * always scope to the active property and use that property's tax config.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getActiveProperty } from '@/lib/active-property';
import { computeMiraReturn, miraDueDate } from '@/lib/tax';

export const dynamic = 'force-dynamic';

function parsePeriod(v: string | null): { year: number; month: number } {
  // YYYY-MM → {year, month(1..12)}; default current month (UTC).
  if (v && /^\d{4}-\d{2}$/.test(v)) {
    const [y, m] = v.split('-').map(Number);
    if (m >= 1 && m <= 12) return { year: y, month: m };
  }
  const now = new Date();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const property = await getActiveProperty(session.user.tenantId);
  if (!property) {
    return NextResponse.json({ error: 'No property found for this account' }, { status: 404 });
  }

  const { year, month } = parsePeriod(new URL(request.url).searchParams.get('period'));
  const periodStart = new Date(Date.UTC(year, month - 1, 1));
  const periodEndExclusive = new Date(Date.UTC(year, month, 1));

  // Property record (tax config + room count for green-tax tier default).
  const [propRecord, roomCount, bookings] = await Promise.all([
    prisma.property.findUnique({
      where: { id: property.id },
      select: { taxTin: true, tgstRate: true, greenTaxUsdPerNight: true, serviceChargeRate: true },
    }),
    prisma.room.count({ where: { propertyId: property.id } }),
    // Bookings whose stay overlaps the period, for this property, that count as sales.
    // NO_SHOW is included: a guest who never arrived still incurs the platform
    // commission (Booking.platformFee) and the Green Tax liability for the booked
    // nights, so those must appear in the finance/MIRA figures. CANCELLED/PENDING
    // are still excluded, so a no-show is counted exactly once (no double-count).
    prisma.booking.findMany({
      where: {
        propertyId: property.id,
        status: { in: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'NO_SHOW'] },
        checkInDate: { lt: periodEndExclusive },
        checkOutDate: { gt: periodStart },
      },
      select: { adults: true, children: true, totalAmount: true, checkInDate: true, checkOutDate: true, platformFee: true },
    }),
  ]);

  const summary = computeMiraReturn(bookings, { ...propRecord, roomCount });
  const due = miraDueDate(year, month);

  return NextResponse.json({
    property: { id: property.id, name: property.name },
    period: `${year}-${String(month).padStart(2, '0')}`,
    dueDate: due.toISOString().slice(0, 10),
    roomCount,
    ...summary,
  });
}
