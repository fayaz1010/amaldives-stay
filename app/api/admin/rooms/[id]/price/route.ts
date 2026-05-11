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

  const { basePrice } = await request.json();
  if (typeof basePrice !== 'number' || !Number.isFinite(basePrice) || basePrice < 0) {
    return NextResponse.json(
      { error: 'basePrice must be a non-negative number' },
      { status: 400 }
    );
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
    data: { basePrice },
  });

  return NextResponse.json({ updated: result.count, basePrice, type: room.type });
}
