
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { TenantDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user || !session.user.tenantId) {
      return NextResponse.json({ error: 'No tenant associated' }, { status: 403 });
    }

    const tenantDb = new TenantDb(session.user.tenantId);
    
    const [stats, recentBookings, housekeepingTasks, revenueData] = await Promise.all([
      tenantDb.getDashboardStats(),
      tenantDb.getBookings({ limit: 5 }),
      tenantDb.getHousekeepingTasks({ 
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        limit: 5 
      }),
      tenantDb.getRevenueData(30),
    ]);

    return NextResponse.json({
      stats,
      recentBookings,
      housekeepingTasks,
      revenueData,
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
