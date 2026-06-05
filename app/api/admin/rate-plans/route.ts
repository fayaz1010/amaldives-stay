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
  const ratePlans = await prisma.ratePlan.findMany({
    where: { tenantId: session.user.tenantId, ...categoryWhere('ratePlans', sharing, activePropertyId) },
    orderBy: { startDate: 'asc' },
  });

  return NextResponse.json({ ratePlans });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { name, description, startDate, endDate, multiplier, minStay, isActive } = body;

  if (!name || !startDate || !endDate) {
    return NextResponse.json(
      { error: 'name, startDate, and endDate are required' },
      { status: 400 }
    );
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
  }
  if (end < start) {
    return NextResponse.json(
      { error: 'endDate must be on or after startDate' },
      { status: 400 }
    );
  }

  const [sharing, activePropertyId] = await Promise.all([
    getSharing(session.user.tenantId),
    getActivePropertyId(session.user.tenantId),
  ]);
  const ratePlan = await prisma.ratePlan.create({
    data: {
      tenantId: session.user.tenantId,
      propertyId: categoryCreatePropertyId('ratePlans', sharing, activePropertyId),
      name,
      description: description ?? null,
      startDate: start,
      endDate: end,
      multiplier: typeof multiplier === 'number' ? multiplier : 1.0,
      minStay: typeof minStay === 'number' ? minStay : 1,
      isActive: typeof isActive === 'boolean' ? isActive : true,
    },
  });

  return NextResponse.json({ ratePlan }, { status: 201 });
}
