'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Plus, Loader2, Plane, Anchor, Clock, CalendarCheck,
  Luggage, MapPin, Key, Coffee, CheckCircle2, ChevronRight,
  DollarSign, User, AlertCircle,
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
  cardIssued: boolean;
  welcomeDrink: boolean;
  specialNotes?: string | null;
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
}

interface Staff {
  id: string;
  name: string | null;
}

interface ArrivalsBoardProps {
  arrivals: ArrivalRecord[];
  staff: Staff[];
}

// ─── Pipeline columns ─────────────────────────────────────────────────────────

const PIPELINE = [
  {
    key: 'SCHEDULED',
    title: 'Scheduled',
    icon: Clock,
    color: 'bg-gray-50 border-gray-200',
    badge: 'bg-gray-100 text-gray-700',
  },
  {
    key: 'IN_TRANSIT',
    title: 'In Transit',
    icon: Plane,
    color: 'bg-blue-50 border-blue-200',
    badge: 'bg-blue-100 text-blue-700',
  },
  {
    key: 'AT_JETTY',
    title: 'At Jetty',
    icon: Anchor,
    color: 'bg-yellow-50 border-yellow-200',
    badge: 'bg-yellow-100 text-yellow-700',
  },
  {
    key: 'AT_PROPERTY',
    title: 'At Property',
    icon: MapPin,
    color: 'bg-orange-50 border-orange-200',
    badge: 'bg-orange-100 text-orange-700',
  },
  {
    key: 'CHECKED_IN',
    title: 'Checked In',
    icon: CheckCircle2,
    color: 'bg-green-50 border-green-200',
    badge: 'bg-green-100 text-green-700',
  },
];

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

// ─── Individual card ──────────────────────────────────────────────────────────

function ArrivalCard({
  record,
  onUpdate,
}: {
  record: ArrivalRecord;
  onUpdate: (id: string, data: any) => Promise<void>;
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
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-700 shrink-0">
            #{record.booking.confirmationNumber.slice(-6)}
          </span>
        </div>

        {/* Transport */}
        <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
          <span className="font-medium">{transportLabel(record.transportType)}</span>
          {record.transportRef && (
            <span className="text-gray-400">· {record.transportRef}</span>
          )}
          {record.transportCost != null && (
            <span className={`ml-auto flex items-center gap-0.5 ${record.costPaid ? 'text-green-600' : 'text-orange-500'}`}>
              <DollarSign className="h-3 w-3" />
              {record.transportCost.toFixed(0)} {record.costPaid ? '✓' : '⚠ unpaid'}
            </span>
          )}
        </div>

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
            <ChevronRight className="h-3 w-3 shrink-0" />
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

        {/* Check-in milestones (AT_PROPERTY or CHECKED_IN) */}
        {(record.status === 'AT_PROPERTY' || record.status === 'CHECKED_IN') && (
          <div className="flex items-center gap-3 pt-1 border-t">
            <button
              onClick={() => action({ cardIssued: !record.cardIssued })}
              disabled={busy}
              className={`flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md transition-colors ${
                record.cardIssued
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500 hover:bg-yellow-50 hover:text-yellow-700'
              }`}
            >
              <Key className="h-3 w-3" />
              {record.cardIssued ? 'Card ✓' : 'Issue Card'}
            </button>
            <button
              onClick={() => action({ welcomeDrink: !record.welcomeDrink })}
              disabled={busy}
              className={`flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md transition-colors ${
                record.welcomeDrink
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500 hover:bg-yellow-50 hover:text-yellow-700'
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

// ─── Main Board ───────────────────────────────────────────────────────────────

export function ArrivalsBoard({ arrivals, staff }: ArrivalsBoardProps) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);

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

  const today = arrivals.filter((a) => {
    const d = a.scheduledArrival ?? a.booking.checkInDate;
    if (!d) return false;
    const date = new Date(d);
    const now = new Date();
    return date.toDateString() === now.toDateString();
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Arrivals</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {today.length} expected today · {arrivals.filter((a) => a.status !== 'CHECKED_IN').length} active
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="bg-cyan-600 hover:bg-cyan-700">
          <Plus className="h-4 w-4 mr-2" />
          Plan Arrival
        </Button>
      </div>

      {/* Pipeline columns — horizontal scroll on mobile */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {PIPELINE.map((col) => {
          const colArrivals = arrivals.filter((a) => a.status === col.key);
          const ColIcon = col.icon;

          return (
            <div
              key={col.key}
              className={`rounded-lg border-2 ${col.color} p-3 flex-shrink-0 w-64`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <ColIcon className="h-4 w-4 text-gray-600" />
                  <h2 className="font-semibold text-gray-800 text-sm">{col.title}</h2>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${col.badge}`}>
                  {colArrivals.length}
                </span>
              </div>

              <div className="space-y-2">
                {colArrivals.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-5">None</p>
                ) : (
                  colArrivals.map((a) => (
                    <ArrivalCard key={a.id} record={a} onUpdate={updateArrival} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <AddArrivalModal
        open={addOpen}
        onOpenChange={setAddOpen}
        staff={staff}
        onCreated={() => router.refresh()}
      />
    </div>
  );
}
