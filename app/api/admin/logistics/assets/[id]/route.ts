import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await request.json();

    await prisma.logisticsAsset.updateMany({
      where: { id: params.id, tenantId: session.user.tenantId },
      data: {
        ...(data.name != null && { name: String(data.name).trim() }),
        ...(data.category != null && { category: String(data.category).trim() }),
        ...(data.assetTag != null && { assetTag: data.assetTag?.trim() || null }),
        ...(data.serialNumber != null && { serialNumber: data.serialNumber?.trim() || null }),
        ...(data.location != null && { location: data.location?.trim() || null }),
        ...(data.condition != null && { condition: data.condition }),
        ...(data.purchaseDate != null && { purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null }),
        ...(data.purchaseCost != null && { purchaseCost: Number(data.purchaseCost) }),
        ...(data.warrantyExpiry != null && { warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : null }),
        ...(data.notes != null && { notes: data.notes?.trim() || null }),
        ...(data.isActive != null && { isActive: Boolean(data.isActive) }),
      },
    });

    const asset = await prisma.logisticsAsset.findFirst({
      where: { id: params.id, tenantId: session.user.tenantId },
    });
    return NextResponse.json({ asset });
  } catch (error) {
    console.error('assets PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await prisma.logisticsAsset.updateMany({
      where: { id: params.id, tenantId: session.user.tenantId },
      data: { isActive: false },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('assets DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
