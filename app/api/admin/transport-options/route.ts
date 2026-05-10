import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const options = await prisma.transportOption.findMany({
      where: {
        tenantId: session.user.tenantId,
        isActive: true,
        ...(type ? { type: type as any } : {}),
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
    return NextResponse.json({ options });
  } catch (error) {
    console.error('TransportOptions GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const data = await request.json();
    if (!data.name || !data.type) {
      return NextResponse.json({ error: 'name and type are required' }, { status: 400 });
    }
    const option = await prisma.transportOption.create({
      data: {
        tenantId: session.user.tenantId,
        type: data.type,
        name: data.name,
        operator: data.operator ?? null,
        contactName: data.contactName ?? null,
        contactPhone: data.contactPhone ?? null,
        contactEmail: data.contactEmail ?? null,
        capacity: data.capacity != null ? Number(data.capacity) : null,
        arrivalPoint: data.arrivalPoint ?? null,
        departurePoint: data.departurePoint ?? null,
        schedule: data.schedule ?? null,
        notes: data.notes ?? null,
        isActive: true,
      },
    });
    return NextResponse.json({ option }, { status: 201 });
  } catch (error) {
    console.error('TransportOptions POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
