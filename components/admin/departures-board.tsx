'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Plus, Loader2, LogOut, DollarSign, Luggage, Anchor, Clock,
  CheckCircle2, ChevronLeft, ChevronRight as ChevronR, Pencil, CalendarDays,
} from 'lucide-react';
import { AddDepartureModal } from './add-departure-modal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DepartureRecord {
  id: string;
  status: string;
  transportType: string;
  transportRef?: string | null;
  transportCost?: number | null;
  costPaid: boolean;
  ticketsPurchased: boolean;
  seatNumbers?: string | null;
  scheduledDeparture?: string | Date | null;
  billSettledAt?: string | Date | null;
  luggageReadyAt?: string | Date | null;
  leftPropertyAt?: string | Date | null;
  arrivedJettyAt?: string | Date | null;
  boardedAt?: string | Date | null;
  luggageCount?: number | null;
  jettyTransport?: string | null;
  jettyTransportSeats?: number | null;
  jettyTransportCapacity?: number | null;
  specialNotes?: string | null;
  booking: {
    id: string;
    confirmationNumber: string;
    checkInDate: string | Date;
    checkOutDate: string | Date;
    totalAmount: number;
    paidAmount: number;
    adults: number;
    children: number;
    guest: { id: string; name: string | null; email: string };
    room: { id: string; number: string; name: string | null };
  };
  transportOption?: { id: string; name: string; contactName?: string | null; contactPhone?: string | null; schedule?: string | null } | null;
  jettyTransportOption?: { id: string; name: string; contactName?: string | null; contactPhone?: string | null; capacity?: number | null } | null;
}

interface UnplannedBooking {
  id: string;
  confirmationNumber: string;
  checkOutDate: string;
  adults: number;
  children: number;
  guest: { name: string | null; email: string };
  room: { number: string; name: string | null };
}

interface DeparturesBoardProps {
  records: DepartureRecord[];
  defaultTransportType?: string;
  defaultJettyTransport?: string;
}

// ─── Kanban Columns ───────────────────────────────────────────────────────────

