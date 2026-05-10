import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { TenantDb, prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const ALLOWED_ROLES = ['TENANT_ADMIN', 'MANAGER', 'FRONT_DESK'];
const VALID_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'CHECKED_IN',
  'CHECKED_OUT',
  'CANCELLED',
  'NO_SHOW',
] as const;

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantDb = new TenantDb(session.user.tenantId);
    const booking = await tenantDb.getBookingById(params.id);
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }
    return NextResponse.json({ booking });
  } catch (error) {
    console.error('Get booking API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const tenantId = session.user.tenantId;
    const body = await request.json();

    const existing = await prisma.booking.findFirst({
      where: { id: params.id, tenantId },
      select: { id: true, status: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const updates: Record<string, any> = {};

    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
          { status: 400 }
        );
      }
      updates.status = body.status;
    }

    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.specialRequests !== undefined) updates.specialRequests = body.specialRequests;
    if (body.paidAmount !== undefined) updates.paidAmount = body.paidAmount;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.update({
      where: { id: params.id },
      data: updates,
      include: {
        guest: { include: { guestProfile: true } },
        room: { include: { property: true } },
      },
    });

    return NextResponse.json({ booking });
  } catch (error: any) {
    console.error('Update booking API error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
