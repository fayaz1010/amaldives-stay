import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import crypto from 'crypto';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = session.user.tenantId;

    const booking = await prisma.booking.findFirst({
      where: { id: params.id, tenantId },
      select: { id: true, guestToken: true },
    });
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const token = booking.guestToken ?? crypto.randomUUID().replace(/-/g, '');

    if (!booking.guestToken) {
      await prisma.booking.update({
        where: { id: params.id },
        data: { guestToken: token },
      });
    }

    return NextResponse.json({ token, url: `/guest/${token}` });
  } catch (error: any) {
    console.error('Generate guest token error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
