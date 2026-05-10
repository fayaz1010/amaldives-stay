
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [
      totalTenants,
      activeTenants,
      totalUsers,
      totalBookings,
      totalRevenue,
      recentTenants,
    ] = await Promise.all([
      prisma.tenant.count(),
      prisma.tenant.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count(),
      prisma.booking.count(),
      prisma.booking.aggregate({
        _sum: { totalAmount: true },
        where: { status: 'CHECKED_OUT' },
      }),
      prisma.tenant.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              users: true,
              properties: true,
              bookings: true,
            },
          },
        },
      }),
    ]);

    const stats = {
      totalTenants,
      activeTenants,
      totalUsers,
      totalBookings,
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      systemHealth: {
        uptime: 99.9,
        responseTime: 120,
        errorRate: 0.1,
      },
    };

    return NextResponse.json({
      stats,
      recentTenants,
    });
  } catch (error) {
    console.error('Super admin stats API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
