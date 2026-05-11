import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const tenantId = session.user.tenantId;
    const url = new URL(request.url);
    const type = url.searchParams.get('type') ?? 'ALL'; // INCOME | EXPENSE | ALL
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
    const PAGE_SIZE = 50;
    const skip = (page - 1) * PAGE_SIZE;

    const rows: any[] = [];

    if (type === 'ALL' || type === 'INCOME') {
      // Booking payments
      const payments = await prisma.payment.findMany({
        where: { tenantId, status: 'COMPLETED' },
        include: { booking: { select: { confirmationNumber: true, room: { select: { number: true } }, guest: { select: { name: true, guestProfile: { select: { firstName: true, lastName: true } } } } } } },
        orderBy: { processedAt: 'desc' },
      });
      for (const p of payments) {
        const profile = p.booking?.guest?.guestProfile;
        const guestName = profile ? `${profile.firstName} ${profile.lastName}`.trim() : (p.booking?.guest?.name ?? '');
        rows.push({
          id: `pay:${p.id}`, type: 'INCOME', category: 'Booking Payment',
          description: `${guestName}${p.booking?.room?.number ? ` · Rm ${p.booking.room.number}` : ''} · #${p.booking?.confirmationNumber ?? ''}`,
          amount: p.amount, currency: p.currency, status: 'RECEIVED',
          method: p.method, date: p.processedAt?.toISOString() ?? p.createdAt.toISOString(),
          link: '/admin/reservations',
        });
      }

      // F&B bills paid
      const fnbBills = await prisma.fnBBill.findMany({
        where: { tenantId, status: { in: ['PAID', 'CLOSED'] } },
        include: { outlet: { select: { name: true } } },
        orderBy: { updatedAt: 'desc' },
      });
      for (const b of fnbBills) {
        rows.push({
          id: `fnb:${b.id}`, type: 'INCOME', category: 'F&B',
          description: `${b.outlet?.name ?? 'F&B'}${b.guestName ? ` · ${b.guestName}` : ''}${b.tableNumber ? ` · Tbl ${b.tableNumber}` : ''}`,
          amount: b.paidAmount || b.totalAmount, currency: 'USD', status: b.status === 'PAID' ? 'RECEIVED' : 'PARTIAL',
          method: b.paymentMethod ?? null, date: b.updatedAt.toISOString(),
          link: '/admin/fnb',
        });
      }

      // Mini bar paid
      const minibar = await prisma.minIBarUsage.findMany({
        where: { tenantId, isFree: false, status: 'PAID' },
        include: { item: { select: { name: true } }, room: { select: { number: true } } },
        orderBy: { updatedAt: 'desc' },
      });
      for (const u of minibar) {
        rows.push({
          id: `mb:${u.id}`, type: 'INCOME', category: 'Mini Bar',
          description: `${u.item?.name ?? 'Item'} ×${u.quantity} · Rm ${u.room?.number ?? '?'}`,
          amount: u.amount, currency: 'USD', status: 'RECEIVED',
          method: null, date: u.updatedAt.toISOString(),
          link: '/admin/minibar',
        });
      }

      // Completed service orders
      const services = await prisma.serviceOrder.findMany({
        where: { tenantId, status: 'COMPLETED' },
        include: { service: { select: { name: true } }, room: { select: { number: true } }, booking: { select: { room: { select: { number: true } } } } },
        orderBy: { completedAt: 'desc' },
      });
      for (const s of services) {
        const room = s.room?.number ?? s.booking?.room?.number;
        rows.push({
          id: `svc:${s.id}`, type: 'INCOME', category: 'Service',
          description: `${s.service?.name ?? 'Service'} ×${s.quantity}${room ? ` · Rm ${room}` : ''}`,
          amount: s.totalAmount, currency: 'USD', status: 'RECEIVED',
          method: null, date: s.completedAt?.toISOString() ?? s.updatedAt.toISOString(),
          link: '/admin/extra-services',
        });
      }

      // Open receivables (booking outstanding)
      const openBookings = await prisma.booking.findMany({
        where: { tenantId, status: { in: ['CONFIRMED', 'CHECKED_IN'] } },
        include: { room: { select: { number: true } }, guest: { select: { name: true, guestProfile: { select: { firstName: true, lastName: true } } } } },
        orderBy: { checkInDate: 'asc' },
      });
      for (const b of openBookings) {
        const outstanding = b.totalAmount - b.paidAmount;
        if (outstanding <= 0) continue;
        const profile = b.guest?.guestProfile;
        const guestName = profile ? `${profile.firstName} ${profile.lastName}`.trim() : (b.guest?.name ?? '');
        rows.push({
          id: `bk:${b.id}`, type: 'INCOME', category: 'Booking (Outstanding)',
          description: `${guestName} · Rm ${b.room?.number ?? '?'}`,
          amount: outstanding, currency: 'USD', status: 'RECEIVABLE',
          method: null, date: b.checkInDate.toISOString(),
          link: '/admin/reservations',
        });
      }
    }

    if (type === 'ALL' || type === 'EXPENSE') {
      // Manual expenses
      const expenses = await prisma.expense.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
      });
      for (const e of expenses) {
        rows.push({
          id: `exp:${e.id}`, type: 'EXPENSE', category: e.category,
          description: e.title + (e.description ? ` — ${e.description}` : ''),
          amount: e.amount, currency: e.currency, status: e.status,
          method: null, date: (e.paidAt ?? e.dueDate ?? e.createdAt).toISOString(),
          link: '/admin/finance',
        });
      }

      // Logistics costs
      const logItems = await prisma.logisticsOrderItem.findMany({
        where: { order: { tenantId }, actualCost: { not: null } },
        include: { order: { select: { title: true } } },
        orderBy: { order: { updatedAt: 'desc' } },
      });
      for (const i of logItems) {
        rows.push({
          id: `logi:${i.id}`, type: 'EXPENSE', category: 'LOGISTICS',
          description: `${i.name} × ${i.quantity}${i.order?.title ? ` (${i.order.title})` : ''}`,
          amount: i.actualCost ?? 0, currency: 'USD', status: 'PAID',
          method: null, date: new Date().toISOString(),
          link: '/admin/logistics',
        });
      }

      // Maintenance costs
      const maint = await prisma.maintenanceRequest.findMany({
        where: { tenantId, cost: { not: null } },
        include: { room: { select: { number: true } } },
        orderBy: { updatedAt: 'desc' },
      });
      for (const m of maint) {
        rows.push({
          id: `mnt:${m.id}`, type: 'EXPENSE', category: 'MAINTENANCE',
          description: `${m.title}${m.room?.number ? ` · Rm ${m.room.number}` : ''}`,
          amount: m.cost ?? 0, currency: 'USD', status: 'PAID',
          method: null, date: m.updatedAt.toISOString(),
          link: '/admin/maintenance',
        });
      }

      // Transport costs
      const arrivals = await prisma.arrivalRecord.findMany({
        where: { tenantId, transportCost: { not: null } },
        orderBy: { updatedAt: 'desc' },
      });
      for (const a of arrivals) {
        rows.push({
          id: `arr:${a.id}`, type: 'EXPENSE', category: 'TRANSPORT',
          description: `Arrival transport · ${a.transportType ?? ''}`,
          amount: a.transportCost ?? 0, currency: 'USD',
          status: a.costPaid ? 'PAID' : 'PENDING',
          method: null, date: a.updatedAt.toISOString(),
          link: '/admin/arrivals',
        });
      }
      const departures = await prisma.departureRecord.findMany({
        where: { tenantId, transportCost: { not: null } },
        orderBy: { updatedAt: 'desc' },
      });
      for (const d of departures) {
        rows.push({
          id: `dep:${d.id}`, type: 'EXPENSE', category: 'TRANSPORT',
          description: `Departure transport · ${d.transportType ?? ''}`,
          amount: d.transportCost ?? 0, currency: 'USD',
          status: d.costPaid ? 'PAID' : 'PENDING',
          method: null, date: d.updatedAt.toISOString(),
          link: '/admin/arrivals',
        });
      }
    }

    // Sort all by date desc, paginate
    rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const total = rows.length;
    const paginated = rows.slice(skip, skip + PAGE_SIZE);

    return NextResponse.json({ rows: paginated, total, page, pageSize: PAGE_SIZE });
  } catch (error) {
    console.error('Finance transactions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
