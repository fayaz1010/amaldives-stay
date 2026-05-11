import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const booking = await prisma.booking.findUnique({
      where: { guestToken: params.token },
      include: {
        room: { select: { id: true, number: true, name: true, type: true, basePrice: true } },
        property: { select: { name: true, currency: true } },
        guest: {
          select: {
            name: true,
            email: true,
            guestProfile: { select: { firstName: true, lastName: true } },
          },
        },
        payments: {
          select: { id: true, amount: true, status: true, method: true, processedAt: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
        serviceOrders: {
          include: { service: { select: { name: true, category: true, price: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    return NextResponse.json({ booking: JSON.parse(JSON.stringify(booking)) });
  } catch (error: any) {
    console.error('Guest portal info error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
