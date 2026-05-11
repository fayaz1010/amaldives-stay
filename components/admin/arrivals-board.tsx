'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Plus, Loader2, Plane, Anchor, Clock, CalendarCheck,
  Luggage, MapPin, Key, Coffee, CheckCircle2, ChevronRight,
  DollarSign, User, AlertCircle, ChevronLeft, ChevronRight as ChevronR,
  CalendarDays, Pencil, Menu, X,
} from 'lucide-react';
import { AddArrivalModal, TRANSPORT_TYPES } from './add-arrival-modal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ArrivalRecord {
  id: string;
  status: string;
  transportType: string;
  transportRef?: string | null;
  transportCost?: number | null;
  costPaid: boolean;
  pickupBy: string;
  pickupVendor?: string | null;
  scheduledArrival?: string | Date | null;
  departedAt?: string | Date | null;
  eta?: string | Date | null;
  arrivedJettyAt?: string | Date | null;
  arrivedPropertyAt?: string | Date | null;
  checkedInAt?: string | Date | null;
  luggageCount?: number | null;
  jettyTransport?: string | null;
  jettyTransportSeats?: number | null;
  jettyTransportCapacity?: number | null;
  cardIssued: boolean;
  welcomeDrink: boolean;
  specialNotes?: string | null;
  ticketsPurchased: boolean;
  seatNumbers?: string | null;
  airportPickupConfirmed: boolean;
  booking: {
    id: string;
    confirmationNumber: string;
    checkInDate: string | Date;
    checkOutDate: string | Date;
    adults: number;
    children: number;
    guest: { id: string; name: string | null; email: string };
    room: { id: string; number: string; name: string | null };
  };
  pickupStaff?: { id: string; name: string | null } | null;
  transportOption?: { id: string; name: string; contactName?: string | null; contactPhone?: string | null; schedule?: string | null } | null;
  jettyTransportOption?: { id: string; name: string; contactName?: string | null; contactPhone?: string | null; capacity?: number | null } | null;
}

interface UnplannedBooking {
  id: string;
  confirmationNumber: string;
  checkInDate: string;
  adults: number;
  children: number;
  guest: { id: string; name: string | null; email: string };
  room: { id: string; number: string; name: string | null };
}

interface Staff {
  id: string;
  name: string | null;
}

interface ArrivalsBoardProps {
  arrivals: ArrivalRecord[];
  staff: Staff[];
  defaultTransportType?: string;
  defaultJettyTransport?: string;
  unplannedByDate?: Record<string, number>;
}

// ─── Pipeline columns ─────────────────────────────────────────────────────────

