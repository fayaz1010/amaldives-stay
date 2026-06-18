import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getActivePropertyId } from '@/lib/active-property';
import { getSharing, categoryWhere, categoryCreatePropertyId } from '@/lib/property-sharing';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [sharing, activePropertyId] = await Promise.all([
    getSharing(session.user.tenantId),
    getActivePropertyId(session.user.tenantId),
  ]);

  const promotions = await prisma.promotion.findMany({
    where: {
      tenantId: session.user.tenantId,
      ...categoryWhere('promotions', sharing, activePropertyId),
    },
    orderBy: { startDate: 'asc' },
  });

  return NextResponse.json({ promotions });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const {
    name,
    description,
    code,
    discountPercent,
    startDate,
    endDate,
    isActive,
    appliesTo,
  } = body;

  if (!name || !startDate || !endDate || discountPercent == null) {
    return NextResponse.json(
      { error: 'name, startDate, endDate, and discountPercent are required' },
      { status: 400 },
    );
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
  }

  const [sharing, activePropertyId] = await Promise.all([
    getSharing(session.user.tenantId),
    getActivePropertyId(session.user.tenantId),
  ]);

  const promotion = await prisma.promotion.create({
    data: {
      tenantId: session.user.tenantId,
      propertyId: categoryCreatePropertyId('promotions', sharing, activePropertyId),
      name: String(name).trim(),
      description: description ? String(description).trim() : null,
      code: code ? String(code).trim() : null,
      discountPercent: Number(discountPercent),
      startDate: start,
      endDate: end,
      isActive: typeof isActive === 'boolean' ? isActive : true,
      appliesTo: appliesTo === 'ALL' ? 'ALL' : 'RACK',
    },
  });

  return NextResponse.json({ promotion }, { status: 201 });
}
