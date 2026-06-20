'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ChevronLeft, ChevronRight, Plus, RefreshCw, X, Check,
  Users, Calendar, Loader2, CheckCircle2, ArrowRight, Info,
} from 'lucide-react';
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

type CellStatus = 'AVAILABLE' | 'BOOKED' | 'CLEANING' | 'MAINTENANCE' | 'OUT_OF_ORDER';

function startOfDay(d: Date): Date {
  const x = new Date(d); x.setHours(0, 0, 0, 0); return x;
}
function addDays(d: Date, days: number): Date {
  const x = new Date(d); x.setDate(x.getDate() + days); return x;
}
function toKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function formatDateShort(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function formatDateLong(d: Date) {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
}
function calcNights(start: string, end: string) {
  const a = new Date(start), b = new Date(end);
  return Math.max(1, Math.ceil((b.getTime() - a.getTime()) / 86400000));
}
function datesBetween(start: string, end: string): string[] {
  const result: string[] = [];
  const cur = new Date(start);
  const endD = new Date(end);
  while (cur <= endD) {
    result.push(toKey(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

const cellColor: Record<CellStatus, string> = {
  AVAILABLE:    'bg-green-500',
  BOOKED:       'bg-red-500',
  CLEANING:     'bg-yellow-400',
  MAINTENANCE:  'bg-orange-500',
  OUT_OF_ORDER: 'bg-gray-400',
};
const cellHover: Record<CellStatus, string> = {
  AVAILABLE:    'hover:bg-green-600 cursor-pointer',
  BOOKED:       'cursor-not-allowed opacity-80',
  CLEANING:     'cursor-not-allowed opacity-80',
  MAINTENANCE:  'cursor-not-allowed opacity-80',
  OUT_OF_ORDER: 'cursor-not-allowed opacity-80',
};

// ---- Booking Panel ----
interface BookingPanelProps {
  selStart: string;
  selEnd: string;
  selRooms: Set<string>;
  rooms: RoomAvailability[];
  onClose: () => void;
  onSuccess: (groupId: string, count: number) => void;
}

function BookingPanel({ selStart, selEnd, selRooms, rooms, onClose, onSuccess }: BookingPanelProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nights = calcNights(selStart, selEnd);
  const selectedRoomData = rooms.filter((r) => selRooms.has(r.id));
  const totalAmount = selectedRoomData.reduce((s, r) => s + r.basePrice * nights, 0);
  const isGroup = selRooms.size > 1;

  function valid() {
    return firstName.trim() && lastName.trim() && /.+@.+\..+/.test(email) && phone.trim();
  }

  async function confirm() {
    if (!valid()) return;
    setSubmitting(true);
    setError(null);
    try {
      // Get propertyId from first room's data (we don't have it directly; fetch from API)
      const res = await fetch('/api/admin/bookings/group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomIds: Array.from(selRooms),
          propertyId: '_auto_',  // API will look up from room → property
          checkInDate: selStart,
          checkOutDate: selEnd,
          adults,
          children,
          guestData: {
            name: `${firstName.trim()} ${lastName.trim()}`,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim().toLowerCase(),
            phone: phone.trim(),
          },
          specialRequests: specialRequests.trim() || undefined,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'Booking failed');
      onSuccess(j.groupBookingId, j.roomCount ?? 1);
    } catch (e: any) {
      setError(e.message || 'Failed to create booking');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white shadow-2xl border-l z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b bg-teal-600">
        <div>
          <h3 className="font-bold text-white text-base">
            {isGroup ? `Group Booking — ${selRooms.size} Rooms` : 'New Booking'}
          </h3>
          <p className="text-teal-100 text-xs mt-0.5">
            {formatDateShort(new Date(selStart))} → {formatDateShort(new Date(selEnd))} · {nights} night{nights !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={onClose} className="text-teal-100 hover:text-white p-1 rounded">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Room summary */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Selected Rooms</p>
          <div className="space-y-1.5">
            {selectedRoomData.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg bg-gray-50 border px-3 py-2">
                <div>
                  <span className="text-sm font-medium text-gray-800">Room {r.number}</span>
                  <span className="text-xs text-gray-400 ml-2">{r.type}</span>
                </div>
                <span className="text-sm font-bold text-teal-700">
                  ${(r.basePrice * nights).toFixed(0)}
                  <span className="text-xs text-gray-400 font-normal ml-0.5">({nights}n)</span>
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t">
            <span className="text-sm font-semibold text-gray-700">Total</span>
            <span className="text-lg font-bold text-teal-700">${totalAmount.toFixed(0)}</span>
          </div>
        </div>

        {/* Guest details */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Guest Details</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs mb-1 block">First Name *</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Last Name *</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} className="h-8 text-sm" />
            </div>
          </div>
          <div>
            <Label className="text-xs mb-1 block">Email *</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs mb-1 block">Phone *</Label>
            <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs mb-1 block">Adults</Label>
              <Input type="number" min={1} max={20} value={adults}
                onChange={(e) => setAdults(Math.max(1, parseInt(e.target.value) || 1))} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Children</Label>
              <Input type="number" min={0} max={20} value={children}
                onChange={(e) => setChildren(Math.max(0, parseInt(e.target.value) || 0))} className="h-8 text-sm" />
            </div>
          </div>
          <div>
            <Label className="text-xs mb-1 block">Special Requests</Label>
            <Textarea rows={2} value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)}
              className="text-sm resize-none" placeholder="Optional notes..." />
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t bg-gray-50 space-y-2">
        <Button
          className="w-full bg-teal-600 hover:bg-teal-700 gap-2"
          disabled={!valid() || submitting}
          onClick={confirm}
        >
          {submitting
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</>
            : <><Check className="h-4 w-4" /> Confirm {selRooms.size > 1 ? `${selRooms.size} Bookings` : 'Booking'}</>
          }
        </Button>
        <Button variant="outline" className="w-full" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}

// ---- Success Banner ----
function SuccessBanner({ groupId, count, onDismiss }: { groupId: string; count: number; onDismiss: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 mb-4">
      <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
      <div className="flex-1">
        <span className="font-semibold">{count} booking{count > 1 ? 's' : ''} confirmed!</span>
        {count > 1 && <span className="text-green-600 ml-1">Group #{groupId.slice(-6).toUpperCase()}</span>}
      </div>
      <Link href="/admin/reservations" className="flex items-center gap-1 text-green-700 font-medium hover:underline">
        View <ArrowRight className="h-3.5 w-3.5" />
      </Link>
      <button onClick={onDismiss} className="text-green-400 hover:text-green-700 ml-1">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ---- Legend Swatch ----
function LegendSwatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className={cn('inline-block h-4 w-4 rounded-sm', className)} />
      {label}
    </span>
  );
}

// ---- Skeleton ----
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

// ---- Main Calendar (inner — only ever runs on the client, never SSR) ----
function AvailabilityCalendarInner() {
  const [anchor, setAnchor] = useState<Date>(() => startOfDay(new Date()));
  const [rooms, setRooms] = useState<RoomAvailability[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selection state
  const [selStart, setSelStart] = useState<string | null>(null);
  const [selEnd, setSelEnd] = useState<string | null>(null);
  const [selRooms, setSelRooms] = useState<Set<string>>(new Set());
  // When a selection is started by clicking a specific room's cell, remember
  // that room so we auto-select ONLY it (not all 18). Null = started from a
  // date-column header → select all available rooms (whole-property block).
  const [selAnchorRoom, setSelAnchorRoom] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [success, setSuccess] = useState<{ groupId: string; count: number } | null>(null);

  const days = useMemo(() => Array.from({ length: DAYS_VISIBLE }, (_, i) => addDays(anchor, i)), [anchor]);
  const startKey = toKey(days[0]);
  const endKey = toKey(days[days.length - 1]);
  const todayKey = toKey(startOfDay(new Date()));

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/admin/availability?startDate=${startKey}&endDate=${endKey}`, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Error ${res.status}`);
        return res.json();
      })
      .then((data) => { if (!cancelled) setRooms(data.rooms); })
      .catch((err) => { if (!cancelled) { setError(err.message); setRooms(null); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [startKey, endKey]);

  const goPrev = () => { setAnchor((a) => addDays(a, -NAV_STEP_DAYS)); clearSelection(); };
  const goNext = () => { setAnchor((a) => addDays(a, NAV_STEP_DAYS)); clearSelection(); };
  const goToday = () => { setAnchor(startOfDay(new Date())); clearSelection(); };

  function clearSelection() {
    setSelStart(null); setSelEnd(null); setSelRooms(new Set()); setShowPanel(false);
  }

  // Determine which date keys are in the selected range
  const selectedRange = useMemo<Set<string>>(() => {
    if (!selStart) return new Set();
    const end = selEnd ?? selStart;
    const [a, b] = selStart <= end ? [selStart, end] : [end, selStart];
    return new Set(datesBetween(a, b));
  }, [selStart, selEnd]);

  // Which rooms are fully available in the selected range
  const availableInRange = useCallback((room: RoomAvailability): boolean => {
    if (!selStart || !selEnd) return false;
    const [a, b] = selStart <= selEnd ? [selStart, selEnd] : [selEnd, selStart];
    const rangeDates = datesBetween(a, b);
    // Last date (check-out day) doesn't need to be available
    const checkDates = rangeDates.slice(0, -1);
    return checkDates.every((d) => !room.bookedDates.includes(d));
  }, [selStart, selEnd]);

  // Auto-select available rooms when range is set, then open panel
  useEffect(() => {
    if (selStart && selEnd && rooms) {
      const available = rooms.filter(availableInRange);
      // Cell-started selection → only the room they clicked. Header-started
      // selection (anchor null) → all available rooms.
      const autoSel = selAnchorRoom
        ? new Set(available.filter((r) => r.id === selAnchorRoom).map((r) => r.id))
        : new Set(available.map((r) => r.id));
      setSelRooms(autoSel);
      if (autoSel.size > 0) setShowPanel(true);
    }
  }, [selStart, selEnd, rooms, availableInRange, selAnchorRoom]);

  function getCellStatus(room: RoomAvailability, dateKey: string): CellStatus {
    if (room.bookedDates.includes(dateKey)) return 'BOOKED';
    if (dateKey === todayKey) {
      const s = room.status;
      if (s === 'CLEANING') return 'CLEANING';
      if (s === 'MAINTENANCE') return 'MAINTENANCE';
      if (s === 'OUT_OF_ORDER') return 'OUT_OF_ORDER';
      if (s === 'OCCUPIED') return 'BOOKED';
    }
    return 'AVAILABLE';
  }

  // Handle clicking a date column header
  function handleDateHeaderClick(dateKey: string) {
    if (!selStart || (selStart && selEnd)) {
      // Start fresh selection — from the date header means "all rooms"
      setSelStart(dateKey);
      setSelEnd(null);
      setSelRooms(new Set());
      setSelAnchorRoom(null);
      setShowPanel(false);
    } else {
      // Set end date — panel will open via useEffect after rooms are auto-selected
      if (dateKey === selStart) return;
      setSelEnd(dateKey);
    }
  }

  // Handle clicking a room cell
  function handleCellClick(room: RoomAvailability, dateKey: string, status: CellStatus) {
    if (status !== 'AVAILABLE') return;

    if (!selStart || (selStart && selEnd)) {
      // Start new selection at this date, anchored to THIS room only
      setSelStart(dateKey);
      setSelEnd(null);
      setSelRooms(new Set());
      setSelAnchorRoom(room.id);
      setShowPanel(false);
    } else {
      // Extend range to this date — panel will open via useEffect
      if (dateKey !== selStart) {
        setSelEnd(dateKey);
      }
    }
  }

  // Toggle a room's selection manually
  function toggleRoom(roomId: string, isAvailable: boolean) {
    if (!isAvailable) return;
    setSelRooms((prev) => {
      const next = new Set(prev);
      if (next.has(roomId)) next.delete(roomId); else next.add(roomId);
      return next;
    });
  }

  const hasSelection = selStart && selEnd;
  const normalStart = hasSelection ? (selStart! <= selEnd! ? selStart! : selEnd!) : null;
  const normalEnd = hasSelection ? (selStart! <= selEnd! ? selEnd! : selStart!) : null;

  const rangeLabel = `${days[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${days[days.length - 1].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return (
    <div className="space-y-4 relative">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Availability Calendar</h1>
          <p className="text-sm text-gray-500">{rangeLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={goPrev}><ChevronLeft className="mr-1 h-4 w-4" />Prev week</Button>
          <Button variant="outline" size="sm" onClick={goToday}><RefreshCw className="mr-1 h-4 w-4" />Today</Button>
          <Button variant="outline" size="sm" onClick={goNext}>Next week<ChevronRight className="ml-1 h-4 w-4" /></Button>
          {hasSelection && (
            <Button size="sm" variant="outline" onClick={clearSelection} className="border-red-200 text-red-600 hover:bg-red-50">
              <X className="h-3.5 w-3.5 mr-1" />Clear
            </Button>
          )}
          <Link href="/admin/reservations/new">
            <Button size="sm" className="bg-teal-600 hover:bg-teal-700">
              <Plus className="mr-1 h-4 w-4" />New Booking
            </Button>
          </Link>
        </div>
      </div>

      {/* Success banner */}
      {success && (
        <SuccessBanner groupId={success.groupId} count={success.count} onDismiss={() => { setSuccess(null); clearSelection(); }} />
      )}

      {/* Selection hint / status bar */}
      {!hasSelection && !success && (
        <div className="flex items-center gap-2 rounded-lg border border-teal-100 bg-teal-50 px-4 py-2 text-xs text-teal-800">
          <Info className="h-3.5 w-3.5 shrink-0" />
          {selStart
            ? <><strong>Check-in: {formatDateShort(new Date(selStart))} selected.</strong>&nbsp;Now click a second date to set check-out and open the booking panel.</>
            : 'Click a date column header to set check-in, then click a second date to set check-out. Available rooms will be pre-selected.'}
        </div>
      )}
      {hasSelection && (
        <div className="flex items-center gap-3 rounded-lg border border-teal-200 bg-teal-50 px-4 py-2 text-sm text-teal-800">
          <Calendar className="h-4 w-4 shrink-0 text-teal-600" />
          <span>
            <strong>{formatDateShort(new Date(normalStart!))}</strong> → <strong>{formatDateShort(new Date(normalEnd!))}</strong>
            <span className="text-teal-600 ml-2">· {calcNights(normalStart!, normalEnd!)} night{calcNights(normalStart!, normalEnd!) !== 1 ? 's' : ''}</span>
          </span>
          <span className="ml-2 flex items-center gap-1 text-teal-600">
            <Users className="h-3.5 w-3.5" />
            {selRooms.size} room{selRooms.size !== 1 ? 's' : ''} selected
          </span>
          {selRooms.size > 0 && (
            <Button size="sm" className="ml-auto bg-teal-600 hover:bg-teal-700 h-7 text-xs"
              onClick={() => setShowPanel(true)}>
              Book {selRooms.size > 1 ? `${selRooms.size} Rooms` : '1 Room'} <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 rounded-md border border-gray-200 bg-white px-4 py-2 text-xs text-gray-700">
        <LegendSwatch className="bg-green-500" label="Available" />
        <LegendSwatch className="bg-red-500" label="Booked" />
        <LegendSwatch className="bg-yellow-400" label="Cleaning" />
        <LegendSwatch className="bg-orange-500" label="Maintenance" />
        <LegendSwatch className="bg-gray-400" label="Out of order" />
        <span className="ml-auto flex items-center gap-2 text-teal-700">
          <span className="inline-block h-4 w-4 rounded-sm bg-teal-200 ring-2 ring-teal-500 ring-offset-1" />
          Selected range
        </span>
        <span className="flex items-center gap-2">
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
              {hasSelection ? (
                <span className="text-teal-700 text-[10px]">✓ tick rooms to include</span>
              ) : 'Room'}
            </div>
            <div className="flex">
              {days.map((d) => {
                const key = toKey(d);
                const isToday = key === todayKey;
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                const inRange = selectedRange.has(key);
                const isRangeStart = key === normalStart;
                const isRangeEnd = key === normalEnd;
                const isSelecting = selStart && !selEnd && key === selStart;

                return (
                  <div
                    key={key}
                    onClick={() => handleDateHeaderClick(key)}
                    title={`Click to ${!selStart || selEnd ? 'start' : 'end'} selection at ${formatDateLong(d)}`}
                    className={cn(
                      'flex h-12 w-8 flex-col items-center justify-center border-r border-gray-100 text-[10px] leading-tight cursor-pointer select-none transition-colors',
                      isWeekend ? 'bg-gray-100 hover:bg-gray-200' : 'hover:bg-teal-50',
                      inRange && 'bg-teal-100 hover:bg-teal-200',
                      (isRangeStart || isSelecting) && 'bg-teal-500 text-white rounded-l',
                      isRangeEnd && 'bg-teal-500 text-white rounded-r',
                      isToday && !inRange ? 'text-cyan-700 font-bold' : '',
                    )}
                  >
                    <span className={cn('text-sm font-semibold', inRange && !(isRangeStart || isRangeEnd) ? 'text-teal-700' : '')}>
                      {d.getDate()}
                    </span>
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

          {!loading && !error && rooms?.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-gray-500">No rooms found.</div>
          )}

          {!loading && !error && rooms && rooms.length > 0 && (
            <div>
              {rooms.map((room) => {
                const isRoomSelected = selRooms.has(room.id);
                const isRoomAvailable = hasSelection ? availableInRange(room) : true;

                return (
                  <div
                    key={room.id}
                    className={cn(
                      'flex border-b border-gray-100 last:border-b-0 transition-colors',
                      isRoomSelected && 'bg-teal-50/50',
                      !isRoomSelected && hasSelection && isRoomAvailable && 'hover:bg-gray-50/50',
                    )}
                  >
                    {/* Room info with checkbox */}
                    <div className="w-64 shrink-0 border-r border-gray-200 px-3 py-2 flex items-start gap-2">
                      {/* Checkbox — always shown but only interactive when range is set */}
                      <div className="pt-0.5">
                        <button
                          onClick={() => toggleRoom(room.id, isRoomAvailable)}
                          disabled={!hasSelection || !isRoomAvailable}
                          title={
                            !hasSelection ? 'Select a date range first'
                            : !isRoomAvailable ? 'Room not available for this date range'
                            : isRoomSelected ? 'Remove from booking' : 'Add to booking'
                          }
                          className={cn(
                            'w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0',
                            !hasSelection && 'border-gray-200 bg-gray-50 cursor-default',
                            hasSelection && !isRoomAvailable && 'border-gray-200 bg-gray-100 cursor-not-allowed opacity-50',
                            hasSelection && isRoomAvailable && !isRoomSelected && 'border-gray-300 hover:border-teal-400 cursor-pointer',
                            hasSelection && isRoomAvailable && isRoomSelected && 'bg-teal-600 border-teal-600 cursor-pointer',
                          )}
                        >
                          {isRoomSelected && <Check className="h-3 w-3 text-white" />}
                        </button>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className={cn('text-sm font-semibold', isRoomSelected ? 'text-teal-700' : 'text-gray-900')}>
                            Room {room.number}
                          </span>
                          <Badge variant="outline" className="text-[10px] border-cyan-200 text-cyan-700 bg-cyan-50">
                            {room.type}
                          </Badge>
                        </div>
                        <div className="truncate text-xs text-gray-500">{room.name}</div>
                        <div className="mt-0.5 text-xs font-medium text-cyan-700">
                          ${room.basePrice}/night
                          {hasSelection && isRoomAvailable && (
                            <span className="text-gray-400 font-normal ml-1">
                              (${(room.basePrice * calcNights(normalStart!, normalEnd!)).toFixed(0)} total)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Day cells */}
                    <div className="flex">
                      {days.map((d) => {
                        const key = toKey(d);
                        const status = getCellStatus(room, key);
                        const isToday = key === todayKey;
                        const inRange = selectedRange.has(key);
                        const isStart = key === normalStart;
                        const isEnd = key === normalEnd;
                        const tooltip = `Room ${room.number} • ${formatDateLong(d)} — ${status}`;

                        return (
                          <div
                            key={key}
                            title={tooltip}
                            onClick={() => handleCellClick(room, key, status)}
                            className={cn(
                              'm-0.5 h-8 w-7 rounded-sm transition-all',
                              cellColor[status],
                              cellHover[status],
                              // Range highlight overlay for available cells
                              inRange && status === 'AVAILABLE' && !isRoomSelected && 'opacity-60 ring-1 ring-teal-400',
                              inRange && status === 'AVAILABLE' && isRoomSelected && 'ring-2 ring-teal-600 brightness-90',
                              // Range start/end markers
                              (isStart || isEnd) && status === 'AVAILABLE' && 'ring-2 ring-teal-600',
                              isToday && !inRange && 'ring-2 ring-cyan-400 ring-offset-1',
                            )}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Booking panel overlay */}
      {showPanel && hasSelection && rooms && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setShowPanel(false)} />
          <BookingPanel
            selStart={normalStart!}
            selEnd={normalEnd!}
            selRooms={selRooms}
            rooms={rooms}
            onClose={() => setShowPanel(false)}
            onSuccess={(groupId, count) => {
              setShowPanel(false);
              setSuccess({ groupId, count });
              clearSelection();
              // Refresh availability data
              setRooms(null);
              setLoading(true);
              fetch(`/api/admin/availability?startDate=${startKey}&endDate=${endKey}`, { cache: 'no-store' })
                .then((r) => r.json())
                .then((d) => setRooms(d.rooms ?? []))
                .finally(() => setLoading(false));
            }}
          />
        </>
      )}
    </div>
  );
}

// ---- Exported shell — defers inner calendar to client-only to avoid SSR timezone mismatch ----
export function AvailabilityCalendar() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
        <CalendarSkeleton />
      </div>
    );
  }

  return <AvailabilityCalendarInner />;
}
