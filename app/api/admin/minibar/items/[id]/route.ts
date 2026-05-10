import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existing = await prisma.minIBarItem.findFirst({
      where: { id: params.id, tenantId: session.user.tenantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const data = await request.json();
    const updates: any = {};
    if (data.name !== undefined) updates.name = String(data.name).trim();
    if (data.category !== undefined) updates.category = String(data.category).trim();
    if (data.description !== undefined) {
      updates.description = data.description ? String(data.description).trim() : null;
    }
    if (data.isFree !== undefined) updates.isFree = Boolean(data.isFree);
    if (data.price !== undefined) updates.price = Number(data.price);
    if (data.isActive !== undefined) updates.isActive = Boolean(data.isActive);

    if (updates.isFree === true) updates.price = 0;

    const item = await prisma.minIBarItem.update({
      where: { id: params.id },
      data: updates,
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error('MinIBar item PATCH error:', error);
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

    const existing = await prisma.minIBarItem.findFirst({
      where: { id: params.id, tenantId: session.user.tenantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const item = await prisma.minIBarItem.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error('MinIBar item DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
