import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const updates: any = {};

    if (data.status !== undefined) {
      updates.status = data.status;
      if (data.status === 'COMPLETED') {
        updates.completedAt = new Date();
      }
    }
    if (data.notes !== undefined) updates.notes = data.notes;
    if (data.quantity !== undefined) updates.quantity = data.quantity;

    const order = await prisma.serviceOrder.update({
      where: { id: params.id, tenantId: session.user.tenantId },
      data: updates,
      include: {
        service: { select: { name: true, category: true } },
        booking: {
          select: {
            id: true,
            room: { select: { number: true } },
          },
        },
        guest: { select: { name: true } },
      },
    });

    return NextResponse.json({ order });
  } catch (error) {
    console.error('Room service PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
