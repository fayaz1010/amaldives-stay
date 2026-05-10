import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!session.user || !session.user.tenantId) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 403 });
    }

    const tenantId = session.user.tenantId;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const staffProfile = await prisma.staffProfile.findFirst({
      where: { id: params.id, tenantId },
      include: {
        user: true,
        clockRecords: {
          where: { clockIn: { gte: thirtyDaysAgo } },
          orderBy: { clockIn: 'desc' },
        },
        tasks: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!staffProfile) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const serialized = {
      ...staffProfile,
      hireDate: staffProfile.hireDate.toISOString(),
      createdAt: staffProfile.createdAt.toISOString(),
      updatedAt: staffProfile.updatedAt.toISOString(),
      user: {
        id: staffProfile.user.id,
        name: staffProfile.user.name,
        email: staffProfile.user.email,
        role: staffProfile.user.role,
        isActive: staffProfile.user.isActive,
      },
      clockRecords: staffProfile.clockRecords.map((c) => ({
        ...c,
        clockIn: c.clockIn.toISOString(),
        clockOut: c.clockOut ? c.clockOut.toISOString() : null,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
      tasks: staffProfile.tasks.map((t) => ({
        ...t,
        dueDate: t.dueDate ? t.dueDate.toISOString() : null,
        completedAt: t.completedAt ? t.completedAt.toISOString() : null,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
    };

    return NextResponse.json({ staffProfile: serialized });
  } catch (error) {
    console.error('Staff GET[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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

    const existing = await prisma.staffProfile.findFirst({
      where: { id: params.id, tenantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const data: any = {};
    if (body.department !== undefined) data.department = body.department;
    if (body.position !== undefined) data.position = body.position;
    if (body.employeeId !== undefined) data.employeeId = body.employeeId;
    if (body.salary !== undefined)
      data.salary = body.salary === null || body.salary === '' ? null : Number(body.salary);
    if (body.hireDate !== undefined) data.hireDate = new Date(body.hireDate);
    if (body.isActive !== undefined) data.isActive = body.isActive;

    const updated = await prisma.staffProfile.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json({
      staffProfile: {
        ...updated,
        hireDate: updated.hireDate.toISOString(),
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Staff PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!session.user || !session.user.tenantId) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 403 });
    }

    const tenantId = session.user.tenantId;

    const existing = await prisma.staffProfile.findFirst({
      where: { id: params.id, tenantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.staffProfile.update({
        where: { id: existing.id },
        data: { isActive: false },
      }),
      prisma.user.update({
        where: { id: existing.userId },
        data: { isActive: false },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Staff DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
