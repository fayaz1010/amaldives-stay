import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { GUEST_EXTRA_CATEGORIES } from '@/lib/guest-extras';

export const dynamic = 'force-dynamic';

const EXTRA_CATEGORIES = [...GUEST_EXTRA_CATEGORIES];

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existing = await prisma.service.findFirst({
      where: { id: params.id, tenantId: session.user.tenantId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const data = await request.json();
    const updates: Record<string, unknown> = {};

    if (data.name !== undefined) updates.name = String(data.name).trim();
    if (data.description !== undefined) updates.description = data.description;
    if (data.category !== undefined) {
      if (!EXTRA_CATEGORIES.includes(data.category)) {
        return NextResponse.json(
          { error: `category must be one of: ${EXTRA_CATEGORIES.join(', ')}` },
          { status: 400 }
        );
      }
      updates.category = data.category;
    }
    if (data.price !== undefined) updates.price = Number(data.price);
    if (data.duration !== undefined) {
      updates.duration = data.duration != null ? Number(data.duration) : null;
    }
    if (data.isActive !== undefined) updates.isActive = Boolean(data.isActive);

    const service = await prisma.service.update({
      where: { id: params.id },
      data: updates,
    });

    return NextResponse.json(service);
  } catch (error) {
    console.error('Extra service PATCH error:', error);
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

    const existing = await prisma.service.findFirst({
      where: { id: params.id, tenantId: session.user.tenantId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const service = await prisma.service.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json(service);
  } catch (error) {
    console.error('Extra service DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
