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
    const settings = (tenant?.settings as any) ?? {};
    return NextResponse.json({ schedule: settings.housekeepingSchedule ?? {} });
  } catch (error) {
    console.error('Get HK schedule error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();

    const tenant = await prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: { settings: true },
    });
    const existing = (tenant?.settings as any) ?? {};
    const updated = { ...existing, housekeepingSchedule: body };

    await prisma.tenant.update({
      where: { id: session.user.tenantId },
      data: { settings: updated },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Save HK schedule error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