const COLUMNS = [
  { key: 'SCHEDULED',  label: 'Scheduled',   color: 'bg-blue-50 border-blue-200',    header: 'text-blue-700',  dot: 'bg-blue-400' },
  { key: 'PREPARING',  label: 'Preparing',   color: 'bg-amber-50 border-amber-200',  header: 'text-amber-700', dot: 'bg-amber-400' },
  { key: 'AT_JETTY',   label: 'At Jetty',    color: 'bg-purple-50 border-purple-200', header: 'text-purple-700', dot: 'bg-purple-400' },
  { key: 'DEPARTED',   label: 'Departed',    color: 'bg-green-50 border-green-200',  header: 'text-green-700', dot: 'bg-green-500' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toYMD(d: Date) {
  return d.toISOString().slice(0, 10);
}

function transportEmoji(type: string) {
  const map: Record<string, string> = {
    SEAPLANE: '🛩️', DOMESTIC_FLIGHT: '✈️', FERRY: '🚢',
    SPEEDBOAT: '🚤', CHARTER_BOAT: '⛵', SELF_ARRANGED: '👤', OTHER: '📦',
  };
  return map[type] ?? '🚢';
}

function fmt(d: string | Date | null | undefined) {
  if (!d) return null;
  return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function buildDateStrip(anchor: Date): Array<{ date: Date; ymd: string; label: string; day: string }> {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(anchor);
    d.setDate(anchor.getDate() + i - 1); // yesterday, today, +1 … +5
    const ymd = toYMD(d);
    const todayYmd = toYMD(new Date());
    const tomorrowYmd = toYMD(new Date(Date.now() + 86400000));
    const label =
      ymd === todayYmd ? 'Today' :
      ymd === tomorrowYmd ? 'Tomorrow' :
      d.toLocaleDateString(undefined, { weekday: 'short' });
    const day = d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    return { date: d, ymd, label, day };
  });
}

// ─── Unplanned Panel ──────────────────────────────────────────────────────────

function UnplannedPanel({
  selectedDate,
  onPlan,
}: {
  selectedDate: string;
  onPlan: (bookingId: string) => void;
}) {
  const [bookings, setBookings] = useState<UnplannedBooking[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (off: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ date: selectedDate, offset: String(off) });
      const res = await fetch(`/api/admin/departures/bookings?${params}`);
      const data = await res.json();
      if (off === 0) setBookings(data.bookings ?? []);
      else setBookings((prev) => [...prev, ...(data.bookings ?? [])]);
      setTotal(data.total ?? 0);
      setOffset(off);
      setHasMore(data.hasMore ?? false);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => { load(0); }, [load]);

  if (total === 0 && !loading) return null;

  return (
    <div className="mx-6 mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
      <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-2">
        ⚠ {total} guest{total !== 1 ? 's' : ''} departing this day without a plan
      </p>
      <div className="space-y-1.5">
        {bookings.map((b) => (
          <div key={b.id} className="flex items-center justify-between bg-white border border-amber-100 rounded-lg px-3 py-2">
            <div>
              <p className="text-sm font-medium">{b.guest.name || b.guest.email}</p>
              <p className="text-[11px] text-gray-500">
                Room {b.room.number} · #{b.confirmationNumber} ·{' '}
                {b.adults} adult{b.adults > 1 ? 's' : ''}{b.children > 0 ? ` +${b.children}` : ''}
              </p>
            </div>
            <Button size="sm" className="h-7 text-xs bg-teal-600 hover:bg-teal-700"
              onClick={() => onPlan(b.id)}>
              Plan
            </Button>
          </div>
        ))}
        {loading && <div className="flex justify-center py-2"><Loader2 className="h-4 w-4 animate-spin text-amber-600" /></div>}
        {hasMore && (
          <button onClick={() => load(offset + 20)} disabled={loading}
            className="w-full text-xs text-amber-700 hover:text-amber-900 py-1.5 text-center border-t border-amber-100 mt-1">
            Load more ({total - offset - bookings.length} remaining)
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Departure Card ───────────────────────────────────────────────────────────

function DepartureCard({
  record,
  onUpdate,
  onEdit,
}: {
  record: DepartureRecord;
  onUpdate: (id: string, data: any) => Promise<void>;
  onEdit: (record: DepartureRecord) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function action(data: any) {
    setBusy(true);
    await onUpdate(record.id, data);
    setBusy(false);
  }

  const balance = record.booking.totalAmount - record.booking.paidAmount;
  const isNeedsTicket = ['DOMESTIC_FLIGHT', 'SEAPLANE', 'FERRY'].includes(record.transportType);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-3 space-y-2.5">
        {/* Guest header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-sm leading-tight">{record.booking.guest.name}</p>
            <p className="text-[11px] text-gray-500">
              Room {record.booking.room.number} · {record.booking.adults}A
              {record.booking.children > 0 ? `+${record.booking.children}C` : ''}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => onEdit(record)}
              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700" title="Edit plan">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-100 text-teal-700">
              #{record.booking.confirmationNumber.slice(-6)}
            </span>
          </div>
        </div>

        {/* Scheduled time */}
        {record.scheduledDeparture && (
          <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
            <Clock className="h-3 w-3 text-gray-400" />
            Departure: {new Date(record.scheduledDeparture).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        )}

        {/* Transport */}
        <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
          <span>{transportEmoji(record.transportType)}</span>
          <span className="font-medium">{record.transportRef || record.transportType.replace('_', ' ')}</span>
          {record.transportCost != null && (
            <span className={`ml-auto flex items-center gap-0.5 ${record.costPaid ? 'text-green-600' : 'text-orange-500'}`}>
              <DollarSign className="h-3 w-3" />
              {record.transportCost.toFixed(0)} {record.costPaid ? '✓' : '⚠'}
            </span>
          )}
        </div>

        {/* Transport catalog info */}
        {record.transportOption && (
          <div className="text-[10px] text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-2 py-1 space-y-0.5">
            <p className="font-semibold truncate">📋 {record.transportOption.name}</p>
            {record.transportOption.schedule && <p>🕐 {record.transportOption.schedule}</p>}
            {record.transportOption.contactName && (
              <p>👤 {record.transportOption.contactName}{record.transportOption.contactPhone ? `  📞 ${record.transportOption.contactPhone}` : ''}</p>
            )}
          </div>
        )}

        {/* Status badges */}
        <div className="flex flex-wrap gap-1.5">
          {isNeedsTicket && (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${record.ticketsPurchased ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              🎫 {record.ticketsPurchased ? 'Tickets ✓' : 'No tickets'}
            </span>
          )}
          {record.seatNumbers && (
            <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">💺 {record.seatNumbers}</span>
          )}
          {balance > 0 && (
            <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-semibold">
              💳 ${balance.toFixed(0)} due
            </span>
          )}
          {balance <= 0 && record.booking.totalAmount > 0 && (
            <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">💳 Paid</span>
          )}
          {record.luggageCount != null && (
            <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
              <Luggage className="h-2.5 w-2.5 inline mr-0.5" />{record.luggageCount}
            </span>
          )}
        </div>

        {/* Milestone timeline */}
        <div className="space-y-1">
          {record.status === 'SCHEDULED' && (
            <Button size="sm" onClick={() => action({ luggageReadyAt: true })} disabled={busy}
              className="h-7 w-full text-xs bg-amber-500 hover:bg-amber-600">
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : '🧳 Start Preparing'}
            </Button>
          )}
          {record.status === 'PREPARING' && (
            <div className="grid grid-cols-2 gap-1.5">
              {!record.billSettledAt && (
                <Button size="sm" variant="outline" onClick={() => action({ billSettledAt: true })} disabled={busy}
                  className="h-7 text-xs border-green-300 text-green-700 hover:bg-green-50">
                  💳 Bill Settled
                </Button>
              )}
              <Button size="sm" onClick={() => action({ leftPropertyAt: true, arrivedJettyAt: true })} disabled={busy}
                className="h-7 text-xs bg-purple-600 hover:bg-purple-700 col-span-2">
                {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : '🚤 At Jetty'}
              </Button>
            </div>
          )}
          {record.status === 'AT_JETTY' && (
            <Button size="sm" onClick={() => action({ boardedAt: true })} disabled={busy}
              className="h-7 w-full text-xs bg-green-600 hover:bg-green-700">
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <><CheckCircle2 className="h-3 w-3 mr-1" /> Confirm Departed</>}
            </Button>
          )}
          {record.status === 'DEPARTED' && (
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-green-600 font-medium py-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Departed {fmt(record.boardedAt)}
            </div>
          )}
        </div>

        {/* Timestamps */}
        <div className="grid grid-cols-2 gap-1 text-[10px] text-gray-400 border-t pt-1.5">
          {record.luggageReadyAt && <span>🧳 Ready {fmt(record.luggageReadyAt)}</span>}
          {record.billSettledAt && <span>💳 Settled {fmt(record.billSettledAt)}</span>}
          {record.leftPropertyAt && <span>🏠 Left {fmt(record.leftPropertyAt)}</span>}
          {record.arrivedJettyAt && <span>⚓ Jetty {fmt(record.arrivedJettyAt)}</span>}
          {record.boardedAt && <span>✈ Departed {fmt(record.boardedAt)}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Board ───────────────────────────────────────────────────────────────

export function DeparturesBoard({ records, defaultTransportType, defaultJettyTransport }: DeparturesBoardProps) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [preselectedBookingId, setPreselectedBookingId] = useState<string | undefined>();
  const [editRecord, setEditRecord] = useState<DepartureRecord | null>(null);

  const todayYmd = toYMD(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(todayYmd);
  const [stripAnchor, setStripAnchor] = useState<Date>(new Date());
  const dateStrip = buildDateStrip(stripAnchor);

  // Sidebar: next 30 days with departure counts
  const sidebarDates = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const ymd = toYMD(d);
      const count = records.filter((r) => {
        const dep = r.scheduledDeparture ?? r.booking.checkOutDate;
        return dep ? toYMD(new Date(dep)) === ymd : false;
      }).length;
      const isToday = ymd === todayYmd;
      return {
        ymd,
        label: isToday ? 'Today' : d.toLocaleDateString(undefined, { weekday: 'short' }),
        day: d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
        count,
      };
    });
  }, [records, todayYmd]);

  // Date-filtered records
  const filtered = selectedDate === 'all'
    ? records
    : records.filter((r) => {
        const d = r.scheduledDeparture ?? r.booking.checkOutDate;
        return d ? toYMD(new Date(d)) === selectedDate : false;
      });

  function countForDate(ymd: string) {
    return records.filter((r) => {
      const d = r.scheduledDeparture ?? r.booking.checkOutDate;
      return d ? toYMD(new Date(d)) === ymd : false;
    }).length;
  }

  function selectDate(ymd: string) {
    setSelectedDate(ymd);
    setStripAnchor(new Date(ymd + 'T12:00:00'));
  }

  async function updateRecord(id: string, data: any) {
    try {
      const res = await fetch(`/api/admin/departures/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Update failed');
      router.refresh();
    } catch {
      alert('Failed to update departure');
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">

      {/* ── Sidebar date list ──────────────────────────────────────────────── */}
      <aside className="w-44 shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
        <p className="px-3 pt-4 pb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
          Departures
        </p>
        <button
          onClick={() => setSelectedDate('all')}
          className={`w-full flex items-center justify-between px-3 py-2 text-left text-sm transition-colors ${
            selectedDate === 'all'
              ? 'bg-teal-50 border-r-2 border-teal-500 text-teal-700 font-semibold'
              : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <span>All dates</span>
          <span className="text-[10px] text-gray-400">{records.length}</span>
        </button>
        {sidebarDates.map(({ ymd, label, day, count }) => (
          <button
            key={ymd}
            onClick={() => selectDate(ymd)}
            className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${
              selectedDate === ymd
                ? 'bg-teal-50 border-r-2 border-teal-500 text-teal-700 font-semibold'
                : count > 0
                  ? 'text-gray-700 hover:bg-teal-50'
                  : 'text-gray-400 hover:bg-gray-50'
            }`}
          >
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide leading-none mb-0.5">
                {label}
              </p>
              <p className="text-sm font-medium leading-none">{day}</p>
            </div>
            {count > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                selectedDate === ymd ? 'bg-teal-200 text-teal-800' : 'bg-teal-100 text-teal-700'
              }`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </aside>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Departures</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Plan and track guest check-outs and return transport
            </p>
          </div>
          <Button onClick={() => { setPreselectedBookingId(undefined); setAddOpen(true); }}
            className="bg-teal-600 hover:bg-teal-700 gap-2">
            <Plus className="h-4 w-4" /> Plan Departure
          </Button>
        </div>

        {/* ── Date strip ──────────────────────────────────────────────────── */}
        <div className="bg-white border-b mx-6 mb-4 rounded-xl p-3 shadow-sm">
          <div className="flex items-center gap-2">
            {/* Prev week */}
            <button
              onClick={() => setStripAnchor((d) => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; })}
              className="p-1.5 rounded-lg border hover:bg-gray-50 text-gray-500">
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* Day buttons */}
            <div className="flex gap-1.5 flex-1 overflow-x-auto">
              {dateStrip.map(({ ymd, label, day }) => {
                const isSelected = selectedDate === ymd;
                const count = countForDate(ymd);
                return (
                  <button
                    key={ymd}
                    onClick={() => selectDate(ymd)}
                    className={`flex-shrink-0 flex flex-col items-center px-3 py-1.5 rounded-lg border-2 transition-all text-center min-w-[64px] ${
                      isSelected
                        ? 'border-teal-500 bg-teal-600 text-white shadow-sm'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-teal-300 hover:bg-teal-50'
                    }`}
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-wide leading-tight">{label}</span>
                    <span className="text-sm font-bold leading-tight">{day}</span>
                    {count > 0 && (
                      <span className={`text-[10px] font-bold px-1.5 rounded-full mt-0.5 ${
                        isSelected ? 'bg-white/30 text-white' : 'bg-teal-100 text-teal-700'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Next week */}
            <button
              onClick={() => setStripAnchor((d) => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; })}
              className="p-1.5 rounded-lg border hover:bg-gray-50 text-gray-500">
              <ChevronR className="h-4 w-4" />
            </button>

            {/* Date picker */}
            <div className="flex items-center gap-1 border rounded-lg px-2 py-1 text-xs text-gray-500 hover:border-teal-400 transition-colors">
              <CalendarDays className="h-3.5 w-3.5 text-gray-400" />
              <input
                type="date"
                value={selectedDate !== 'all' ? selectedDate : ''}
                onChange={(e) => { if (e.target.value) selectDate(e.target.value); }}
                className="text-xs border-0 p-0 outline-none bg-transparent w-[100px] cursor-pointer"
              />
            </div>

            {/* All button */}
            <button
              onClick={() => setSelectedDate('all')}
              className={`text-xs px-3 py-1.5 rounded-lg border-2 transition-colors shrink-0 ${
                selectedDate === 'all'
                  ? 'border-gray-500 bg-gray-700 text-white'
                  : 'border-gray-200 text-gray-600 hover:border-gray-400'
              }`}
            >
              All
            </button>
          </div>
        </div>

        {/* Unplanned panel */}
        {selectedDate !== 'all' && (
          <UnplannedPanel selectedDate={selectedDate}
            onPlan={(id) => { setPreselectedBookingId(id); setAddOpen(true); }} />
        )}

        {/* Kanban */}
        <div className="px-6 pb-6">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <LogOut className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p className="font-medium text-gray-500">No departures planned for this day</p>
              <p className="text-sm mt-1">Click "Plan Departure" to add one.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {COLUMNS.map((col) => {
                const colRecords = filtered.filter((r) => r.status === col.key);
                return (
                  <div key={col.key} className={`rounded-xl border ${col.color} p-3`}>
                    <div className={`flex items-center gap-2 mb-3 ${col.header}`}>
                      <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                      <span className="text-xs font-bold uppercase tracking-wide">{col.label}</span>
                      <span className="ml-auto text-xs font-bold">{colRecords.length}</span>
                    </div>
                    <div className="space-y-3">
                      {colRecords.map((r) => (
                        <DepartureCard key={r.id} record={r} onUpdate={updateRecord}
                          onEdit={(rec) => setEditRecord(rec)} />
                      ))}
                      {colRecords.length === 0 && (
                        <p className="text-[11px] text-gray-400 text-center py-4">—</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AddDepartureModal
        open={addOpen}
        onOpenChange={(o) => { setAddOpen(o); if (!o) setPreselectedBookingId(undefined); }}
        preselectedBookingId={preselectedBookingId}
        defaultDate={selectedDate !== 'all' ? selectedDate : undefined}
        defaultTransportType={defaultTransportType}
        defaultJettyTransport={defaultJettyTransport}
        onCreated={() => router.refresh()}
      />
      <AddDepartureModal
        open={editRecord !== null}
        onOpenChange={(o) => { if (!o) setEditRecord(null); }}
        editRecord={editRecord}
        onCreated={() => { setEditRecord(null); router.refresh(); }}
      />
    </div>
  );
}
