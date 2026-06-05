import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getActivePropertyId } from '@/lib/active-property';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!session.user || !session.user.tenantId) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 403 });
    }

    const tenantId = session.user.tenantId;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const activePropertyId = await getActivePropertyId(tenantId);
    const records = await prisma.staffClockRecord.findMany({
      where: {
        tenantId,
        ...(activePropertyId ? { propertyId: activePropertyId } : {}),
        clockIn: { gte: todayStart, lte: todayEnd },
      },
      include: {
        staff: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { clockIn: 'desc' },
    });

    const clockRecords = records.map((r) => ({
      id: r.id,
      staffId: r.staffId,
      clockIn: r.clockIn.toISOString(),
      clockOut: r.clockOut ? r.clockOut.toISOString() : null,
      breakMinutes: r.breakMinutes,
      notes: r.notes,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      staff: {
        id: r.staff.id,
        department: r.staff.department,
        position: r.staff.position,
        user: r.staff.user,
      },
    }));

    return NextResponse.json({ clockRecords });
  } catch (error) {
    console.error('Clock GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!session.user || !session.user.tenantId) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 403 });
    }

    const tenantId = session.user.tenantId;
    const body = await request.json();
    const { staffId } = body || {};

    if (!staffId) {
      return NextResponse.json({ error: 'staffId is required' }, { status: 400 });
    }

    const staff = await prisma.staffProfile.findFirst({
      where: { id: staffId, tenantId },
    });
    if (!staff) {
      return NextResponse.json({ error: 'Staff not found' }, { status: 404 });
    }

    const record = await prisma.staffClockRecord.create({
      data: {
        tenantId,
        propertyId: await getActivePropertyId(tenantId),
        staffId,
        clockIn: new Date(),
      },
      include: {
        staff: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    return NextResponse.json(
      {
        clockRecord: {
          id: record.id,
          staffId: record.staffId,
          clockIn: record.clockIn.toISOString(),
          clockOut: record.clockOut ? record.clockOut.toISOString() : null,
          breakMinutes: record.breakMinutes,
          notes: record.notes,
          createdAt: record.createdAt.toISOString(),
          updatedAt: record.updatedAt.toISOString(),
          staff: {
            id: record.staff.id,
            department: record.staff.department,
            position: record.staff.position,
            user: record.staff.user,
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Clock POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
