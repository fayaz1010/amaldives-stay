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
    const data = await request.json();
    const updates: any = {};
    if (data.name !== undefined) updates.name = data.name.trim();
    if (data.description !== undefined) updates.description = data.description?.trim() ?? null;
    if (data.category !== undefined) updates.category = data.category.trim();
    if (data.price !== undefined) updates.price = Number(data.price);
    if (data.isActive !== undefined) updates.isActive = data.isActive;

    const item = await prisma.service.update({
      where: { id: params.id, tenantId: session.user.tenantId },
      data: updates,
    });
    return NextResponse.json({ item });
  } catch (error) {
    console.error('Menu PATCH error:', error);
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
    await prisma.service.delete({
      where: { id: params.id, tenantId: session.user.tenantId },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Menu DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
