import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { TenantDb } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function ReportsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect('/auth/signin');

  const db = new TenantDb(session.user.tenantId);
  const [stats, rooms, bookings] = await Promise.all([
    db.getDashboardStats(),
    db.getRooms({}),
    db.getBookings({}),
  ]);

  const totalRevenue = bookings.reduce((s: number, b: any) => s + (b.totalAmount || 0), 0);
  const platformFees = bookings.reduce((s: number, b: any) => s + (b.platformFee || 0), 0);
  const netRevenue = totalRevenue - platformFees;

  const roomTypeBreakdown = rooms.reduce((acc: Record<string, number>, r: any) => {
    acc[r.type] = (acc[r.type] || 0) + 1;
    return acc;
  }, {});

  const bookingsByStatus = bookings.reduce((acc: Record<string, number>, b: any) => {
    acc[b.status] = (acc[b.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Reports & Analytics</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Total Revenue</p>
            <p className="text-2xl font-bold text-cyan-700">${totalRevenue.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Net (after 4% fee)</p>
            <p className="text-2xl font-bold text-green-700">${netRevenue.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Occupancy Rate</p>
            <p className="text-2xl font-bold">{stats.occupancyRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Total Bookings</p>
            <p className="text-2xl font-bold">{bookings.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Room Type Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.entries(roomTypeBreakdown).length === 0 ? (
              <p className="text-sm text-gray-500">No rooms added yet</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(roomTypeBreakdown).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{type}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-cyan-500 h-2 rounded-full"
                          style={{ width: `${(count / rooms.length) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 w-8 text-right">{count as number}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Booking Status</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.entries(bookingsByStatus).length === 0 ? (
              <p className="text-sm text-gray-500">No bookings yet</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(bookingsByStatus).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{status}</span>
                    <span className="text-sm font-bold text-cyan-700">{count as number}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Room Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-2xl font-bold text-green-700">{stats.availableRooms}</p>
                <p className="text-xs text-gray-500 mt-1">Available</p>
              </div>
              <div className="bg-red-50 rounded-xl p-4">
                <p className="text-2xl font-bold text-red-700">{stats.occupiedRooms}</p>
                <p className="text-xs text-gray-500 mt-1">Occupied</p>
              </div>
              <div className="bg-yellow-50 rounded-xl p-4">
                <p className="text-2xl font-bold text-yellow-700">{stats.cleaningRooms}</p>
                <p className="text-xs text-gray-500 mt-1">Cleaning</p>
              </div>
              <div className="bg-orange-50 rounded-xl p-4">
                <p className="text-2xl font-bold text-orange-700">{stats.maintenanceRooms}</p>
                <p className="text-xs text-gray-500 mt-1">Maintenance</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
