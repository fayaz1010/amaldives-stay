import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getActivePropertyId } from '@/lib/active-property';
import { getSharing, categoryWhere, categoryCreatePropertyId } from '@/lib/property-sharing';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('all') === '1';

    const [sharing, activePropertyId] = await Promise.all([
      getSharing(session.user.tenantId),
      getActivePropertyId(session.user.tenantId),
    ]);
    const items = await prisma.minIBarItem.findMany({
      where: {
        tenantId: session.user.tenantId,
        ...categoryWhere('minibar', sharing, activePropertyId),
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error('MinIBar items GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    if (!data.name?.trim() || !data.category?.trim()) {
      return NextResponse.json(
        { error: 'name and category are required' },
        { status: 400 }
      );
    }

    const isFree = Boolean(data.isFree);
    const price = isFree ? 0 : Number(data.price ?? 0);

    const [sharing, activePropertyId] = await Promise.all([
      getSharing(session.user.tenantId),
      getActivePropertyId(session.user.tenantId),
    ]);
    const item = await prisma.minIBarItem.create({
      data: {
        tenantId: session.user.tenantId,
        propertyId: categoryCreatePropertyId('minibar', sharing, activePropertyId),
        name: data.name.trim(),
        category: data.category.trim(),
        isFree,
        price,
        description: data.description?.trim() || null,
        isActive: data.isActive !== false,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('MinIBar items POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
