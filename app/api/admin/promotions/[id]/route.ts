import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const existing = await prisma.promotion.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json();
  const data: Record<string, unknown> = {};
  if (body.name != null) data.name = String(body.name).trim();
  if (body.description != null) data.description = body.description ? String(body.description).trim() : null;
  if (body.code != null) data.code = body.code ? String(body.code).trim() : null;
  if (body.discountPercent != null) data.discountPercent = Number(body.discountPercent);
  if (body.startDate != null) data.startDate = new Date(body.startDate);
  if (body.endDate != null) data.endDate = new Date(body.endDate);
  if (typeof body.isActive === 'boolean') data.isActive = body.isActive;
  if (body.appliesTo === 'ALL' || body.appliesTo === 'RACK') data.appliesTo = body.appliesTo;

  const promotion = await prisma.promotion.update({
    where: { id: params.id },
    data,
  });

  return NextResponse.json({ promotion });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const existing = await prisma.promotion.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.promotion.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
