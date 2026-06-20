import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Only these Room fields may be set via the admin edit forms.
const EDITABLE_FIELDS = [
  'number',
  'name',
  'type',
  'description',
  'capacity',
  'basePrice',
  'rackRate',
  'images',
  'amenities',
  'size',
  'bedType',
  'status',
] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const raw = await request.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  for (const key of EDITABLE_FIELDS) {
    if (raw[key] !== undefined) data[key] = raw[key];
  }
  if (typeof data.number === 'string') data.number = data.number.trim();

  try {
    const room = await prisma.room.update({
      where: { id: params.id, tenantId: session.user.tenantId },
      data,
    });
    return NextResponse.json({ room });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      // Duplicate room number within the same property
      if (err.code === 'P2002') {
        return NextResponse.json(
          { error: `Room number "${data.number ?? ''}" already exists. Pick a different number.` },
          { status: 409 }
        );
      }
      // Record not found / not in this tenant
      if (err.code === 'P2025') {
        return NextResponse.json({ error: 'Room not found.' }, { status: 404 });
      }
    }
    console.error('PATCH /api/admin/rooms/[id] failed:', err);
    return NextResponse.json({ error: 'Failed to update room.' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await prisma.room.delete({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  return NextResponse.json({ ok: true });
}
