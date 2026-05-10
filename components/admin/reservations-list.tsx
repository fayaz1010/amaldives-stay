'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

type FilterKey = 'ALL' | 'UPCOMING' | 'ACTIVE' | 'CHECKED_OUT';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'UPCOMING', label: 'Upcoming' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'CHECKED_OUT', label: 'Checked Out' },
];

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-green-100 text-green-800',
  CHECKED_IN: 'bg-blue-100 text-blue-800',
  CHECKED_OUT: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800',
  NO_SHOW: 'bg-orange-100 text-orange-800',
};

function nightsBetween(from: Date, to: Date) {
  return Math.max(
    1,
    Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
  );
}

export function ReservationsList({ bookings }: { bookings: any[] }) {
  const [filter, setFilter] = useState<FilterKey>('ALL');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const visible = useMemo(() => {
    if (filter === 'ALL') return bookings;
    if (filter === 'UPCOMING') return bookings.filter((b) => b.status === 'CONFIRMED' || b.status === 'PENDING');
    if (filter === 'ACTIVE') return bookings.filter((b) => b.status === 'CHECKED_IN');
    if (filter === 'CHECKED_OUT') return bookings.filter((b) => b.status === 'CHECKED_OUT');
    return bookings;
  }, [bookings, filter]);

  async function updateStatus(id: string, status: 'CHECKED_IN' | 'CHECKED_OUT') {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || 'Failed to update booking');
      }
      startTransition(() => router.refresh());
    } catch (e: any) {
      setError(e?.message || 'Failed to update booking');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 border-b mb-4 overflow-x-auto">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const count =
            f.key === 'ALL'
              ? bookings.length
              : f.key === 'UPCOMING'
              ? bookings.filter((b) => b.status === 'CONFIRMED' || b.status === 'PENDING').length
              : f.key === 'ACTIVE'
              ? bookings.filter((b) => b.status === 'CHECKED_IN').length
              : bookings.filter((b) => b.status === 'CHECKED_OUT').length;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                active
                  ? 'border-cyan-600 text-cyan-700'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {f.label} <span className="text-xs text-gray-400">({count})</span>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {visible.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <p className="text-lg font-medium mb-2">No reservations in this view</p>
            <p className="text-sm">Try a different filter or create a new booking.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {visible.map((b: any) => {
            const checkIn = new Date(b.checkInDate);
            const checkOut = new Date(b.checkOutDate);
            const nights = nightsBetween(checkIn, checkOut);
            const busy = busyId === b.id;
            return (
              <Card key={b.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">
                      {b.confirmationNumber}
                    </CardTitle>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        statusColors[b.status] || 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500">Guest</p>
                      <p className="font-medium">{b.guest?.name || '—'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Room</p>
                      <p className="font-medium">
                        Room {b.room?.number} ({b.room?.type})
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Check-in</p>
                      <p className="font-medium">{checkIn.toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Check-out</p>
                      <p className="font-medium">{checkOut.toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Nights</p>
                      <p className="font-medium">{nights}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Total</p>
                      <p className="font-medium text-cyan-700">
                        ${b.totalAmount?.toFixed(2)}
                        {b.platformFee > 0 && (
                          <span className="ml-1 text-xs text-gray-400">
                            (fee ${b.platformFee.toFixed(2)})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    {b.status === 'CONFIRMED' && (
                      <Button
                        size="sm"
                        onClick={() => updateStatus(b.id, 'CHECKED_IN')}
                        disabled={busy}
                        className="bg-cyan-600 hover:bg-cyan-700"
                      >
                        {busy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Check In'
                        )}
                      </Button>
                    )}
                    {b.status === 'CHECKED_IN' && (
                      <Button
                        size="sm"
                        onClick={() => updateStatus(b.id, 'CHECKED_OUT')}
                        disabled={busy}
                        variant="outline"
                      >
                        {busy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Check Out'
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