const PIPELINE = [
  { key: 'SCHEDULED',   title: 'Scheduled',   icon: Clock,        color: 'bg-gray-50 border-gray-200',    badge: 'bg-gray-100 text-gray-700' },
  { key: 'IN_TRANSIT',  title: 'In Transit',  icon: Plane,        color: 'bg-blue-50 border-blue-200',    badge: 'bg-blue-100 text-blue-700' },
  { key: 'AT_JETTY',    title: 'At Jetty',    icon: Anchor,       color: 'bg-yellow-50 border-yellow-200', badge: 'bg-yellow-100 text-yellow-700' },
  { key: 'AT_PROPERTY', title: 'At Property', icon: MapPin,       color: 'bg-orange-50 border-orange-200', badge: 'bg-orange-100 text-orange-700' },
  { key: 'CHECKED_IN',  title: 'Checked In',  icon: CheckCircle2, color: 'bg-green-50 border-green-200',  badge: 'bg-green-100 text-green-700' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function transportLabel(type: string) {
  return TRANSPORT_TYPES.find((t) => t.value === type)?.label ?? type;
}
function fmtTime(d?: string | Date | null) {
  if (!d) return null;
  return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function fmtDateTime(d?: string | Date | null) {
  if (!d) return null;
  return new Date(d).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
}
function toYMD(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function buildDateStrip(anchor: Date): Array<{ date: Date; ymd: string; label: string; day: string }> {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(anchor);
    d.setDate(anchor.getDate() + i - 1); // -1, 0, +1 … +5
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

// ─── Individual card ──────────────────────────────────────────────────────────

function ArrivalCard({
  record,
  onUpdate,
  onEdit,
}: {
  record: ArrivalRecord;
  onUpdate: (id: string, data: any) => Promise<void>;
  onEdit: (record: ArrivalRecord) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function action(data: any) {
    setBusy(true);
    await onUpdate(record.id, data);
    setBusy(false);
  }

  const g = record.booking.guest;
  const r = record.booking.room;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-3 space-y-2.5">
        {/* Guest + room */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-sm leading-tight">{g.name}</p>
            <p className="text-[11px] text-gray-500">
              Room {r.number} · {record.booking.adults} adult{record.booking.adults > 1 ? 's' : ''}
              {record.booking.children > 0 ? ` +${record.booking.children}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => onEdit(record)}
              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"
              title="Edit arrival plan">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-700">
              #{record.booking.confirmationNumber.slice(-6)}
            </span>
          </div>
        </div>

        {/* Transport */}
        <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
          <span className="font-medium">{transportLabel(record.transportType)}</span>
          {record.transportRef && <span className="text-gray-400">· {record.transportRef}</span>}
          {record.transportCost != null && (
            <span className={`ml-auto flex items-center gap-0.5 ${record.costPaid ? 'text-green-600' : 'text-orange-500'}`}>
              <DollarSign className="h-3 w-3" />
              {record.transportCost.toFixed(0)} {record.costPaid ? '✓' : '⚠ unpaid'}
            </span>
          )}
        </div>

        {/* Transport option details (from catalog) */}
        {record.transportOption && (
          <div className="text-[10px] text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-2 py-1 space-y-0.5">
            <p className="font-semibold truncate">📋 {record.transportOption.name}</p>
            {record.transportOption.schedule && <p>🕐 {record.transportOption.schedule}</p>}
            {record.transportOption.contactName && (
              <p>👤 {record.transportOption.contactName}{record.transportOption.contactPhone ? `  📞 ${record.transportOption.contactPhone}` : ''}</p>
            )}
          </div>
        )}

        {/* Ticket + pickup confirmation badges */}
        {(record.ticketsPurchased !== undefined || record.airportPickupConfirmed !== undefined) && (
          <div className="flex flex-wrap gap-1.5">
            {['DOMESTIC_FLIGHT', 'SEAPLANE', 'FERRY'].includes(record.transportType) && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                record.ticketsPurchased
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                🎫 {record.ticketsPurchased ? 'Tickets ✓' : 'No tickets yet'}
              </span>
            )}
            {record.seatNumbers && (
              <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
                💺 {record.seatNumbers}
              </span>
            )}
            {['DOMESTIC_FLIGHT', 'SEAPLANE'].includes(record.transportType) && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                record.airportPickupConfirmed
                  ? 'bg-green-100 text-green-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                🛬 {record.airportPickupConfirmed ? 'Pickup ✓' : 'Pickup pending'}
              </span>
            )}
            {record.jettyTransport && record.jettyTransportCapacity != null && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                (record.jettyTransportSeats ?? 0) >= record.jettyTransportCapacity
                  ? 'bg-red-100 text-red-700'
                  : 'bg-teal-100 text-teal-700'
              }`}>
                🚤 {record.jettyTransportSeats ?? '?'}/{record.jettyTransportCapacity} seats
              </span>
            )}
          </div>
        )}

        {/* Jetty transport option contact */}
        {record.jettyTransportOption && (
          <div className="text-[10px] text-teal-700 bg-teal-50 border border-teal-100 rounded-lg px-2 py-1 space-y-0.5">
            <p className="font-semibold truncate">🚤 {record.jettyTransportOption.name}{record.jettyTransportOption.capacity ? ` · ${record.jettyTransportOption.capacity} pax` : ''}</p>
            {record.jettyTransportOption.contactName && (
              <p>👤 {record.jettyTransportOption.contactName}{record.jettyTransportOption.contactPhone ? `  📞 ${record.jettyTransportOption.contactPhone}` : ''}</p>
            )}
          </div>
        )}

        {/* Pickup */}
        <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
          <User className="h-3 w-3 shrink-0" />
          {record.pickupBy === 'STAFF'
            ? `Staff: ${record.pickupStaff?.name ?? 'unassigned'}`
            : record.pickupBy === 'OUTSOURCED'
            ? `Outsourced: ${record.pickupVendor ?? '—'}`
            : 'Guest self-arranged'}
        </div>

        {/* Schedule / timeline */}
        {record.scheduledArrival && (
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <Clock className="h-3 w-3 shrink-0" />
            Expected: {fmtDateTime(record.scheduledArrival)}
          </div>
        )}
        {record.eta && record.status === 'IN_TRANSIT' && (
          <div className="flex items-center gap-1.5 text-[11px] text-blue-600 font-medium">
            <ChevronR className="h-3 w-3 shrink-0" />
            ETA: {fmtTime(record.eta)}
          </div>
        )}
        {record.arrivedJettyAt && (
          <div className="flex items-center gap-1.5 text-[11px] text-yellow-700">
            <Anchor className="h-3 w-3 shrink-0" />
            Jetty: {fmtTime(record.arrivedJettyAt)}
            {record.luggageCount != null && (
              <span className="ml-1 flex items-center gap-0.5">
                <Luggage className="h-3 w-3" /> {record.luggageCount} bag{record.luggageCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}
        {record.arrivedPropertyAt && (
          <div className="flex items-center gap-1.5 text-[11px] text-orange-600">
            <MapPin className="h-3 w-3 shrink-0" />
            Arrived: {fmtTime(record.arrivedPropertyAt)}
            {record.jettyTransport && <span className="text-gray-400">· {record.jettyTransport}</span>}
          </div>
        )}
        {record.checkedInAt && (
          <div className="flex items-center gap-1.5 text-[11px] text-green-600">
            <CalendarCheck className="h-3 w-3 shrink-0" />
            Checked in: {fmtDateTime(record.checkedInAt)}
          </div>
        )}

        {/* Check-in milestones */}
        {(record.status === 'AT_PROPERTY' || record.status === 'CHECKED_IN') && (
          <div className="flex items-center gap-3 pt-1 border-t">
            <button
              onClick={() => action({ cardIssued: !record.cardIssued })}
              disabled={busy}
              className={`flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md transition-colors ${
                record.cardIssued ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500 hover:bg-yellow-50 hover:text-yellow-700'
              }`}
            >
              <Key className="h-3 w-3" />
              {record.cardIssued ? 'Card ✓' : 'Issue Card'}
            </button>
            <button
              onClick={() => action({ welcomeDrink: !record.welcomeDrink })}
              disabled={busy}
              className={`flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md transition-colors ${
                record.welcomeDrink ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500 hover:bg-yellow-50 hover:text-yellow-700'
              }`}
            >
              <Coffee className="h-3 w-3" />
              {record.welcomeDrink ? 'Drinks ✓' : 'Welcome Drink'}
            </button>
          </div>
        )}

        {/* Special notes */}
        {record.specialNotes && (
          <div className="flex items-start gap-1 text-[11px] text-amber-700 bg-amber-50 rounded px-2 py-1">
            <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
            <span className="line-clamp-2">{record.specialNotes}</span>
          </div>
        )}

        {/* Action button */}
        <div className="pt-1">
          {busy ? (
            <Button size="sm" className="h-7 text-xs w-full" disabled>
              <Loader2 className="h-3 w-3 animate-spin" />
            </Button>
          ) : record.status === 'SCHEDULED' ? (
            <Button size="sm" variant="outline" className="h-7 text-xs w-full"
              onClick={() => action({ departedAt: true })}>
              Mark Departed ✈
            </Button>
          ) : record.status === 'IN_TRANSIT' ? (
            <Button size="sm" variant="outline" className="h-7 text-xs w-full bg-yellow-50 border-yellow-300 text-yellow-800 hover:bg-yellow-100"
              onClick={() => action({ arrivedJettyAt: true })}>
              Arrived at Jetty ⚓
            </Button>
          ) : record.status === 'AT_JETTY' ? (
            <Button size="sm" variant="outline" className="h-7 text-xs w-full bg-orange-50 border-orange-300 text-orange-800 hover:bg-orange-100"
              onClick={() => action({ arrivedPropertyAt: true })}>
              Arrived at Property 🏨
            </Button>
          ) : record.status === 'AT_PROPERTY' ? (
            <Button size="sm"
              className="h-7 text-xs w-full bg-green-600 hover:bg-green-700"
              disabled={!record.cardIssued}
              title={!record.cardIssued ? 'Issue key card first' : ''}
              onClick={() => action({ checkedInAt: true, status: 'CHECKED_IN' })}>
              {!record.cardIssued ? '🔑 Issue card first' : '✅ Check In Guest'}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Unplanned arrivals panel ─────────────────────────────────────────────────

function UnplannedPanel({
  date,
  onPlan,
}: {
  date: string;
  onPlan: (bookingId: string) => void;
}) {
  const [bookings, setBookings] = useState<UnplannedBooking[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  async function load(off = 0) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/arrivals/bookings?date=${date}&offset=${off}`);
      const data = await res.json();
      if (off === 0) {
        setBookings(data.bookings ?? []);
      } else {
        setBookings((prev) => [...prev, ...(data.bookings ?? [])]);
      }
      setTotal(data.total ?? 0);
      setOffset(off);
      setHasMore(data.hasMore ?? false);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  useEffect(() => { load(0); }, [date]);

  if (loading && bookings.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400 py-3 px-4">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        All arrivals for this date have been planned.
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-amber-700 font-semibold mb-2">
        ⚠ {total} guest{total !== 1 ? 's' : ''} arriving this day without an arrival plan:
      </p>
      <div className="space-y-1">
        {bookings.map((b) => (
          <div key={b.id}
            className="flex items-center justify-between gap-3 bg-white border border-amber-200 rounded-lg px-3 py-2">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{b.guest.name || b.guest.email}</p>
              <p className="text-[11px] text-gray-500">
                Room {b.room.number} · {b.adults} adult{b.adults > 1 ? 's' : ''}
                {b.children > 0 ? ` +${b.children}` : ''} ·{' '}
                <span className="font-mono">#{b.confirmationNumber.slice(-6)}</span>
              </p>
            </div>
            <Button size="sm" variant="outline"
              className="h-7 text-xs shrink-0 border-cyan-400 text-cyan-700 hover:bg-cyan-50"
              onClick={() => onPlan(b.id)}>
              <Plus className="h-3 w-3 mr-1" />Plan
            </Button>
          </div>
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => load(offset + 20)}
          disabled={loading}
          className="w-full text-xs text-cyan-600 hover:text-cyan-800 py-1.5 border border-dashed border-cyan-300 rounded-lg hover:bg-cyan-50 transition-colors flex items-center justify-center gap-1.5"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          Load more ({total - offset - bookings.length} remaining)
        </button>
      )}
    </div>
  );
}

// ─── Main Board ───────────────────────────────────────────────────────────────

export function ArrivalsBoard({ arrivals, staff, defaultTransportType, defaultJettyTransport, unplannedByDate = {} }: ArrivalsBoardProps) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [preselectedBookingId, setPreselectedBookingId] = useState<string | undefined>();
  const [editRecord, setEditRecord] = useState<ArrivalRecord | null>(null);

  const todayYmd = toYMD(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(todayYmd);
  const [stripAnchor, setStripAnchor] = useState<Date>(new Date());
  const [datesPanelOpen, setDatesPanelOpen] = useState(false);

  const dateStrip = buildDateStrip(stripAnchor);

  // Filter kanban to selected date
  const filteredArrivals = selectedDate === 'all'
    ? arrivals
    : arrivals.filter((a) => {
        const d = a.scheduledArrival ?? a.booking.checkInDate;
        if (!d) return false;
        return toYMD(new Date(d)) === selectedDate;
      });

  async function updateArrival(id: string, data: any) {
    try {
      const res = await fetch(`/api/admin/arrivals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Update failed');
      router.refresh();
    } catch (err) {
      console.error(err);
      alert('Failed to update arrival');
    }
  }

  function planGuest(bookingId: string) {
    setPreselectedBookingId(bookingId);
    setAddOpen(true);
  }

  const today = arrivals.filter((a) => {
    const d = a.scheduledArrival ?? a.booking.checkInDate;
    if (!d) return false;
    return toYMD(new Date(d)) === todayYmd;
  });

  // Sidebar: next 30 days with arrival counts
  const sidebarDates = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const ymd = toYMD(d);
      const planned = arrivals.filter((a) => {
        const dep = a.scheduledArrival ?? a.booking.checkInDate;
        return dep ? toYMD(new Date(dep)) === ymd : false;
      }).length;
      const count = planned + (unplannedByDate[ymd] ?? 0);
      return {
        ymd,
        label: ymd === todayYmd ? 'Today' : d.toLocaleDateString(undefined, { weekday: 'short' }),
        day: d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
        count,
      };
    });
  }, [arrivals, todayYmd, unplannedByDate]);

  function selectDate(ymd: string) {
    setSelectedDate(ymd);
    setStripAnchor(new Date(ymd + 'T12:00:00'));
  }

  function selectDateAndClose(ymd: string) {
    selectDate(ymd);
    setDatesPanelOpen(false);
  }

  const sidebarContent = (
    <>
      <p className="px-3 pt-4 pb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
        Arrivals
      </p>
      <button
        onClick={() => { setSelectedDate('all'); setDatesPanelOpen(false); }}
        className={`w-full flex items-center justify-between px-3 py-2 text-left text-sm transition-colors ${
          selectedDate === 'all'
            ? 'bg-cyan-50 border-r-2 border-cyan-500 text-cyan-700 font-semibold'
            : 'text-gray-500 hover:bg-gray-50'
        }`}
      >
        <span>All dates</span>
        <span className="text-[10px] text-gray-400">{arrivals.length}</span>
      </button>
      {sidebarDates.map(({ ymd, label, day, count }) => (
        <button
          key={ymd}
          onClick={() => selectDateAndClose(ymd)}
          className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${
            selectedDate === ymd
              ? 'bg-cyan-50 border-r-2 border-cyan-500 text-cyan-700 font-semibold'
              : count > 0
                ? 'text-gray-700 hover:bg-cyan-50'
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
              selectedDate === ymd ? 'bg-cyan-200 text-cyan-800' : 'bg-cyan-100 text-cyan-700'
            }`}>
              {count}
            </span>
          )}
        </button>
      ))}
    </>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">

      {/* ── Sidebar date list (desktop) ────────────────────────────────────── */}
      <aside className="hidden md:block w-44 shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
        {sidebarContent}
      </aside>

      {/* ── Sidebar date list (mobile overlay) ─────────────────────────────── */}
      {datesPanelOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black/40" onClick={() => setDatesPanelOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-56 bg-white shadow-xl overflow-y-auto">
            <div className="flex items-center justify-between px-3 pt-3">
              <span className="text-sm font-semibold text-gray-700">Dates</span>
              <button onClick={() => setDatesPanelOpen(false)} className="p-1 rounded hover:bg-gray-100">
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => setDatesPanelOpen(true)}
            className="md:hidden p-1.5 rounded-lg border hover:bg-gray-50 text-gray-500 shrink-0"
            aria-label="Open dates panel"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900">Arrivals</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {today.length} expected today · {arrivals.filter((a) => a.status !== 'CHECKED_IN').length} active
            </p>
          </div>
        </div>
        <Button onClick={() => { setPreselectedBookingId(undefined); setAddOpen(true); }}
          className="bg-cyan-600 hover:bg-cyan-700 shrink-0">
          <Plus className="h-4 w-4 mr-2" />Plan Arrival
        </Button>
      </div>

      {/* ── Date strip ─────────────────────────────────────────────────────── */}
      <div className="bg-white border rounded-xl p-3 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          {/* Prev week */}
          <button onClick={() => setStripAnchor((d) => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; })}
            className="p-1.5 rounded-lg border hover:bg-gray-50 text-gray-500">
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Day buttons */}
          <div className="flex gap-1.5 flex-1 overflow-x-auto">
            {dateStrip.map(({ ymd, label, day }) => {
              const isSelected = selectedDate === ymd;
              const planned = arrivals.filter((a) => {
                const d = a.scheduledArrival ?? a.booking.checkInDate;
                return d ? toYMD(new Date(d)) === ymd : false;
              }).length;
              const unplanned = unplannedByDate[ymd] ?? 0;
              const count = planned + unplanned;
              return (
                <button
                  key={ymd}
                  onClick={() => selectDate(ymd)}
                  className={`flex-shrink-0 flex flex-col items-center px-3 py-1.5 rounded-lg border-2 transition-all text-center min-w-[64px] ${
                    isSelected
                      ? 'border-cyan-500 bg-cyan-600 text-white shadow-sm'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-cyan-300 hover:bg-cyan-50'
                  }`}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-wide leading-tight">{label}</span>
                  <span className="text-sm font-bold leading-tight">{day}</span>
                  {count > 0 && (
                    <span className={`text-[10px] font-bold px-1.5 rounded-full mt-0.5 ${
                      isSelected ? 'bg-white/30 text-white' : 'bg-cyan-100 text-cyan-700'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Next week */}
          <button onClick={() => setStripAnchor((d) => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; })}
            className="p-1.5 rounded-lg border hover:bg-gray-50 text-gray-500">
            <ChevronR className="h-4 w-4" />
          </button>

          {/* Date picker input */}
          <div className="flex items-center gap-1 border rounded-lg px-2 py-1 text-xs text-gray-500 hover:border-cyan-400 transition-colors">
            <CalendarDays className="h-3.5 w-3.5 text-gray-400" />
            <input
              type="date"
              value={selectedDate !== 'all' ? selectedDate : ''}
              onChange={(e) => {
                if (e.target.value) {
                  selectDate(e.target.value);
                }
              }}
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

        {/* Unplanned guests for selected date */}
        {selectedDate !== 'all' && (
          <UnplannedPanel
            key={selectedDate}
            date={selectedDate}
            onPlan={planGuest}
          />
        )}
      </div>

      {/* ── Pipeline kanban ─────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row gap-3 md:overflow-x-auto pb-2">
        {PIPELINE.map((col) => {
          const colArrivals = filteredArrivals.filter((a) => a.status === col.key);
          const totalForDate = arrivals.filter((a) => a.status === col.key).length;
          const ColIcon = col.icon;

          return (
            <div key={col.key} className={`rounded-lg border-2 ${col.color} p-3 w-full md:w-56 md:flex-shrink-0`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <ColIcon className="h-4 w-4 text-gray-600" />
                  <h2 className="font-semibold text-gray-800 text-sm">{col.title}</h2>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${col.badge}`}>
                  {colArrivals.length}
                  {selectedDate !== 'all' && totalForDate !== colArrivals.length && (
                    <span className="text-gray-400 font-normal"> / {totalForDate}</span>
                  )}
                </span>
              </div>
              <div className="space-y-2">
                {colArrivals.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-5">None</p>
                ) : (
                  colArrivals.map((a) => (
                    <ArrivalCard key={a.id} record={a} onUpdate={updateArrival} onEdit={(rec) => setEditRecord(rec)} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <AddArrivalModal
        open={addOpen}
        onOpenChange={(o) => { setAddOpen(o); if (!o) setPreselectedBookingId(undefined); }}
        staff={staff}
        preselectedBookingId={preselectedBookingId}
        defaultDate={selectedDate !== 'all' ? selectedDate : undefined}
        defaultTransportType={defaultTransportType}
        defaultJettyTransport={defaultJettyTransport}
        onCreated={() => router.refresh()}
      />

      {/* Edit modal */}
      <AddArrivalModal
        open={editRecord !== null}
        onOpenChange={(o) => { if (!o) setEditRecord(null); }}
        staff={staff}
        editRecord={editRecord}
        onCreated={() => { setEditRecord(null); router.refresh(); }}
      />
      </div>
    </div>
  );
}
