import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const booking = await prisma.booking.findFirst({
      where: { id: params.id, tenantId: session.user.tenantId },
      include: {
        guest: { select: { id: true, name: true, email: true } },
        room: {
          select: {
            id: true, number: true, name: true, type: true, basePrice: true,
            property: {
              select: {
                id: true, name: true, address: true, city: true, country: true,
                phone: true, email: true, website: true, currency: true,
              },
            },
          },
        },
        serviceOrders: {
          where: { status: { not: 'CANCELLED' } },
          include: { service: { select: { name: true, category: true } } },
          orderBy: { createdAt: 'asc' },
        },
        payments: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    return NextResponse.json({ booking });
  } catch (error) {
    console.error('Bill GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
