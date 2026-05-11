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

  const body = await request.json();
  const data: Record<string, unknown> = {};

  if (typeof body.name === 'string') data.name = body.name;
  if (body.description !== undefined) data.description = body.description;
  if (body.startDate) {
    const d = new Date(body.startDate);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: 'Invalid startDate' }, { status: 400 });
    }
    data.startDate = d;
  }
  if (body.endDate) {
    const d = new Date(body.endDate);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: 'Invalid endDate' }, { status: 400 });
    }
    data.endDate = d;
  }
  if (typeof body.multiplier === 'number') data.multiplier = body.multiplier;
  if (typeof body.minStay === 'number') data.minStay = body.minStay;
  if (typeof body.isActive === 'boolean') data.isActive = body.isActive;

  const existing = await prisma.ratePlan.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Rate plan not found' }, { status: 404 });
  }

  const ratePlan = await prisma.ratePlan.update({
    where: { id: params.id },
    data,
  });

  return NextResponse.json({ ratePlan });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const existing = await prisma.ratePlan.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Rate plan not found' }, { status: 404 });
  }

  await prisma.ratePlan.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
