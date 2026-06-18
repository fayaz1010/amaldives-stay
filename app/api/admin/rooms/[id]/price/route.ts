import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { basePrice, rackRate } = await request.json();
  const data: { basePrice?: number; rackRate?: number | null } = {};

  if (basePrice != null) {
    if (typeof basePrice !== 'number' || !Number.isFinite(basePrice) || basePrice < 0) {
      return NextResponse.json(
        { error: 'basePrice must be a non-negative number' },
        { status: 400 },
      );
    }
    data.basePrice = basePrice;
  }
  if (rackRate !== undefined) {
    if (rackRate != null && (typeof rackRate !== 'number' || !Number.isFinite(rackRate) || rackRate < 0)) {
      return NextResponse.json(
        { error: 'rackRate must be a non-negative number or null' },
        { status: 400 },
      );
    }
    data.rackRate = rackRate;
  }

  if (!data.basePrice && data.rackRate === undefined) {
    return NextResponse.json({ error: 'basePrice or rackRate required' }, { status: 400 });
  }

  const tenantId = session.user.tenantId;
  const room = await prisma.room.findFirst({
    where: { id: params.id, tenantId },
    select: { type: true },
  });

  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  const result = await prisma.room.updateMany({
    where: { tenantId, type: room.type },
    data,
  });

  return NextResponse.json({
    updated: result.count,
    basePrice: data.basePrice,
    rackRate: data.rackRate,
    type: room.type,
  });
}
