import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const ALLOWED_ROLES = ['TENANT_ADMIN', 'MANAGER', 'FRONT_DESK'];

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = session.user.tenantId;

    const user = await prisma.user.findFirst({
      where: {
        id: params.id,
        OR: [
          { tenantId },
          { bookings: { some: { tenantId } } },
        ],
      },
      include: {
        guestProfile: true,
        bookings: {
          where: { tenantId },
          include: {
            room: true,
            payments: true,
            serviceOrders: { include: { service: true, room: true } },
            arrival: true,
            departure: true,
          },
          orderBy: { checkInDate: 'desc' },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Guest not found' }, { status: 404 });
    }

    const minIBarUsages = await prisma.minIBarUsage.findMany({
      where: { tenantId, booking: { guestId: params.id } },
      include: {
        item: true,
        room: true,
        booking: { select: { confirmationNumber: true } },
      },
      orderBy: { recordedAt: 'desc' },
    });

    const guest = JSON.parse(JSON.stringify({ ...user, minIBarUsages }));
    return NextResponse.json({ guest });
  } catch (error) {
    console.error('Get guest API error:', error);
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

    const existing = await prisma.user.findFirst({
      where: {
        id: params.id,
        OR: [
          { tenantId },
          { bookings: { some: { tenantId } } },
        ],
      },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Guest not found' }, { status: 404 });
    }

    const body = await request.json();
    const updates: Record<string, any> = {};

    if (body.firstName !== undefined) updates.firstName = body.firstName;
    if (body.lastName !== undefined) updates.lastName = body.lastName;
    if (body.phone !== undefined) updates.phone = body.phone || null;
    if (body.nationality !== undefined) updates.nationality = body.nationality || null;
    if (body.dateOfBirth !== undefined) {
      updates.dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null;
    }
    if (body.address !== undefined) updates.address = body.address || null;
    if (body.city !== undefined) updates.city = body.city || null;
    if (body.country !== undefined) updates.country = body.country || null;
    if (body.preferences !== undefined) updates.preferences = body.preferences;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const profile = await prisma.guestProfile.upsert({
      where: { userId: params.id },
      create: {
        userId: params.id,
        firstName: updates.firstName || '',
        lastName: updates.lastName || '',
        ...updates,
      },
      update: updates,
    });

    return NextResponse.json({ profile: JSON.parse(JSON.stringify(profile)) });
  } catch (error: any) {
    console.error('Update guest API error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
