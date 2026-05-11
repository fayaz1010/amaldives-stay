import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const tenantId = session.user.tenantId;
    const url = new URL(request.url);
    const period = url.searchParams.get('period'); // "2026-05"

    const entries = await prisma.payrollEntry.findMany({
      where: {
        tenantId,
        ...(period ? { period } : {}),
      },
      include: {
        staff: {
          select: {
            id: true,
            department: true,
            position: true,
            employeeId: true,
            user: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: [{ period: 'desc' }, { staff: { department: 'asc' } }],
    });

    return NextResponse.json({ entries });
  } catch (error) {
    console.error('Payroll GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
