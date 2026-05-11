import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const OVERTIME_THRESHOLD_HOURS = 8; // hours per day, >8h/day = overtime
const OVERTIME_RATE = 1.5;          // 1.5× hourly rate for overtime

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const tenantId = session.user.tenantId;
    const body = await request.json();

    // period like "2026-05"
    const period: string = body.period ?? (() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    })();

    const [year, month] = period.split('-').map(Number);
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 1);

    // Get all active staff
    const staffList = await prisma.staffProfile.findMany({
      where: { tenantId, isActive: true, salary: { not: null } },
      select: {
        id: true, salary: true,
        clockRecords: {
          where: { clockIn: { gte: periodStart, lt: periodEnd }, clockOut: { not: null } },
          select: { clockIn: true, clockOut: true, breakMinutes: true },
        },
      },
    });

    const created: any[] = [];
    const updated: any[] = [];

    for (const staff of staffList) {
      const baseSalary = staff.salary ?? 0;
      const daysInMonth = new Date(year, month, 0).getDate();
      const dailyRate = baseSalary / daysInMonth;
      const hourlyRate = baseSalary / (daysInMonth * 8);

      let totalHours = 0;
      let overtimePay = 0;

      for (const record of staff.clockRecords) {
        if (!record.clockOut) continue;
        const worked =
          (record.clockOut.getTime() - record.clockIn.getTime()) / 3600000 -
          ((record.breakMinutes ?? 0) / 60);
        totalHours += worked;
        if (worked > OVERTIME_THRESHOLD_HOURS) {
          overtimePay += (worked - OVERTIME_THRESHOLD_HOURS) * hourlyRate * OVERTIME_RATE;
        }
      }

      const netPay = baseSalary + overtimePay;

      const existing = await prisma.payrollEntry.findUnique({
        where: { tenantId_staffId_period: { tenantId, staffId: staff.id, period } },
      });

      if (existing && existing.status === 'DRAFT') {
        const entry = await prisma.payrollEntry.update({
          where: { id: existing.id },
          data: { baseSalary, hoursWorked: totalHours, overtimePay, netPay },
        });
        updated.push(entry);
      } else if (!existing) {
        const entry = await prisma.payrollEntry.create({
          data: {
            tenantId, staffId: staff.id, period,
            baseSalary, hoursWorked: totalHours,
            overtimePay, deductions: 0, netPay,
            currency: 'USD', status: 'DRAFT',
          },
        });
        created.push(entry);
      }
    }

    return NextResponse.json({
      period, created: created.length, updated: updated.length,
      total: staffList.length,
    });
  } catch (error) {
    console.error('Payroll generate error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json();
    const { id, status, deductions, notes } = body;
    const data: any = {};
    if (status)     data.status = status;
    if (deductions !== undefined) data.deductions = deductions;
    if (notes)      data.notes = notes;
    if (status === 'PAID') data.paidAt = new Date();

    const entry = await prisma.payrollEntry.update({ where: { id }, data });
    return NextResponse.json({ entry });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
