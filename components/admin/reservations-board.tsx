'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Loader2, Clock, CalendarCheck, DollarSign,
  Receipt, LogIn, LogOut, AlertCircle, User,
} from 'lucide-react';
import { CheckoutModal } from './checkout-modal';

type DateRange = 'today' | 'week' | 'month' | 'all';

const DATE_FILTERS: { label: string; value: DateRange }[] = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'All Time', value: 'all' },
];

const COLUMNS = [
  {
    key: 'PENDING',
    title: 'Pending',
    statuses: ['PENDING'],
    color: 'bg-yellow-50 border-yellow-200',
    badge: 'bg-yellow-100 text-yellow-800',
    empty: 'No pending bookings',
  },
  {
    key: 'CONFIRMED',
    title: 'Confirmed',
    statuses: ['CONFIRMED'],
    color: 'bg-green-50 border-green-200',
    badge: 'bg-green-100 text-green-700',
    empty: 'No confirmed bookings',
  },
  {
    key: 'CHECKED_IN',
    title: 'In House',
    statuses: ['CHECKED_IN'],
    color: 'bg-blue-50 border-blue-200',
    badge: 'bg-blue-100 text-blue-700',
    empty: 'No guests in house',
  },
  {
    key: 'CHECKED_OUT',
    title: 'Checked Out',
    statuses: ['CHECKED_OUT', 'CANCELLED', 'NO_SHOW'],
    color: 'bg-gray-50 border-gray-200',
    badge: 'bg-gray-100 text-gray-600',
    empty: 'No checked-out guests',
  },
];

const STATUS_CHIP: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-green-100 text-green-700',
  CHECKED_IN: 'bg-blue-100 text-blue-700',
  CHECKED_OUT: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-700',
  NO_SHOW: 'bg-orange-100 text-orange-700',
};

function nights(from: string, to: string) {
  return Math.max(1, Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / 86400000));
}

