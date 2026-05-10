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
    const fields = [
      'type', 'name', 'operator', 'contactName', 'contactPhone', 'contactEmail',
      'arrivalPoint', 'departurePoint', 'schedule', 'notes', 'isActive',
    ];
    const updates: any = {};
    for (const f of fields) {
      if (data[f] !== undefined) updates[f] = data[f];
    }
    if (data.capacity !== undefined) {
      updates.capacity = data.capacity != null ? Number(data.capacity) : null;
    }
    const option = await prisma.transportOption.update({
      where: { id: params.id, tenantId: session.user.tenantId },
      data: updates,
    });
    return NextResponse.json({ option });
  } catch (error) {
    console.error('TransportOptions PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Soft delete — keeps historical arrival links intact
    await prisma.transportOption.update({
      where: { id: params.id, tenantId: session.user.tenantId },
      data: { isActive: false },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('TransportOptions DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
