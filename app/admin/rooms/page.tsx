import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { RoomsManager, GroupedRoomType } from '@/components/admin/rooms-manager';

export const dynamic = 'force-dynamic';

export default async function RoomsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) redirect('/auth/signin');

  const tenantId = session.user.tenantId;

  const [rooms, property] = await Promise.all([
    prisma.room.findMany({
      where: { tenantId },
      include: { property: true },
      orderBy: [{ name: 'asc' }, { number: 'asc' }],
    }),
    prisma.property.findFirst({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const grouped: Record<string, GroupedRoomType> = {};
  for (const room of rooms) {
    const key = room.name;
    if (!grouped[key]) {
      grouped[key] = {
        typeName: room.name,
        type: room.type,
        rooms: [],
        basePrice: room.basePrice,
        capacity: room.capacity,
        bedType: room.bedType ?? '',
        size: room.size ?? null,
        amenities: room.amenities,
        description: room.description ?? '',
        images: room.images,
      };
    }
    grouped[key].rooms.push({
      id: room.id,
      number: room.number,
      status: room.status,
    });
  }

  const groupedRoomTypes = Object.values(grouped).sort((a, b) =>
    a.typeName.localeCompare(b.typeName)
  );

  return (
    <RoomsManager
      groupedRoomTypes={groupedRoomTypes}
      propertyId={property?.id ?? ''}
    />
  );
}
