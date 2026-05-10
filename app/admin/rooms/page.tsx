import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { TenantDb } from '@/lib/db';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const statusColors: Record<string, string> = {
  AVAILABLE: 'bg-green-100 text-green-800',
  OCCUPIED: 'bg-red-100 text-red-800',
  CLEANING: 'bg-yellow-100 text-yellow-800',
  MAINTENANCE: 'bg-orange-100 text-orange-800',
  OUT_OF_ORDER: 'bg-gray-100 text-gray-800',
};

export default async function RoomsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect('/auth/signin');

  const db = new TenantDb(session.user.tenantId);
  const rooms = await db.getRooms({});

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Rooms</h1>
        <span className="text-sm text-gray-500">{rooms.length} total rooms</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rooms.map((room) => (
          <Card key={room.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Room {room.number}</CardTitle>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusColors[room.status] || 'bg-gray-100 text-gray-800'}`}>
                  {room.status}
                </span>
              </div>
              <p className="text-sm text-gray-600">{room.name}</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex justify-between">
                  <span className="text-gray-500">Type</span>
                  <span className="font-medium">{room.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Capacity</span>
                  <span className="font-medium">{room.capacity} guests</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Base Price</span>
                  <span className="font-medium text-cyan-700">${room.basePrice}/night</span>
                </div>
                {room.bedType && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Bed</span>
                    <span className="font-medium">{room.bedType}</span>
                  </div>
                )}
                {room.size && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Size</span>
                    <span className="font-medium">{room.size} m²</span>
                  </div>
                )}
              </div>
              {room.amenities.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {room.amenities.slice(0, 4).map((a) => (
                    <span key={a} className="text-xs bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded-full">{a}</span>
                  ))}
                  {room.amenities.length > 4 && (
                    <span className="text-xs text-gray-400">+{room.amenities.length - 4} more</span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
