import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getActivePropertyId } from '@/lib/active-property';
import { getSharing, categoryWhere, categoryCreatePropertyId } from '@/lib/property-sharing';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const [sharing, activePropertyId] = await Promise.all([
      getSharing(session.user.tenantId),
      getActivePropertyId(session.user.tenantId),
    ]);
    const items = await prisma.service.findMany({
      where: {
        tenantId: session.user.tenantId,
        ...categoryWhere('services', sharing, activePropertyId),
        NOT: { name: 'Room Service Request' }, // exclude internal default
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    return NextResponse.json({ items });
  } catch (error) {
    console.error('Menu GET error:', error);
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
    if (!data.name?.trim() || !data.category?.trim() || data.price == null) {
      return NextResponse.json({ error: 'name, category and price are required' }, { status: 400 });
    }
    const [sharing, activePropertyId] = await Promise.all([
      getSharing(session.user.tenantId),
      getActivePropertyId(session.user.tenantId),
    ]);
    const item = await prisma.service.create({
      data: {
        tenantId: session.user.tenantId,
        propertyId: categoryCreatePropertyId('services', sharing, activePropertyId),
        name: data.name.trim(),
        description: data.description?.trim() ?? null,
        category: data.category.trim(),
        price: Number(data.price),
        isActive: data.isActive !== false,
        images: [],
      },
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error('Menu POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
