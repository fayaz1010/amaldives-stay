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

    const existing = await prisma.staffTask.findFirst({
      where: { id: params.id, tenantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const data: any = {};
    if (body.status !== undefined) data.status = body.status;
    if (body.notes !== undefined) data.notes = body.notes;
    if (body.completedAt !== undefined) {
      data.completedAt = body.completedAt ? new Date(body.completedAt) : null;
    }
    if (body.status === 'COMPLETED' && body.completedAt === undefined && !existing.completedAt) {
      data.completedAt = new Date();
    }

    const updated = await prisma.staffTask.update({
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
      task: {
        id: updated.id,
        title: updated.title,
        description: updated.description,
        category: updated.category,
        priority: updated.priority,
        status: updated.status,
        staffId: updated.staffId,
        dueDate: updated.dueDate ? updated.dueDate.toISOString() : null,
        completedAt: updated.completedAt ? updated.completedAt.toISOString() : null,
        notes: updated.notes,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        staff: updated.staff
          ? {
              id: updated.staff.id,
              department: updated.staff.department,
              position: updated.staff.position,
              user: updated.staff.user,
            }
          : null,
      },
    });
  } catch (error) {
    console.error('Task PATCH error:', error);
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

    const existing = await prisma.staffTask.findFirst({
      where: { id: params.id, tenantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.staffTask.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Task DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
