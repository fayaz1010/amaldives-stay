
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { SuperAdminDashboard } from '@/components/super-admin/super-admin-dashboard';

export default async function SuperAdminPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/auth/signin');
  }
  
  if (!session.user || session.user.role !== 'SUPER_ADMIN') {
    redirect('/unauthorized');
  }

  const [tenantsData, systemStats] = await Promise.all([
    prisma.tenant.findMany({
      include: {
        _count: {
          select: {
            users: true,
            properties: true,
            bookings: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.tenant.aggregate({
      _count: true,
    }),
  ]);

  const totalUsers = await prisma.user.count();
  const totalBookings = await prisma.booking.count();
  const totalRevenue = await prisma.booking.aggregate({
    _sum: { totalAmount: true },
  });
  const platformRevenue = await prisma.booking.aggregate({
    _sum: { platformFee: true },
    where: { status: { in: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'] } }
  });

  const stats = {
    totalTenants: systemStats._count,
    activeTenants: tenantsData.filter(t => t.status === 'ACTIVE').length,
    totalUsers,
    totalBookings,
    totalRevenue: totalRevenue._sum.totalAmount || 0,
    totalPlatformRevenue: platformRevenue._sum.platformFee ?? 0,
    systemHealth: {
      uptime: 99.9,
      responseTime: 120,
      errorRate: 0.1,
    },
  };

  return (
    <SuperAdminDashboard
      stats={stats}
      tenants={tenantsData}
      user={session.user}
    />
  );
}
