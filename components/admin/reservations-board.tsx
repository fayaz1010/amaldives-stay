'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Loader2, Clock, CalendarCheck, DollarSign,
  Receipt, LogIn, LogOut, AlertCircle, User, Share2, MessageCircle,
  Info, UserX, Mail, Phone,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StayChatPanel } from '@/components/stay-chat-panel';
import { CheckoutModal } from './checkout-modal';
import { QuickPayModal } from './quick-pay-modal';

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

// Chat is offered from booking (pre-arrival) through post-stay follow-up; only
// hidden once the reservation is cancelled or marked no-show. Mirrors the
// widened server-side gate in lib/stay-chat.ts.
function canChat(status: string): boolean {
  return !['CANCELLED', 'NO_SHOW'].includes(status);
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
  groupBookingId?: string | null;
  guest?: { name: string | null; email: string } | null;
  room?: { number: string; name: string | null; type: string; basePrice: number; property?: { currency?: string } | null } | null;
  serviceOrders?: Array<{ id: string; totalAmount: number }> | null;
}

// Fuller shape returned by GET /api/admin/bookings/[id] (getBookingById).
interface BookingDetail {
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
  specialRequests?: string | null;
  guest?: {
    name: string | null;
    email: string;
    guestProfile?: { phone?: string | null } | null;
  } | null;
  room?: {
    number: string;
    name: string | null;
    type: string;
    property?: { currency?: string | null } | null;
  } | null;
  payments?: Array<{
    id: string;
    amount: number;
    currency: string;
    method: string;
    status: string;
    createdAt: string;
    notes?: string | null;
  }> | null;
  serviceOrders?: Array<{ id: string; totalAmount: number }> | null;
}

function grandTotal(b: Booking): number {
  // The amount the GUEST owes — room nights + service orders. The
  // platformFee is what stay.amaldives charges the owner (commission)
  // and must not be added to the guest's bill; it's surfaced separately
  // on the card so the owner can see their net.
  const n = nights(b.checkInDate, b.checkOutDate);
  const roomCharge = (b.room?.basePrice ?? 0) * n;
  const svcTotal = (b.serviceOrders ?? []).reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  return roomCharge + svcTotal;
}

