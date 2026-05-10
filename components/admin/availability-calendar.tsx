'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Plus, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

const DAYS_VISIBLE = 21;
const NAV_STEP_DAYS = 7;
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type RoomAvailability = {
  id: string;
  number: string;
  name: string;
  type: string;
  basePrice: number;
  status: string;
  bookedDates: string[];
};

type ApiResponse = {
  rooms: RoomAvailability[];
  startDate: string;
  endDate: string;
};

type CellStatus = 'AVAILABLE' | 'BOOKED' | 'CLEANING' | 'MAINTENANCE' | 'OUT_OF_ORDER';

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function toKey(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatDateLong(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const cellColor: Record<CellStatus, string> = {
  AVAILABLE: 'bg-green-500 hover:bg-green-600',
  BOOKED: 'bg-red-500 hover:bg-red-600',
  CLEANING: 'bg-yellow-400 hover:bg-yellow-500',
  MAINTENANCE: 'bg-orange-500 hover:bg-orange-600',
  OUT_OF_ORDER: 'bg-gray-400 hover:bg-gray-500',
};

const cellLabel: Record<CellStatus, string> = {
  AVAILABLE: 'Available',
  BOOKED: 'Booked',
  CLEANING: 'Cleaning',
  MAINTENANCE: 'Maintenance',
  OUT_OF_ORDER: 'Out of order',
};

const typeBadgeStyle = 'bg-cyan-50 text-cyan-700 border-cyan-200';

export function AvailabilityCalendar() {
  const [anchor, setAnchor] = useState<Date>(() => startOfDay(new Date()));
  const [rooms, setRooms] = useState<RoomAvailability[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const days = useMemo(() => {
    return Array.from({ length: DAYS_VISIBLE }, (_, i) => addDays(anchor, i));
  }, [anchor]);

  const startKey = toKey(days[0]);
  const endKey = toKey(days[days.length - 1]);
  const todayKey = toKey(startOfDay(new Date()));

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/admin/availability?startDate=${startKey}&endDate=${endKey}`, {
      cache: 'no-store',
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || `Request failed (${res.status})`);
        }
        return res.json() as Promise<ApiResponse>;
      })
      .then((data) => {
        if (cancelled) return;
        setRooms(data.rooms);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || 'Failed to load availability');
        setRooms(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [startKey, endKey]);

  const goPrev = () => setAnchor((a) => addDays(a, -NAV_STEP_DAYS));
  const goNext = () => setAnchor((a) => addDays(a, NAV_STEP_DAYS));
  const goToday = () => setAnchor(startOfDay(new Date()));

  const rangeLabel = `${days[0].toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })} – ${days[days.length - 1].toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;

  function getCellStatus(room: RoomAvailability, dateKey: string): CellStatus {
    if (room.bookedDates.includes(dateKey)) return 'BOOKED';
    // For today and forward, fall back to the room's own status if not bookable.
    if (dateKey === todayKey) {
      switch (room.status) {
        case 'CLEANING':
          return 'CLEANING';
        case 'MAINTENANCE':
          return 'MAINTENANCE';
        case 'OUT_OF_ORDER':
          return 'OUT_OF_ORDER';
        case 'OCCUPIED':
          return 'BOOKED';
        default:
          return 'AVAILABLE';
      }
    }
    return 'AVAILABLE';
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Availability Calendar</h1>
          <p className="text-sm text-gray-500">{rangeLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={goPrev}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Prev week
          </Button>
          <Button variant="outline" size="sm" onClick={goToday}>
            <RefreshCw className="mr-1 h-4 w-4" />
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={goNext}>
            Next week
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
          <Link href="/admin/reservations/new">
            <Button size="sm" className="bg-teal-600 hover:bg-teal-700">
              <Plus className="mr-1 h-4 w-4" />
              New Booking
            </Button>
          </Link>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 rounded-md border border-gray-200 bg-white px-4 py-2 text-xs text-gray-700">
        <LegendSwatch className="bg-green-500" label="Available" />
        <LegendSwatch className="bg-red-500" label="Booked" />
        <LegendSwatch className="bg-yellow-400" label="Cleaning" />
        <LegendSwatch className="bg-orange-500" label="Maintenance" />
        <LegendSwatch className="bg-gray-400" label="Out of order" />
        <span className="ml-auto flex items-center gap-2">
          <span className="inline-block h-4 w-4 rounded-sm bg-green-500 ring-2 ring-cyan-400 ring-offset-1" />
          Today
        </span>
      </div>

      {/* Calendar */}
      <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
        <div className="min-w-max">
          {/* Date header row */}
          <div className="flex sticky top-0 z-10 border-b border-gray-200 bg-gray-50">
            <div className="w-64 shrink-0 border-r border-gray-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Room
            </div>
            <div className="flex">
              {days.map((d) => {
                const key = toKey(d);
                const isToday = key === todayKey;
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                return (
                  <div
                    key={key}
                    className={cn(
                      'flex h-12 w-8 flex-col items-center justify-center border-r border-gray-100 text-[10px] leading-tight',
                      isWeekend ? 'bg-gray-100' : '',
                      isToday ? 'text-cyan-700 font-bold' : 'text-gray-600'
                    )}
                  >
                    <span className="text-sm font-semibold">{d.getDate()}</span>
                    <span>{DAY_LABELS[d.getDay()]}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Body */}
          {loading && <CalendarSkeleton />}

          {!loading && error && (
            <div className="px-4 py-8 text-center text-sm text-red-600">{error}</div>
          )}

          {!loading && !error && rooms && rooms.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-gray-500">
              No rooms found.
            </div>
          )}

          {!loading && !error && rooms && rooms.length > 0 && (
            <div>
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="flex border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50"
                >
                  <div className="w-64 shrink-0 border-r border-gray-200 px-4 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-gray-900">
                        Room {room.number}
                      </span>
                      <Badge variant="outline" className={cn('text-[10px]', typeBadgeStyle)}>
                        {room.type}
                      </Badge>
                    </div>
                    <div className="truncate text-xs text-gray-600">{room.name}</div>
                    <div className="mt-1 text-xs font-medium text-cyan-700">
                      ${room.basePrice}/night
                    </div>
                  </div>
                  <div className="flex">
                    {days.map((d) => {
                      const key = toKey(d);
                      const status = getCellStatus(room, key);
                      const isToday = key === todayKey;
                      const tooltip = `Room ${room.number} • ${formatDateLong(d)} — ${cellLabel[status]}`;
                      return (
                        <div
                          key={key}
                          title={tooltip}
                          className={cn(
                            'm-0.5 h-8 w-7 cursor-pointer rounded-sm transition-colors',
                            cellColor[status],
                            isToday && 'ring-2 ring-cyan-400 ring-offset-1'
                          )}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LegendSwatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className={cn('inline-block h-4 w-4 rounded-sm', className)} />
      {label}
    </span>
  );
}

function CalendarSkeleton() {
  return (
    <div className="divide-y divide-gray-100">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex">
          <div className="w-64 shrink-0 border-r border-gray-200 px-4 py-2">
            <Skeleton className="mb-2 h-4 w-24" />
            <Skeleton className="mb-1 h-3 w-32" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="flex">
            {Array.from({ length: DAYS_VISIBLE }).map((__, j) => (
              <Skeleton key={j} className="m-0.5 h-8 w-7 rounded-sm" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
