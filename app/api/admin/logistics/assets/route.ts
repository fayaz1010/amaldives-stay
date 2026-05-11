import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const condition = searchParams.get('condition');
    const category = searchParams.get('category');

    const assets = await prisma.logisticsAsset.findMany({
      where: {
        tenantId: session.user.tenantId,
        isActive: true,
        ...(condition && { condition: condition as any }),
        ...(category && { category }),
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json({ assets });
  } catch (error) {
    console.error('assets GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await request.json();
    if (!data.name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 });

    const asset = await prisma.logisticsAsset.create({
      data: {
        tenantId: session.user.tenantId,
        name: data.name.trim(),
        category: data.category?.trim() || 'equipment',
        assetTag: data.assetTag?.trim() || null,
        serialNumber: data.serialNumber?.trim() || null,
        location: data.location?.trim() || null,
        condition: data.condition || 'GOOD',
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        purchaseCost: data.purchaseCost != null ? Number(data.purchaseCost) : null,
        warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : null,
        notes: data.notes?.trim() || null,
      },
    });

    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    console.error('assets POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
