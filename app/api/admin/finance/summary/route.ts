import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

function periodBounds(period: string): { start: Date; end: Date } {
  const now = new Date();
  if (period === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { start, end: new Date(start.getTime() + 86400000) };
  }
  if (period === 'week') {
    const start = new Date(now); start.setDate(now.getDate() - now.getDay()); start.setHours(0,0,0,0);
    const end = new Date(start.getTime() + 7 * 86400000);
    return { start, end };
  }
  if (period === 'year') {
    return { start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear() + 1, 0, 1) };
  }
  // default: current month
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const tenantId = session.user.tenantId;
    const url = new URL(request.url);
    const period = url.searchParams.get('period') ?? 'month';
    const { start, end } = periodBounds(period);

    const [
      bookings,
      payments,
      fnbBills,
      minibarUsages,
      serviceOrders,
      logisticsItems,
      maintenanceRequests,
      arrivalRecords,
      departureRecords,
      expenses,
    ] = await Promise.all([
      prisma.booking.findMany({
        where: { tenantId, createdAt: { gte: start, lt: end } },
        select: { totalAmount: true, paidAmount: true, status: true },
      }),
      prisma.payment.findMany({
        where: { tenantId, status: 'COMPLETED', processedAt: { gte: start, lt: end } },
        select: { amount: true, method: true },
      }),
      prisma.fnBBill.findMany({
        where: { tenantId, createdAt: { gte: start, lt: end } },
        select: { totalAmount: true, paidAmount: true, status: true },
      }),
      prisma.minIBarUsage.findMany({
        where: { tenantId, isFree: false, createdAt: { gte: start, lt: end } },
        select: { amount: true, status: true },
      }),
      prisma.serviceOrder.findMany({
        where: { tenantId, status: { not: 'CANCELLED' }, createdAt: { gte: start, lt: end } },
        select: { totalAmount: true, status: true, service: { select: { category: true } } },
      }),
      prisma.logisticsOrderItem.findMany({
        where: { order: { tenantId }, actualCost: { not: null } },
        select: { actualCost: true, estimatedCost: true },
      }),
      prisma.maintenanceRequest.findMany({
        where: { tenantId, createdAt: { gte: start, lt: end }, cost: { not: null } },
        select: { cost: true },
      }),
      prisma.arrivalRecord.findMany({
        where: { tenantId, createdAt: { gte: start, lt: end }, transportCost: { not: null } },
        select: { transportCost: true, costPaid: true },
      }),
      prisma.departureRecord.findMany({
        where: { tenantId, createdAt: { gte: start, lt: end }, transportCost: { not: null } },
        select: { transportCost: true, costPaid: true },
      }),
      prisma.expense.findMany({
        where: { tenantId, createdAt: { gte: start, lt: end } },
        select: { amount: true, status: true, category: true },
      }),
    ]);

    // Revenue streams
    const bookingRevenue = bookings.reduce((s, b) => s + b.totalAmount, 0);
    const bookingReceived = payments.reduce((s, p) => s + p.amount, 0);
    const bookingReceivable = bookings
      .filter(b => b.status !== 'CANCELLED')
      .reduce((s, b) => s + Math.max(0, b.totalAmount - b.paidAmount), 0);

    const fnbRevenue = fnbBills.reduce((s, b) => s + b.totalAmount, 0);
    const fnbReceived = fnbBills.filter(b => b.status === 'PAID').reduce((s, b) => s + b.paidAmount, 0);
    const fnbReceivable = fnbBills.filter(b => ['OPEN', 'CLOSED'].includes(b.status))
      .reduce((s, b) => s + (b.totalAmount - b.paidAmount), 0);

    const minibarRevenue = minibarUsages.reduce((s, u) => s + u.amount, 0);
    const minibarReceivable = minibarUsages.filter(u => u.status === 'PENDING' || u.status === 'ON_BILL')
      .reduce((s, u) => s + u.amount, 0);

    const serviceRevenue = serviceOrders.reduce((s, o) => s + o.totalAmount, 0);
    const serviceReceivable = serviceOrders.filter(o => o.status !== 'COMPLETED')
      .reduce((s, o) => s + o.totalAmount, 0);

    const totalRevenue = bookingRevenue + fnbRevenue + minibarRevenue + serviceRevenue;
    const totalReceived = bookingReceived + fnbReceived +
      minibarUsages.filter(u => u.status === 'PAID').reduce((s, u) => s + u.amount, 0) +
      serviceOrders.filter(o => o.status === 'COMPLETED').reduce((s, o) => s + o.totalAmount, 0);
    const totalReceivable = bookingReceivable + fnbReceivable + minibarReceivable + serviceReceivable;

    // Expense streams
    const logisticsCost = logisticsItems.reduce((s, i) => s + (i.actualCost ?? i.estimatedCost ?? 0), 0);
    const maintenanceCost = maintenanceRequests.reduce((s, m) => s + (m.cost ?? 0), 0);
    const transportCost = [...arrivalRecords, ...departureRecords].reduce((s, r) => s + (r.transportCost ?? 0), 0);
    const expenseTotal = expenses.filter(e => e.status !== 'CANCELLED').reduce((s, e) => s + e.amount, 0);
    const expensePaid = expenses.filter(e => e.status === 'PAID').reduce((s, e) => s + e.amount, 0);
    const expensePending = expenses.filter(e => ['PENDING', 'APPROVED', 'OVERDUE'].includes(e.status))
      .reduce((s, e) => s + e.amount, 0);

    const totalExpenses = logisticsCost + maintenanceCost + transportCost + expenseTotal;
    const netPosition = totalReceived - expensePaid;

    // Chart data: revenue by source
    const revenueBySource = [
      { label: 'Bookings',   value: bookingRevenue },
      { label: 'F&B',        value: fnbRevenue },
      { label: 'Mini Bar',   value: minibarRevenue },
      { label: 'Services',   value: serviceRevenue },
    ].filter(d => d.value > 0);

    // Chart data: expenses by category
    const expenseByCat: Record<string, number> = {
      Logistics:   logisticsCost,
      Maintenance: maintenanceCost,
      Transport:   transportCost,
    };
    for (const e of expenses.filter(ex => ex.status !== 'CANCELLED')) {
      expenseByCat[e.category] = (expenseByCat[e.category] ?? 0) + e.amount;
    }
    const expenseByCategory = Object.entries(expenseByCat)
      .map(([label, value]) => ({ label, value }))
      .filter(d => d.value > 0);

    // Payment method breakdown
    const byMethod: Record<string, number> = {};
    for (const p of payments) {
      byMethod[p.method] = (byMethod[p.method] ?? 0) + p.amount;
    }

    return NextResponse.json({
      period,
      totalRevenue,
      totalReceived,
      totalReceivable,
      totalExpenses,
      netPosition,
      expensePending,
      breakdown: {
        bookingRevenue, bookingReceived, bookingReceivable,
        fnbRevenue, fnbReceived, fnbReceivable,
        minibarRevenue, minibarReceivable,
        serviceRevenue, serviceReceivable,
        logisticsCost, maintenanceCost, transportCost,
        expenseTotal, expensePaid, expensePending,
      },
      revenueBySource,
      expenseByCategory,
      paymentMethods: Object.entries(byMethod).map(([method, amount]) => ({ method, amount })),
    });
  } catch (error) {
    console.error('Finance summary error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
