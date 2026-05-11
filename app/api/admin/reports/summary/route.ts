import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

type SummaryResponse = {
  period: { year: number; month: number; startDate: string; endDate: string; daysInMonth: number };
  totals: {
    totalRevenue: number;
    serviceRevenue: number;
    paidAmount: number;
    occupiedNights: number;
    totalRoomNights: number;
    totalRooms: number;
    bookingCount: number;
  };
  metrics: {
    occupancy: number;
    adr: number;
    revPAR: number;
  };
  comparison: {
    totalRevenue: number;
    occupancy: number;
    adr: number;
    revPAR: number;
    revenueChange: number;
    occupancyChange: number;
    adrChange: number;
    revPARChange: number;
  };
  dailyRevenue: { day: number; date: string; revenue: number }[];
  bySource: { source: string; count: number; revenue: number }[];
  byRoomType: { type: string; nights: number; revenue: number; occupancy: number }[];
};

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function startOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
}

function endOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
}

function normalizeSource(src: string | null | undefined): string {
  if (!src) return 'DIRECT';
  const s = src.toString().trim().toLowerCase();
  if (s === 'direct') return 'DIRECT';
  if (s.includes('booking')) return 'BOOKING_COM';
  if (s.includes('agoda')) return 'AGODA';
  if (s.includes('airbnb')) return 'AIRBNB';
  return 'OTHER';
}

function computeNights(checkIn: Date, checkOut: Date, periodStart: Date, periodEnd: Date) {
  const startMs = Math.max(checkIn.getTime(), periodStart.getTime());
  const endMs = Math.min(checkOut.getTime(), periodEnd.getTime() + 1);
  if (endMs <= startMs) return 0;
  const ms = endMs - startMs;
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

async function loadPeriod(tenantId: string, year: number, month: number, totalRooms: number) {
  const start = startOfMonth(year, month);
  const end = endOfMonth(year, month);
  const dim = daysInMonth(year, month);

  const bookings = await prisma.booking.findMany({
    where: {
      tenantId,
      checkInDate: { gte: start, lte: end },
      status: { in: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'] },
    },
    include: {
      room: { select: { type: true, basePrice: true } },
      serviceOrders: { select: { totalAmount: true } },
      payments: { select: { amount: true, status: true } },
    },
  });

  let totalRevenue = 0;
  let serviceRevenue = 0;
  let paidAmount = 0;
  let occupiedNights = 0;

  const dailyRevenue = Array.from({ length: dim }, (_, i) => ({
    day: i + 1,
    date: new Date(Date.UTC(year, month - 1, i + 1)).toISOString().slice(0, 10),
    revenue: 0,
  }));

  const sourceMap = new Map<string, { count: number; revenue: number }>();
  const roomTypeMap = new Map<string, { nights: number; revenue: number }>();

  for (const b of bookings) {
    const total = b.totalAmount || 0;
    totalRevenue += total;
    serviceRevenue += (b.serviceOrders || []).reduce((s, so) => s + (so.totalAmount || 0), 0);
    paidAmount += (b.payments || []).filter((p) => p.status === 'COMPLETED').reduce((s, p) => s + (p.amount || 0), 0);

    const nights = computeNights(b.checkInDate, b.checkOutDate, start, end);
    occupiedNights += nights;

    const ci = new Date(b.checkInDate);
    if (ci >= start && ci <= end) {
      const dayIdx = ci.getUTCDate() - 1;
      if (dayIdx >= 0 && dayIdx < dim) dailyRevenue[dayIdx].revenue += total;
    }

    const source = normalizeSource(b.source);
    const sEntry = sourceMap.get(source) || { count: 0, revenue: 0 };
    sEntry.count += 1;
    sEntry.revenue += total;
    sourceMap.set(source, sEntry);

    const rt = b.room?.type || 'UNKNOWN';
    const rEntry = roomTypeMap.get(rt) || { nights: 0, revenue: 0 };
    rEntry.nights += nights;
    rEntry.revenue += total;
    roomTypeMap.set(rt, rEntry);
  }

  const totalRoomNights = totalRooms * dim;
  const occupancy = totalRoomNights > 0 ? (occupiedNights / totalRoomNights) * 100 : 0;
  const adr = occupiedNights > 0 ? totalRevenue / occupiedNights : 0;
  const revPAR = totalRoomNights > 0 ? totalRevenue / totalRoomNights : 0;

  return {
    bookingCount: bookings.length,
    totalRevenue,
    serviceRevenue,
    paidAmount,
    occupiedNights,
    totalRoomNights,
    occupancy,
    adr,
    revPAR,
    dailyRevenue,
    sourceMap,
    roomTypeMap,
    dim,
    start,
    end,
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!session.user?.tenantId) return NextResponse.json({ error: 'No tenant associated' }, { status: 403 });

    const tenantId = session.user.tenantId;
    const url = new URL(request.url);
    const now = new Date();
    const year = Number(url.searchParams.get('year')) || now.getUTCFullYear();
    const month = Number(url.searchParams.get('month')) || now.getUTCMonth() + 1;

    if (month < 1 || month > 12) {
      return NextResponse.json({ error: 'Invalid month' }, { status: 400 });
    }

    const totalRooms = await prisma.room.count({ where: { tenantId } });

    const prevYear = month === 1 ? year - 1 : year;
    const prevMonth = month === 1 ? 12 : month - 1;

    const [current, previous] = await Promise.all([
      loadPeriod(tenantId, year, month, totalRooms),
      loadPeriod(tenantId, prevYear, prevMonth, totalRooms),
    ]);

    const pct = (curr: number, prev: number) => {
      if (prev === 0) return curr === 0 ? 0 : 100;
      return ((curr - prev) / prev) * 100;
    };

    const bySource = Array.from(current.sourceMap.entries()).map(([source, v]) => ({
      source,
      count: v.count,
      revenue: v.revenue,
    }));

    const byRoomType = Array.from(current.roomTypeMap.entries())
      .map(([type, v]) => {
        const maxNights = current.dim * Math.max(1, totalRooms);
        return {
          type,
          nights: v.nights,
          revenue: v.revenue,
          occupancy: maxNights > 0 ? (v.nights / maxNights) * 100 : 0,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);

    const response: SummaryResponse = {
      period: {
        year,
        month,
        startDate: current.start.toISOString(),
        endDate: current.end.toISOString(),
        daysInMonth: current.dim,
      },
      totals: {
        totalRevenue: current.totalRevenue,
        serviceRevenue: current.serviceRevenue,
        paidAmount: current.paidAmount,
        occupiedNights: current.occupiedNights,
        totalRoomNights: current.totalRoomNights,
        totalRooms,
        bookingCount: current.bookingCount,
      },
      metrics: {
        occupancy: current.occupancy,
        adr: current.adr,
        revPAR: current.revPAR,
      },
      comparison: {
        totalRevenue: previous.totalRevenue,
        occupancy: previous.occupancy,
        adr: previous.adr,
        revPAR: previous.revPAR,
        revenueChange: pct(current.totalRevenue, previous.totalRevenue),
        occupancyChange: pct(current.occupancy, previous.occupancy),
        adrChange: pct(current.adr, previous.adr),
        revPARChange: pct(current.revPAR, previous.revPAR),
      },
      dailyRevenue: current.dailyRevenue,
      bySource,
      byRoomType,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Reports summary API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
