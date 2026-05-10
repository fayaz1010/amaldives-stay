'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, LogOut, Clock, DollarSign, User, CheckCircle2 } from 'lucide-react';

interface DepartureBooking {
  id: string;
  confirmationNumber: string;
  checkInDate: string | Date;
  checkOutDate: string | Date;
  totalAmount: number;
  paidAmount: number;
  status: string;
  notes?: string | null;
  guest: { id: string; name: string | null; email: string };
  room: { id: string; number: string; name: string | null };
  arrival?: {
    transportType: string;
    transportRef?: string | null;
    scheduledArrival?: string | Date | null;
  } | null;
}

interface DeparturesBoardProps {
  bookings: DepartureBooking[];
}

export function DeparturesBoard({ bookings }: DeparturesBoardProps) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function checkOut(bookingId: string) {
    if (!confirm('Confirm checkout for this guest?')) return;
    setBusyId(bookingId);
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CHECKED_OUT' }),
      });
      if (!res.ok) throw new Error('Checkout failed');
      router.refresh();
    } catch {
      alert('Failed to check out guest');
    } finally {
      setBusyId(null);
    }
  }

  const today = new Date();
  const todayStr = today.toDateString();

  const todayDepartures = bookings.filter((b) => {
    const co = new Date(b.checkOutDate);
    return co.toDateString() === todayStr;
  });

  const upcomingDepartures = bookings.filter((b) => {
    const co = new Date(b.checkOutDate);
    return co.toDateString() !== todayStr;
  });

  function DepartureCard({ b }: { b: DepartureBooking }) {
    const balance = b.totalAmount - b.paidAmount;
    const isCheckedOut = b.status === 'CHECKED_OUT';
    return (
      <Card className={`transition-shadow hover:shadow-md ${isCheckedOut ? 'opacity-60' : ''}`}>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-sm">{b.guest.name}</p>
              <p className="text-[11px] text-gray-500">
                Room {b.room.number} · #{b.confirmationNumber}
              </p>
            </div>
            {isCheckedOut ? (
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                <CheckCircle2 className="h-3 w-3" /> Out
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                Departing
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <Clock className="h-3 w-3" />
            Check-in {new Date(b.checkInDate).toLocaleDateString()} →{' '}
            Check-out {new Date(b.checkOutDate).toLocaleDateString()}
          </div>

          {balance > 0 && (
            <div className="flex items-center gap-1.5 text-[11px] text-red-600 font-medium">
              <DollarSign className="h-3 w-3" />
              Balance due: ${balance.toFixed(2)}
            </div>
          )}
          {balance <= 0 && b.totalAmount > 0 && (
            <div className="flex items-center gap-1.5 text-[11px] text-green-600">
              <DollarSign className="h-3 w-3" />
              Fully paid
            </div>
          )}

          {b.arrival?.transportRef && (
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <User className="h-3 w-3" />
              Return: {b.arrival.transportRef}
            </div>
          )}

          {!isCheckedOut && (
            <Button
              size="sm"
              className="h-7 text-xs w-full bg-teal-600 hover:bg-teal-700 mt-1"
              disabled={busyId === b.id}
              onClick={() => checkOut(b.id)}
            >
              {busyId === b.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <LogOut className="h-3 w-3 mr-1" /> Check Out
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      {bookings.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <LogOut className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">No upcoming departures</p>
        </div>
      ) : (
        <div className="space-y-6">
          {todayDepartures.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-red-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                🚨 Departing Today ({todayDepartures.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {todayDepartures.map((b) => <DepartureCard key={b.id} b={b} />)}
              </div>
            </div>
          )}
          {upcomingDepartures.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Upcoming ({upcomingDepartures.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {upcomingDepartures.map((b) => <DepartureCard key={b.id} b={b} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
