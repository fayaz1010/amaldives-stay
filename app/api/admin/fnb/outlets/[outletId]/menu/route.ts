import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { outletId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const showAll = url.searchParams.get('all') === '1';

    const outlet = await prisma.fnBOutlet.findFirst({
      where: { id: params.outletId, tenantId: session.user.tenantId },
      select: { id: true },
    });
    if (!outlet) {
      return NextResponse.json({ error: 'Outlet not found' }, { status: 404 });
    }

    const items = await prisma.fnBMenuItem.findMany({
      where: {
        tenantId: session.user.tenantId,
        outletId: params.outletId,
        ...(showAll ? {} : { isActive: true }),
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error('FnB Menu GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { outletId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const outlet = await prisma.fnBOutlet.findFirst({
      where: { id: params.outletId, tenantId: session.user.tenantId },
      select: { id: true },
    });
    if (!outlet) {
      return NextResponse.json({ error: 'Outlet not found' }, { status: 404 });
    }

    const data = await request.json();
    if (!data.name?.trim() || !data.category?.trim() || data.price == null) {
      return NextResponse.json({ error: 'name, category and price are required' }, { status: 400 });
    }

    const item = await prisma.fnBMenuItem.create({
      data: {
        tenantId: session.user.tenantId,
        outletId: params.outletId,
        name: data.name.trim(),
        description: data.description?.trim() ?? null,
        category: data.category.trim(),
        price: Number(data.price),
        isActive: true,
        images: Array.isArray(data.images) ? data.images : [],
        allergens: Array.isArray(data.allergens) ? data.allergens : [],
        isVegetarian: !!data.isVegetarian,
        isVegan: !!data.isVegan,
        preparationTime: data.preparationTime != null ? Number(data.preparationTime) : null,
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error('FnB Menu POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
