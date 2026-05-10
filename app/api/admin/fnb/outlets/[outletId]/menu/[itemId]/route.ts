import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { outletId: string; itemId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const updates: any = {};
    if (data.name !== undefined) updates.name = String(data.name).trim();
    if (data.description !== undefined) updates.description = data.description?.trim() ?? null;
    if (data.category !== undefined) updates.category = String(data.category).trim();
    if (data.price !== undefined) updates.price = Number(data.price);
    if (data.isActive !== undefined) updates.isActive = !!data.isActive;
    if (data.images !== undefined) updates.images = Array.isArray(data.images) ? data.images : [];
    if (data.allergens !== undefined) updates.allergens = Array.isArray(data.allergens) ? data.allergens : [];
    if (data.isVegetarian !== undefined) updates.isVegetarian = !!data.isVegetarian;
    if (data.isVegan !== undefined) updates.isVegan = !!data.isVegan;
    if (data.preparationTime !== undefined) {
      updates.preparationTime = data.preparationTime == null ? null : Number(data.preparationTime);
    }

    const item = await prisma.fnBMenuItem.update({
      where: {
        id: params.itemId,
        tenantId: session.user.tenantId,
        outletId: params.outletId,
      },
      data: updates,
    });

    return NextResponse.json({ item });
  } catch (error) {
    console.error('FnB Menu Item PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { outletId: string; itemId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const item = await prisma.fnBMenuItem.update({
      where: {
        id: params.itemId,
        tenantId: session.user.tenantId,
        outletId: params.outletId,
      },
      data: { isActive: false },
    });

    return NextResponse.json({ item });
  } catch (error) {
    console.error('FnB Menu Item DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
