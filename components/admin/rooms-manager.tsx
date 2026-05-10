'use client';

import { useState, useMemo } from 'react';
import { Plus, BedDouble, Users, Maximize2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AddRoomModal } from '@/components/admin/add-room-modal';

export type GroupedRoomType = {
  typeName: string;
  type: string;
  rooms: { id: string; number: string; status: string }[];
  basePrice: number;
  capacity: number;
  bedType: string;
  size: number | null;
  amenities: string[];
  description: string;
  images: string[];
};

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-emerald-500',
  OCCUPIED: 'bg-red-500',
  CLEANING: 'bg-yellow-400',
  MAINTENANCE: 'bg-orange-500',
  OUT_OF_ORDER: 'bg-gray-400',
};

const STATUS_LABEL: Record<string, string> = {
  AVAILABLE: 'Available',
  OCCUPIED: 'Occupied',
  CLEANING: 'Cleaning',
  MAINTENANCE: 'Maintenance',
  OUT_OF_ORDER: 'Out of Order',
};

interface RoomsManagerProps {
  groupedRoomTypes: GroupedRoomType[];
  propertyId: string;
}

export function RoomsManager({ groupedRoomTypes, propertyId }: RoomsManagerProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [prefillType, setPrefillType] = useState<GroupedRoomType | null>(null);

  const totals = useMemo(() => {
    const totalUnits = groupedRoomTypes.reduce((s, g) => s + g.rooms.length, 0);
    const available = groupedRoomTypes.reduce(
      (s, g) => s + g.rooms.filter((r) => r.status === 'AVAILABLE').length,
      0
    );
    return {
      types: groupedRoomTypes.length,
      units: totalUnits,
      available,
    };
  }, [groupedRoomTypes]);

  const openAddType = () => {
    setPrefillType(null);
    setModalOpen(true);
  };

  const openAddUnit = (type: GroupedRoomType) => {
    setPrefillType(type);
    setModalOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Room Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your room inventory, pricing, and availability
          </p>
        </div>
        <Button
          onClick={openAddType}
          className="bg-cyan-500 hover:bg-cyan-600 text-white shadow-sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Room Type
        </Button>
      </div>

      <div className="rounded-lg border bg-white shadow-sm">
        <div className="grid grid-cols-3 divide-x">
          <div className="p-5 text-center">
            <p className="text-sm text-gray-500">Room Types</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{totals.types}</p>
          </div>
          <div className="p-5 text-center">
            <p className="text-sm text-gray-500">Total Units</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{totals.units}</p>
          </div>
          <div className="p-5 text-center">
            <p className="text-sm text-gray-500">Available Today</p>
            <p className="text-3xl font-bold text-emerald-600 mt-1">{totals.available}</p>
          </div>
        </div>
      </div>

      {groupedRoomTypes.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-white p-12 text-center">
          <BedDouble className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900">No room types yet</h3>
          <p className="text-sm text-gray-500 mt-1 mb-4">
            Add your first room type to start accepting bookings.
          </p>
          <Button
            onClick={openAddType}
            className="bg-cyan-500 hover:bg-cyan-600 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Room Type
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {groupedRoomTypes.map((group) => (
            <RoomTypeCard
              key={group.typeName}
              group={group}
              onAddUnit={() => openAddUnit(group)}
            />
          ))}
        </div>
      )}

      <AddRoomModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        propertyId={propertyId}
        prefillType={prefillType}
      />
    </div>
  );
}

function RoomTypeCard({
  group,
  onAddUnit,
}: {
  group: GroupedRoomType;
  onAddUnit: () => void;
}) {
  const visibleAmenities = group.amenities.slice(0, 5);
  const moreAmenities = Math.max(0, group.amenities.length - 5);

  return (
    <div className="rounded-xl overflow-hidden border bg-white shadow-sm hover:shadow-lg transition-shadow flex flex-col">
      <div className="relative h-40 bg-gradient-to-br from-cyan-400 to-teal-500 overflow-hidden">
        {group.images?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={group.images[0]}
            alt={group.typeName}
            className="absolute inset-0 w-full h-full object-cover opacity-90"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
        <div className="absolute inset-0 p-4 flex flex-col justify-between text-white">
          <div className="flex items-start justify-between">
            <span className="inline-flex items-center rounded-full bg-white/25 backdrop-blur px-2.5 py-1 text-xs font-medium uppercase tracking-wide">
              {group.type}
            </span>
            <span className="inline-flex items-center rounded-full bg-white text-cyan-700 px-3 py-1 text-sm font-bold shadow">
              ${group.basePrice}
              <span className="text-xs font-medium text-cyan-500 ml-1">/night</span>
            </span>
          </div>
          <h3 className="text-2xl font-bold drop-shadow">{group.typeName}</h3>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col gap-4">
        <div>
          <p className="text-base font-semibold text-gray-900">{group.typeName}</p>
          <p
            className="text-sm text-gray-600 mt-1 line-clamp-2"
            title={group.description || undefined}
          >
            {group.description || 'No description provided.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-gray-700">
          <span className="inline-flex items-center gap-1.5">
            <BedDouble className="h-4 w-4 text-cyan-600" />
            {group.bedType || '—'}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-4 w-4 text-cyan-600" />
            {group.capacity} guests
          </span>
          {group.size ? (
            <span className="inline-flex items-center gap-1.5">
              <Maximize2 className="h-4 w-4 text-cyan-600" />
              {group.size} m²
            </span>
          ) : null}
        </div>

        <div className="text-2xl font-bold text-cyan-600">
          ${group.basePrice}
          <span className="text-sm font-medium text-gray-500 ml-1">/night</span>
        </div>

        {group.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {visibleAmenities.map((a) => (
              <span
                key={a}
                className="text-xs bg-cyan-50 text-cyan-700 px-2 py-1 rounded-full border border-cyan-100"
              >
                {a}
              </span>
            ))}
            {moreAmenities > 0 && (
              <span className="text-xs text-gray-500 px-2 py-1">
                +{moreAmenities} more
              </span>
            )}
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Units ({group.rooms.length})
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {group.rooms.map((room) => (
              <div
                key={room.id}
                title={`Room ${room.number} — ${STATUS_LABEL[room.status] ?? room.status}`}
                className={`h-7 min-w-7 px-2 rounded text-xs font-semibold text-white flex items-center justify-center ${
                  STATUS_COLORS[room.status] ?? 'bg-gray-400'
                }`}
              >
                {room.number}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 text-[11px] text-gray-500 mt-2">
            <LegendDot color="bg-emerald-500" label="Available" />
            <LegendDot color="bg-red-500" label="Occupied" />
            <LegendDot color="bg-yellow-400" label="Cleaning" />
            <LegendDot color="bg-orange-500" label="Maintenance" />
          </div>
        </div>

        <div className="flex gap-2 pt-2 mt-auto">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => alert('Edit Type — coming soon')}
          >
            <Pencil className="h-4 w-4 mr-1.5" />
            Edit Type
          </Button>
          <Button
            className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white"
            onClick={onAddUnit}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Unit
          </Button>
        </div>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`h-2 w-2 rounded-sm ${color}`} />
      {label}
    </span>
  );
}