export function ReservationsBoard({ bookings }: { bookings: Booking[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [checkoutId, setCheckoutId] = useState<string | null>(null);
  const [billId, setBillId] = useState<string | null>(null);
  const [quickPayBooking, setQuickPayBooking] = useState<Booking | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [chatBookingId, setChatBookingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<BookingDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    setDetailError(null);
    setDetail(null);
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load booking');
      setDetail(data.booking);
    } catch (e: unknown) {
      setDetailError(e instanceof Error ? e.message : 'Failed to load booking');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (detailId) loadDetail(detailId);
  }, [detailId, loadDetail]);

  async function markNoShow(id: string) {
    if (!window.confirm('Mark this reservation as no-show? The guest did not arrive.')) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'NO_SHOW' }),
      });
      if (!res.ok) throw new Error();
      setDetailId(null);
      router.refresh();
    } catch { alert('Failed to mark no-show'); }
    finally { setBusyId(null); }
  }

  useEffect(() => {
    if (!shareToast) return;
    const t = setTimeout(() => setShareToast(null), 3000);
    return () => clearTimeout(t);
  }, [shareToast]);

  async function shareGuestPortal(bookingId: string) {
    setSharingId(bookingId);
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/guest-token`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      const fullUrl = `${window.location.origin}${data.url}`;
      try {
        await navigator.clipboard.writeText(fullUrl);
        setShareToast('Guest portal link copied!');
      } catch {
        // Clipboard blocked — show the URL so it can be copied manually.
        window.prompt('Copy this guest portal link:', fullUrl);
      }
    } catch {
      setShareToast('Failed to generate link');
    } finally {
      setSharingId(null);
    }
  }

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
      <div className="flex flex-col md:flex-row md:overflow-x-auto gap-4 pb-2">
        {COLUMNS.map((col) => {
          const colBookings = filteredBookings.filter((b) => col.statuses.includes(b.status));
          const totalForCol = bookings.filter((b) => col.statuses.includes(b.status)).length;

          return (
            <div key={col.key} className={`rounded-lg border-2 ${col.color} p-3 w-full md:w-72 md:min-w-[18rem] md:flex-shrink-0`}>
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
                    const total = grandTotal(b);
                    const balance = total - b.paidAmount;
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
                              <p className="text-[11px] text-gray-400 flex items-center gap-1">
                                #{b.confirmationNumber.slice(-8)}
                                {b.groupBookingId && (
                                  <span className="inline-flex items-center rounded-full bg-purple-100 px-1.5 py-0 text-[10px] font-semibold text-purple-700">
                                    Group
                                  </span>
                                )}
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
                          <div className="flex items-center justify-between gap-1 flex-wrap">
                            <div className="flex items-center gap-1 text-[11px] min-w-0">
                              <DollarSign className="h-3 w-3 text-cyan-600 shrink-0" />
                              <span className="font-bold text-cyan-700">${total.toFixed(0)}</span>
                              {b.platformFee > 0 && (
                                <span
                                  className="text-gray-400"
                                  title="Commission stay.amaldives charges you — not added to the guest's bill"
                                >
                                  (comm ${b.platformFee.toFixed(0)})
                                </span>
                              )}
                            </div>
                            {balance > 0 && b.status !== 'CHECKED_OUT' ? (
                              <span className="flex items-center gap-0.5 text-[10px] text-red-500 font-medium">
                                <AlertCircle className="h-3 w-3" /> ${balance.toFixed(0)} due
                              </span>
                            ) : b.status !== 'CHECKED_OUT' && total > 0 ? (
                              <span className="text-[10px] text-green-600 font-medium">Paid ✓</span>
                            ) : null}
                          </div>

                          {b.source && (
                            <p className="text-[10px] text-gray-400">via {b.source}</p>
                          )}

                          {/* Actions — flex-wrap so the row never spills off the
                              card on phones. Most guesthouse owners only have a
                              phone; this row used to overflow in CHECKED_IN state
                              where there are 4 buttons. */}
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => setDetailId(b.id)}
                              title="View booking details"
                            >
                              <Info className="h-3 w-3" />
                            </Button>
                            {canChat(b.status) && b.status !== 'CHECKED_IN' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => setChatBookingId(b.id)}
                                title="Chat with guest"
                              >
                                <MessageCircle className="h-3 w-3" />
                              </Button>
                            )}
                            {(b.status === 'CONFIRMED' || b.status === 'PENDING') && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs border-orange-300 text-orange-700 hover:bg-orange-50"
                                disabled={busy}
                                onClick={() => markNoShow(b.id)}
                                title="Mark reservation as no-show"
                              >
                                <UserX className="h-3 w-3" />
                              </Button>
                            )}
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
                                  onClick={() => setChatBookingId(b.id)}
                                  title="Chat with guest"
                                >
                                  <MessageCircle className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  onClick={() => setBillId(b.id)}
                                  title="View bill"
                                >
                                  <Receipt className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs border-teal-300 text-teal-700 hover:bg-teal-50"
                                  disabled={sharingId === b.id}
                                  onClick={() => shareGuestPortal(b.id)}
                                  title="Share guest portal link"
                                >
                                  {sharingId === b.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Share2 className="h-3 w-3" />
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className={`h-7 text-xs gap-1 min-w-0 px-2 ${balance > 0 ? 'bg-amber-50 border-amber-400 text-amber-800 hover:bg-amber-100' : 'border-cyan-300 text-cyan-700 hover:bg-cyan-50'}`}
                                  onClick={() => setQuickPayBooking(b)}
                                  title="Record payment"
                                >
                                  💳 {balance > 0 ? `Pay $${balance.toFixed(0)}` : 'Payment'}
                                </Button>
                                <Button size="sm"
                                  className="h-7 text-xs flex-1 min-w-0 bg-teal-600 hover:bg-teal-700"
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
      <Dialog open={!!chatBookingId} onOpenChange={(o) => !o && setChatBookingId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Chat with guest</DialogTitle>
          </DialogHeader>
          {chatBookingId && (
            <StayChatPanel
              apiPath={`/api/admin/stay-chat/${chatBookingId}`}
              senderRole="STAFF"
              emptyHint="No messages from the guest yet."
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Booking detail modal */}
      <Dialog open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Booking details</DialogTitle>
          </DialogHeader>
          {detailLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
            </div>
          )}
          {detailError && (
            <p className="text-sm text-red-600 py-4 text-center">{detailError}</p>
          )}
          {!detailLoading && !detailError && detail && (() => {
            const dn = nights(detail.checkInDate, detail.checkOutDate);
            const balance = detail.totalAmount - detail.paidAmount;
            const currency = detail.room?.property?.currency || 'USD';
            const money = (v: number) =>
              `${currency === 'USD' ? '$' : `${currency} `}${v.toFixed(2)}`;
            return (
              <div className="space-y-4 text-sm">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-base truncate">{detail.guest?.name || '—'}</p>
                    <p className="text-xs text-gray-400">#{detail.confirmationNumber}</p>
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${STATUS_CHIP[detail.status] || 'bg-gray-100 text-gray-600'}`}>
                    {detail.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Guest contact */}
                <div className="space-y-1 text-gray-600">
                  {detail.guest?.email && (
                    <p className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      <span className="truncate">{detail.guest.email}</span>
                    </p>
                  )}
                  {detail.guest?.guestProfile?.phone && (
                    <p className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      <span>{detail.guest.guestProfile.phone}</span>
                    </p>
                  )}
                </div>

                {/* Stay */}
                <div className="rounded-lg border bg-gray-50 p-3 space-y-1.5">
                  <p className="font-medium text-gray-800">
                    Room {detail.room?.number}
                    {detail.room?.name ? ` — ${detail.room.name}` : ''}
                    <span className="text-gray-400 font-normal"> ({detail.room?.type})</span>
                  </p>
                  <p className="flex items-center gap-1.5 text-gray-600">
                    <Clock className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    {new Date(detail.checkInDate).toLocaleDateString()} →{' '}
                    {new Date(detail.checkOutDate).toLocaleDateString()}
                    <span className="text-gray-400"> · {dn}n</span>
                  </p>
                  <p className="text-gray-600">
                    {detail.adults} adult{detail.adults === 1 ? '' : 's'}
                    {detail.children > 0 && `, ${detail.children} child${detail.children === 1 ? '' : 'ren'}`}
                  </p>
                  {detail.source && <p className="text-xs text-gray-400">via {detail.source}</p>}
                </div>

                {/* Money */}
                <div className="rounded-lg border p-3 space-y-1">
                  <div className="flex justify-between"><span className="text-gray-500">Total</span><span className="font-semibold">{money(detail.totalAmount)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Paid</span><span className="text-green-700">{money(detail.paidAmount)}</span></div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Balance</span>
                    <span className={balance > 0 ? 'text-red-600 font-semibold' : 'text-gray-700'}>{money(balance)}</span>
                  </div>
                  {detail.platformFee > 0 && (
                    <div className="flex justify-between border-t pt-1 mt-1">
                      <span className="text-gray-400" title="Commission stay.amaldives charges you — not part of the guest's bill">Commission</span>
                      <span className="text-gray-400">{money(detail.platformFee)}</span>
                    </div>
                  )}
                </div>

                {detail.specialRequests && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-0.5">Special requests</p>
                    <p className="text-gray-700 whitespace-pre-wrap">{detail.specialRequests}</p>
                  </div>
                )}
                {detail.notes && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-0.5">Notes</p>
                    <p className="text-gray-700 whitespace-pre-wrap">{detail.notes}</p>
                  </div>
                )}

                {/* Payment history */}
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Payment history</p>
                  {detail.payments && detail.payments.length > 0 ? (
                    <div className="space-y-1">
                      {detail.payments.map((p) => (
                        <div key={p.id} className="flex items-center justify-between text-xs border-b last:border-0 py-1">
                          <span className="text-gray-600">
                            {new Date(p.createdAt).toLocaleDateString()} · {p.method.replace('_', ' ')}
                            <span className="text-gray-400"> ({p.status.toLowerCase()})</span>
                          </span>
                          <span className="font-medium">{`${p.currency === 'USD' ? '$' : `${p.currency} `}${p.amount.toFixed(2)}`}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">No payments recorded yet.</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-1 border-t">
                  {canChat(detail.status) && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() => { setChatBookingId(detail.id); setDetailId(null); }}
                    >
                      <MessageCircle className="h-3.5 w-3.5 mr-1" /> Chat with guest
                    </Button>
                  )}
                  {(detail.status === 'CONFIRMED' || detail.status === 'PENDING') && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs border-orange-300 text-orange-700 hover:bg-orange-50"
                      disabled={busyId === detail.id}
                      onClick={() => markNoShow(detail.id)}
                    >
                      {busyId === detail.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (
                        <><UserX className="h-3.5 w-3.5 mr-1" /> Mark No-Show</>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
      {/* Share toast */}
      {shareToast && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-gray-900 text-white text-sm rounded-lg shadow-lg px-4 py-3">
            {shareToast}
          </div>
        </div>
      )}
      {/* Quick Pay modal */}
      {quickPayBooking && (
        <QuickPayModal
          bookingId={quickPayBooking.id}
          guestName={quickPayBooking.guest?.name || '—'}
          roomNumber={quickPayBooking.room?.number || '—'}
          confirmationNumber={quickPayBooking.confirmationNumber}
          balanceDue={grandTotal(quickPayBooking) - quickPayBooking.paidAmount}
          currency={quickPayBooking.room?.property?.currency || 'USD'}
          onClose={() => setQuickPayBooking(null)}
          onPaid={() => { setQuickPayBooking(null); router.refresh(); }}
        />
      )}
    </div>
  );
}
