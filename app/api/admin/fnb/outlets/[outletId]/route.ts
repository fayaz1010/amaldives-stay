import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const VALID_TYPES = ['RESTAURANT', 'BAR', 'CAFE', 'BEACH_BAR', 'ROOM_SERVICE_OUTLET'] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: { outletId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const updates: any = {};
    if (data.name !== undefined) updates.name = String(data.name).trim();
    if (data.description !== undefined) updates.description = data.description?.trim() ?? null;
    if (data.location !== undefined) updates.location = data.location?.trim() ?? null;
    if (data.outletType !== undefined && VALID_TYPES.includes(data.outletType)) {
      updates.outletType = data.outletType;
    }
    if (data.isActive !== undefined) updates.isActive = !!data.isActive;
    if (data.settings !== undefined) updates.settings = data.settings;

    const outlet = await prisma.fnBOutlet.update({
      where: { id: params.outletId, tenantId: session.user.tenantId },
      data: updates,
    });

    return NextResponse.json({ outlet });
  } catch (error) {
    console.error('FnB Outlet PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { outletId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const outlet = await prisma.fnBOutlet.update({
      where: { id: params.outletId, tenantId: session.user.tenantId },
      data: { isActive: false },
    });

    return NextResponse.json({ outlet });
  } catch (error) {
    console.error('FnB Outlet DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
