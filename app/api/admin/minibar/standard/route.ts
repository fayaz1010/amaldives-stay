import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: { settings: true },
    });

    const settings = (tenant?.settings as Record<string, any>) ?? {};
    const standard: Array<{ itemId: string; quantity: number }> =
      settings.minibarStandard ?? [];

    return NextResponse.json({ standard });
  } catch (error) {
    console.error('minibar standard GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { standard } = await request.json();
    if (!Array.isArray(standard)) {
      return NextResponse.json({ error: 'standard must be an array' }, { status: 400 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: { settings: true },
    });
    const existing = (tenant?.settings as Record<string, any>) ?? {};

    await prisma.tenant.update({
      where: { id: session.user.tenantId },
      data: { settings: { ...existing, minibarStandard: standard } },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('minibar standard POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
