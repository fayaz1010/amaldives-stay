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
        typeLabel: (room as { typeLabel?: string | null }).typeLabel ?? null,
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

  // Per-tenant room-type categories: whatever this tenant has actually used
  // (custom typeLabels), unioned with a small sensible default set. Drives the
  // combobox in the Add/Edit Room modal so each property builds its own list.
  const prettify = (t: string) => t.charAt(0) + t.slice(1).toLowerCase();
  const DEFAULT_TYPES = ['Standard', 'Deluxe', 'Suite', 'Family', 'Twin', 'Sea View'];
  const used = rooms
    .map((r) => (r as { typeLabel?: string | null }).typeLabel || prettify(r.type))
    .filter(Boolean) as string[];
  const roomTypeOptions = Array.from(new Set([...used, ...DEFAULT_TYPES])).sort((a, b) =>
    a.localeCompare(b)
  );

  return (
    <RoomsManager
      groupedRoomTypes={groupedRoomTypes}
      propertyId={property?.id ?? ''}
      roomTypeOptions={roomTypeOptions}
    />
  );
}
