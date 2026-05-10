import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { MinIBarStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

const VALID_STATUSES: MinIBarStatus[] = ['PENDING', 'ON_BILL', 'PAID', 'WAIVED'];

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existing = await prisma.minIBarUsage.findFirst({
      where: { id: params.id, tenantId: session.user.tenantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Usage not found' }, { status: 404 });
    }

    const data = await request.json();
    const updates: any = {};

    if (data.status !== undefined) {
      if (!VALID_STATUSES.includes(data.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updates.status = data.status as MinIBarStatus;
    }
    if (data.notes !== undefined) {
      updates.notes = data.notes ? String(data.notes).trim() : null;
    }

    const usage = await prisma.minIBarUsage.update({
      where: { id: params.id },
      data: updates,
      include: {
        item: { select: { id: true, name: true, price: true, category: true, isFree: true } },
        room: { select: { id: true, number: true, name: true } },
      },
    });

    return NextResponse.json(usage);
  } catch (error) {
    console.error('MinIBar usage PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existing = await prisma.minIBarUsage.findFirst({
      where: { id: params.id, tenantId: session.user.tenantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Usage not found' }, { status: 404 });
    }

    await prisma.minIBarUsage.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('MinIBar usage DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
