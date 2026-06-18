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

  const existing = await prisma.agency.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json();
  const data: Record<string, unknown> = {};
  if (body.name != null) data.name = String(body.name).trim();
  if (body.markupPercent != null) data.markupPercent = Number(body.markupPercent);
  if (body.creditTerms != null) data.creditTerms = body.creditTerms ? String(body.creditTerms).trim() : null;
  if (typeof body.isActive === 'boolean') data.isActive = body.isActive;

  const agency = await prisma.agency.update({ where: { id: params.id }, data });
  return NextResponse.json({ agency });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const existing = await prisma.agency.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.agency.update({
    where: { id: params.id },
    data: { isActive: false },
  });
  return NextResponse.json({ ok: true });
}
