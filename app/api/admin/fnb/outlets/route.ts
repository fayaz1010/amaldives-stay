import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const VALID_TYPES = ['RESTAURANT', 'BAR', 'CAFE', 'BEACH_BAR', 'ROOM_SERVICE_OUTLET'] as const;

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const outlets = await prisma.fnBOutlet.findMany({
      where: { tenantId: session.user.tenantId },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      include: {
        _count: {
          select: { menuItems: true, reservations: true, bills: true },
        },
      },
    });

    return NextResponse.json({ outlets });
  } catch (error) {
    console.error('FnB Outlets GET error:', error);
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
    if (!data.name?.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    const outletType = data.outletType && VALID_TYPES.includes(data.outletType)
      ? data.outletType
      : 'RESTAURANT';

    const outlet = await prisma.fnBOutlet.create({
      data: {
        tenantId: session.user.tenantId,
        name: data.name.trim(),
        description: data.description?.trim() ?? null,
        outletType,
        location: data.location?.trim() ?? null,
        isActive: true,
      },
    });

    return NextResponse.json({ outlet }, { status: 201 });
  } catch (error) {
    console.error('FnB Outlets POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
