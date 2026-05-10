import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function GuestsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect('/auth/signin');

  const guests = await prisma.user.findMany({
    where: { role: 'GUEST', bookings: { some: { tenantId: session.user.tenantId } } },
    include: {
      guestProfile: true,
      bookings: { where: { tenantId: session.user.tenantId }, select: { id: true, status: true, totalAmount: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Guests</h1>
        <span className="text-sm text-gray-500">{guests.length} guests</span>
      </div>

      {guests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <p className="text-lg font-medium mb-2">No guests yet</p>
            <p className="text-sm">Guest profiles are created automatically when bookings are made.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {guests.map((g: any) => (
            <Card key={g.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{g.name}</CardTitle>
                <p className="text-sm text-gray-500">{g.email}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Nationality</span>
                    <span>{g.guestProfile?.nationality || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Stays</span>
                    <span className="font-medium">{g.bookings.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Spent</span>
                    <span className="font-medium text-cyan-700">
                      ${g.bookings.reduce((sum: number, b: any) => sum + (b.totalAmount || 0), 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
