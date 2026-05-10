import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
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

    const existing = await prisma.staffClockRecord.findFirst({
      where: { id: params.id, tenantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const data: any = {};
    if ('clockOut' in body) {
      data.clockOut = body.clockOut ? new Date(body.clockOut) : new Date();
    }
    if (body.breakMinutes !== undefined) {
      data.breakMinutes =
        body.breakMinutes === null || body.breakMinutes === '' ? null : Number(body.breakMinutes);
    }
    if (body.notes !== undefined) data.notes = body.notes;

    const updated = await prisma.staffClockRecord.update({
      where: { id: params.id },
      data,
      include: {
        staff: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    return NextResponse.json({
      clockRecord: {
        id: updated.id,
        staffId: updated.staffId,
        clockIn: updated.clockIn.toISOString(),
        clockOut: updated.clockOut ? updated.clockOut.toISOString() : null,
        breakMinutes: updated.breakMinutes,
        notes: updated.notes,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        staff: {
          id: updated.staff.id,
          department: updated.staff.department,
          position: updated.staff.position,
          user: updated.staff.user,
        },
      },
    });
  } catch (error) {
    console.error('Clock PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
