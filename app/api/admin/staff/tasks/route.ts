import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getActivePropertyId } from '@/lib/active-property';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!session.user || !session.user.tenantId) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 403 });
    }

    const tenantId = session.user.tenantId;
    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get('staffId');
    const status = searchParams.get('status');
    const date = searchParams.get('date');

    const activePropertyId = await getActivePropertyId(tenantId);
    const where: any = { tenantId };
    if (activePropertyId) where.propertyId = activePropertyId;
    if (staffId) where.staffId = staffId;
    if (status) where.status = status;
    if (date) {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      where.dueDate = { gte: dayStart, lte: dayEnd };
    }

    const tasks = await prisma.staffTask.findMany({
      where,
      include: {
        staff: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const serialized = tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      category: t.category,
      priority: t.priority,
      status: t.status,
      staffId: t.staffId,
      dueDate: t.dueDate ? t.dueDate.toISOString() : null,
      completedAt: t.completedAt ? t.completedAt.toISOString() : null,
      notes: t.notes,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      staff: t.staff
        ? {
            id: t.staff.id,
            department: t.staff.department,
            position: t.staff.position,
            user: t.staff.user,
          }
        : null,
    }));

    return NextResponse.json({ tasks: serialized });
  } catch (error) {
    console.error('Tasks GET error:', error);
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
    const { staffId, title, description, category, priority, dueDate } = body || {};

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const created = await prisma.staffTask.create({
      data: {
        tenantId,
        propertyId: await getActivePropertyId(tenantId),
        staffId: staffId || null,
        title,
        description: description || null,
        category: category || null,
        priority: priority || 'MEDIUM',
        dueDate: dueDate ? new Date(dueDate) : null,
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
        task: {
          id: created.id,
          title: created.title,
          description: created.description,
          category: created.category,
          priority: created.priority,
          status: created.status,
          staffId: created.staffId,
          dueDate: created.dueDate ? created.dueDate.toISOString() : null,
          completedAt: created.completedAt ? created.completedAt.toISOString() : null,
          notes: created.notes,
          createdAt: created.createdAt.toISOString(),
          updatedAt: created.updatedAt.toISOString(),
          staff: created.staff
            ? {
                id: created.staff.id,
                department: created.staff.department,
                position: created.staff.position,
                user: created.staff.user,
              }
            : null,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Tasks POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
