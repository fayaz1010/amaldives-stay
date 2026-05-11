import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ReportsDashboard } from '@/components/admin/reports-dashboard';

export const dynamic = 'force-dynamic';

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
  return Math.max(0, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)));
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

export default async function ReportsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect('/auth/signin');
  const tenantId = session.user.tenantId;

  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;

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

  const initialData = {
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

  return <ReportsDashboard initialData={initialData} />;
}
