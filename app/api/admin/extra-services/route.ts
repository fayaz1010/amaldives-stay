import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const EXTRA_CATEGORIES = [
  'EXCURSION',
  'DIVING',
  'SNORKELLING',
  'PICNIC',
  'FISHING',
  'RENTAL',
];

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const services = await prisma.service.findMany({
      where: {
        tenantId: session.user.tenantId,
        category: { in: EXTRA_CATEGORIES },
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json(services);
  } catch (error) {
    console.error('Extra services GET error:', error);
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
    const { name, category, price, description, duration, isRental } = data;

    if (!name?.trim() || !category || price === undefined || price === null) {
      return NextResponse.json(
        { error: 'name, category, and price are required' },
        { status: 400 }
      );
    }

    if (!EXTRA_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `category must be one of: ${EXTRA_CATEGORIES.join(', ')}` },
        { status: 400 }
      );
    }

    const service = await prisma.service.create({
      data: {
        tenantId: session.user.tenantId,
        name: name.trim(),
        category,
        price: Number(price),
        description: description ?? null,
        duration: duration != null ? Number(duration) : null,
        isActive: true,
        images: [],
      },
    });

    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    console.error('Extra services POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