function startOf(range: DateRange): Date | null {
  const now = new Date();
  if (range === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (range === 'week') {
    const d = new Date(now); d.setDate(d.getDate() - d.getDay()); d.setHours(0, 0, 0, 0); return d;
  }
  if (range === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
  return null;
}

interface Booking {
  id: string;
  confirmationNumber: string;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
  totalAmount: number;
  paidAmount: number;
  platformFee: number;
  status: string;
  source?: string | null;
  notes?: string | null;
  guest?: { name: string | null; email: string } | null;
  room?: { number: string; name: string | null; type: string } | null;
}

export function ReservationsBoard({ bookings }: { bookings: Booking[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [checkoutId, setCheckoutId] = useState<string | null>(null);
  const [billId, setBillId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('all');

  // For Checked Out column, apply date filter on checkOutDate
  const filteredBookings = useMemo(() => {
    const cutoff = startOf(dateRange);
    return bookings.map((b) => {
      if (!['CHECKED_OUT', 'CANCELLED', 'NO_SHOW'].includes(b.status)) return b;
      if (!cutoff) return b;
      return new Date(b.checkOutDate) >= cutoff ? b : null;
    }).filter(Boolean) as Booking[];
  }, [bookings, dateRange]);

  async function quickCheckin(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CHECKED_IN' }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch { alert('Check-in failed'); }
    finally { setBusyId(null); }
  }

  const totalInHouse = bookings.filter((b) => b.status === 'CHECKED_IN').length;
  const totalCheckedOut = bookings.filter((b) => b.status === 'CHECKED_OUT').length;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reservations</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {totalInHouse} in house · {bookings.length} total bookings
          </p>
        </div>
        <Button asChild className="bg-cyan-600 hover:bg-cyan-700">
          <a href="/admin/reservations/new">
            + New Booking
          </a>
        </Button>
      </div>

      {/* Date filter for Checked Out column */}
      <div className="flex items-center gap-2 mb-5 p-2 bg-gray-50 rounded-lg border">
        <span className="text-xs text-gray-500 font-medium mr-1">Checked-out filter:</span>
        {DATE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setDateRange(f.value)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              dateRange === f.value
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-white hover:shadow-sm'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Kanban grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {COLUMNS.map((col) => {
          const colBookings = filteredBookings.filter((b) => col.statuses.includes(b.status));
          const totalForCol = bookings.filter((b) => col.statuses.includes(b.status)).length;

          return (
            <div key={col.key} className={`rounded-lg border-2 ${col.color} p-3`}>
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="font-semibold text-gray-800">{col.title}</h2>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${col.badge}`}>
                  {colBookings.length}
                  {col.key === 'CHECKED_OUT' && dateRange !== 'all' && totalForCol !== colBookings.length && (
                    <span className="text-gray-400 font-normal"> / {totalForCol}</span>
                  )}
                </span>
              </div>

              <div className="space-y-2">
                {colBookings.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">{col.empty}</p>
                ) : (
                  colBookings.map((b) => {
                    const n = nights(b.checkInDate, b.checkOutDate);
                    const balance = b.totalAmount - b.paidAmount;
                    const busy = busyId === b.id;

                    return (
                      <Card key={b.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-3 space-y-2">
                          {/* Header row */}
                          <div className="flex items-start justify-between gap-1">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <User className="h-3 w-3 text-gray-400 shrink-0" />
                                <p className="font-semibold text-sm truncate">{b.guest?.name || '—'}</p>
                              </div>
                              <p className="text-[11px] text-gray-400">
                                #{b.confirmationNumber.slice(-8)}
                              </p>
                            </div>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${STATUS_CHIP[b.status] || 'bg-gray-100 text-gray-600'}`}>
                              {b.status.replace('_', ' ')}
                            </span>
                          </div>

                          {/* Room */}
                          <p className="text-xs text-gray-600 font-medium">
                            Room {b.room?.number}
                            {b.room?.name ? ` — ${b.room.name}` : ''}
                            <span className="text-gray-400 font-normal"> ({b.room?.type})</span>
                          </p>

                          {/* Dates */}
                          <div className="flex items-center gap-1 text-[11px] text-gray-500">
                            <Clock className="h-3 w-3 shrink-0" />
                            <span>
                              {new Date(b.checkInDate).toLocaleDateString()} →{' '}
                              {new Date(b.checkOutDate).toLocaleDateString()}
                              <span className="text-gray-400"> · {n}n</span>
                            </span>
                          </div>

                          {/* Amount */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 text-[11px]">
                              <DollarSign className="h-3 w-3 text-cyan-600" />
                              <span className="font-bold text-cyan-700">${b.totalAmount.toFixed(0)}</span>
                              {b.platformFee > 0 && (
                                <span className="text-gray-400">(fee ${b.platformFee.toFixed(0)})</span>
                              )}
                            </div>
                            {balance > 0 && b.status !== 'CHECKED_OUT' ? (
                              <span className="flex items-center gap-0.5 text-[10px] text-red-500 font-medium">
                                <AlertCircle className="h-3 w-3" /> ${balance.toFixed(0)} due
                              </span>
                            ) : b.status !== 'CHECKED_OUT' && b.totalAmount > 0 ? (
                              <span className="text-[10px] text-green-600 font-medium">Paid ✓</span>
                            ) : null}
                          </div>

                          {b.source && (
                            <p className="text-[10px] text-gray-400">via {b.source}</p>
                          )}

                          {/* Actions */}
                          <div className="flex gap-1.5 pt-0.5">
                            {b.status === 'CONFIRMED' && (
                              <Button size="sm" className="h-7 text-xs flex-1 bg-cyan-600 hover:bg-cyan-700"
                                disabled={busy} onClick={() => quickCheckin(b.id)}>
                                {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : (
                                  <><LogIn className="h-3 w-3 mr-1" />Check In</>
                                )}
                              </Button>
                            )}
                            {b.status === 'PENDING' && (
                              <Button size="sm" variant="outline" className="h-7 text-xs flex-1"
                                disabled={busy} onClick={() => quickCheckin(b.id)}>
                                {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirm & Check In'}
                              </Button>
                            )}
                            {b.status === 'CHECKED_IN' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  onClick={() => setBillId(b.id)}
                                  title="View bill"
                                >
                                  <Receipt className="h-3 w-3" />
                                </Button>
                                <Button size="sm"
                                  className="h-7 text-xs flex-1 bg-teal-600 hover:bg-teal-700"
                                  onClick={() => setCheckoutId(b.id)}>
                                  <LogOut className="h-3 w-3 mr-1" />Check Out
                                </Button>
                              </>
                            )}
                            {(b.status === 'CHECKED_OUT') && (
                              <Button size="sm" variant="outline" className="h-7 text-xs w-full"
                                onClick={() => setBillId(b.id)}>
                                <Receipt className="h-3 w-3 mr-1" /> View Receipt
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Checkout modal */}
      <CheckoutModal
        bookingId={checkoutId}
        mode="checkout"
        onClose={() => { setCheckoutId(null); router.refresh(); }}
      />
      {/* Bill/Receipt modal */}
      <CheckoutModal
        bookingId={billId}
        mode="bill"
        onClose={() => setBillId(null)}
      />
    </div>
  );
}
