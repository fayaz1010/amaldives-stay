'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Search, X, ChevronDown } from 'lucide-react';

interface Booking {
  id: string;
  confirmationNumber: string;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
  guest: { id: string; name: string | null; email: string };
  room: { id: string; number: string; name: string | null };
}

interface Staff {
  id: string;
  name: string | null;
}

interface AddArrivalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: Staff[];
  onCreated: () => void;
  /** When set, auto-selects this booking on open */
  preselectedBookingId?: string;
  /** Default date to pre-fill scheduledArrival (YYYY-MM-DD) */
  defaultDate?: string;
}

export const TRANSPORT_TYPES = [
  { value: 'SEAPLANE',         label: '🛩️ Seaplane' },
  { value: 'DOMESTIC_FLIGHT',  label: '✈️ Domestic Flight' },
  { value: 'SPEEDBOAT',        label: '🚤 Speedboat' },
  { value: 'CHARTER_BOAT',     label: '⛵ Charter Boat' },
  { value: 'FERRY',            label: '🚢 Ferry' },
  { value: 'SELF_ARRANGED',    label: '👤 Self Arranged' },
  { value: 'OTHER',            label: '📦 Other' },
];

export function AddArrivalModal({
  open, onOpenChange, staff, onCreated, preselectedBookingId, defaultDate,
}: AddArrivalModalProps) {
  const [submitting, setSubmitting] = useState(false);

  // Booking picker state
  const [query, setQuery] = useState('');
  const [listBookings, setListBookings] = useState<Booking[]>([]);
  const [listTotal, setListTotal] = useState(0);
  const [listOffset, setListOffset] = useState(0);
  const [listHasMore, setListHasMore] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Form state
  const [transportType, setTransportType] = useState('SPEEDBOAT');
  const [transportRef, setTransportRef] = useState('');
  const [transportCost, setTransportCost] = useState('');
  const [costPaid, setCostPaid] = useState(false);
  const [pickupBy, setPickupBy] = useState('STAFF');
  const [pickupStaffId, setPickupStaffId] = useState('');
  const [pickupVendor, setPickupVendor] = useState('');
  const [scheduledArrival, setScheduledArrival] = useState('');
  const [luggageCount, setLuggageCount] = useState('');
  const [jettyTransport, setJettyTransport] = useState('');
  const [specialNotes, setSpecialNotes] = useState('');

  // Reset on open/close
  useEffect(() => {
    if (!open) {
      setQuery(''); setListBookings([]); setSelectedBooking(null);
      setPickerOpen(false); setListOffset(0);
      setTransportType('SPEEDBOAT'); setTransportRef(''); setTransportCost('');
      setCostPaid(false); setPickupBy('STAFF'); setPickupStaffId('');
      setPickupVendor(''); setScheduledArrival(''); setLuggageCount('');
      setJettyTransport(''); setSpecialNotes('');
    } else {
      // Pre-fill date
      if (defaultDate) {
        setScheduledArrival(`${defaultDate}T12:00`);
      }
      // If preselectedBookingId is given, fetch it
      if (preselectedBookingId) {
        fetch(`/api/admin/arrivals/bookings?id=${preselectedBookingId}`)
          .then((r) => r.json())
          .then((d) => {
            const found = (d.bookings ?? [])[0];
            if (found) setSelectedBooking(found);
          })
          .catch(() => {});
      } else {
        // Load default list
        loadList(0, '');
        setPickerOpen(true);
      }
    }
  }, [open]);

  async function loadList(off: number, q: string) {
    setListLoading(true);
    try {
      const params = new URLSearchParams({ offset: String(off) });
      if (q) params.set('q', q);
      const res = await fetch(`/api/admin/arrivals/bookings?${params}`);
      const data = await res.json();
      if (off === 0) {
        setListBookings(data.bookings ?? []);
      } else {
        setListBookings((prev) => [...prev, ...(data.bookings ?? [])]);
      }
      setListTotal(data.total ?? 0);
      setListOffset(off);
      setListHasMore(data.hasMore ?? false);
    } catch { /* ignore */ }
    finally { setListLoading(false); }
  }

  // Debounced search
  useEffect(() => {
    if (!open || selectedBooking || !pickerOpen) return;
    const t = setTimeout(() => loadList(0, query), 280);
    return () => clearTimeout(t);
  }, [query, open, selectedBooking, pickerOpen]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBooking) { alert('Please select a booking'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/arrivals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: selectedBooking.id,
          transportType,
          transportRef: transportRef || null,
          transportCost: transportCost ? Number(transportCost) : null,
          costPaid,
          pickupBy,
          pickupStaffId: pickupBy === 'STAFF' && pickupStaffId ? pickupStaffId : null,
          pickupVendor: pickupBy === 'OUTSOURCED' && pickupVendor ? pickupVendor : null,
          scheduledArrival: scheduledArrival || null,
          luggageCount: luggageCount ? Number(luggageCount) : null,
          jettyTransport: jettyTransport || null,
          specialNotes: specialNotes || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Failed to create arrival');
      }
      onOpenChange(false);
      onCreated();
    } catch (err: any) {
      alert(err?.message || 'Failed to create arrival record');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Plan Guest Arrival</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1">

          {/* ── Booking picker ──────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label>Link to Booking *</Label>

            {selectedBooking ? (
              <div className="flex items-center justify-between p-3 border rounded-lg bg-cyan-50 border-cyan-300">
                <div>
                  <p className="font-semibold text-sm">{selectedBooking.guest.name || selectedBooking.guest.email}</p>
                  <p className="text-xs text-gray-600">
                    Room {selectedBooking.room.number} · #{selectedBooking.confirmationNumber} ·{' '}
                    Check-in {new Date(selectedBooking.checkInDate).toLocaleDateString()} ·{' '}
                    {selectedBooking.adults} adult{selectedBooking.adults > 1 ? 's' : ''}
                    {selectedBooking.children > 0 ? ` + ${selectedBooking.children} child` : ''}
                  </p>
                </div>
                <button type="button"
                  onClick={() => { setSelectedBooking(null); setPickerOpen(true); setQuery(''); loadList(0, ''); }}
                  className="text-xs text-red-500 hover:text-red-700 underline ml-3 flex items-center gap-0.5">
                  <X className="h-3 w-3" /> Change
                </button>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden shadow-sm">
                {/* Search bar */}
                <div className="flex items-center border-b px-3 bg-gray-50">
                  <Search className="h-4 w-4 text-gray-400 shrink-0" />
                  <input
                    autoFocus
                    className="flex-1 px-2.5 py-2.5 text-sm bg-transparent outline-none placeholder:text-gray-400"
                    placeholder="Search by name, room, confirmation…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  {query && (
                    <button type="button" onClick={() => { setQuery(''); loadList(0, ''); }}>
                      <X className="h-4 w-4 text-gray-400 hover:text-gray-700" />
                    </button>
                  )}
                </div>

                {/* List */}
                <div className="max-h-52 overflow-y-auto">
                  {listLoading && listBookings.length === 0 ? (
                    <div className="flex items-center justify-center py-6 text-gray-400 text-sm gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                    </div>
                  ) : listBookings.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm py-6">
                      {query ? 'No matches found.' : 'All upcoming guests have arrival plans.'}
                    </p>
                  ) : (
                    <>
                      {/* Group by date */}
                      {listBookings.reduce<{ date: string; bookings: Booking[] }[]>((groups, b) => {
                        const d = new Date(b.checkInDate).toLocaleDateString(undefined, {
                          weekday: 'short', day: 'numeric', month: 'short',
                        });
                        const existing = groups.find((g) => g.date === d);
                        if (existing) existing.bookings.push(b);
                        else groups.push({ date: d, bookings: [b] });
                        return groups;
                      }, []).map(({ date, bookings: group }) => (
                        <div key={date}>
                          <div className="sticky top-0 bg-gray-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-gray-500 border-b">
                            {date}
                          </div>
                          {group.map((b) => (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => { setSelectedBooking(b); setPickerOpen(false); }}
                              className="w-full text-left px-3 py-2.5 hover:bg-cyan-50 border-b last:border-0 transition-colors"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium text-sm text-gray-800">
                                  {b.guest.name || b.guest.email}
                                </span>
                                <span className="text-[10px] text-gray-400 font-mono shrink-0">
                                  #{b.confirmationNumber.slice(-6)}
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-500 mt-0.5">
                                Room {b.room.number}
                                {b.room.name ? ` — ${b.room.name}` : ''} ·{' '}
                                {b.adults} adult{b.adults > 1 ? 's' : ''}
                                {b.children > 0 ? ` + ${b.children} child` : ''}
                              </p>
                            </button>
                          ))}
                        </div>
                      ))}
                      {/* Load more */}
                      {listHasMore && (
                        <button
                          type="button"
                          onClick={() => loadList(listOffset + 20, query)}
                          disabled={listLoading}
                          className="w-full py-2 text-xs text-cyan-600 hover:text-cyan-800 hover:bg-cyan-50 border-t flex items-center justify-center gap-1.5 transition-colors"
                        >
                          {listLoading
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <ChevronDown className="h-3 w-3" />}
                          Load more ({listTotal - listOffset - listBookings.length} remaining)
                        </button>
                      )}
                      {!listHasMore && listBookings.length > 0 && (
                        <p className="text-center text-[10px] text-gray-400 py-1.5 border-t">
                          {listTotal} guest{listTotal !== 1 ? 's' : ''} total
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Transport ───────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Transport Type *</Label>
              <select value={transportType} onChange={(e) => setTransportType(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {TRANSPORT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Flight / Vessel Ref.</Label>
              <Input value={transportRef} onChange={(e) => setTransportRef(e.target.value)}
                placeholder="e.g. MV123, Q2-450" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Transport Cost (USD)</Label>
              <Input type="number" min="0" step="0.01" value={transportCost}
                onChange={(e) => setTransportCost(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>&nbsp;</Label>
              <label className="flex items-center gap-2 h-10 cursor-pointer">
                <input type="checkbox" checked={costPaid}
                  onChange={(e) => setCostPaid(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300" />
                <span className="text-sm">Cost already paid</span>
              </label>
            </div>
          </div>

          {/* ── Pickup ──────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Pickup By</Label>
              <select value={pickupBy} onChange={(e) => setPickupBy(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="STAFF">Our Staff</option>
                <option value="OUTSOURCED">Outsourced</option>
                <option value="SELF">Guest Self</option>
              </select>
            </div>
            {pickupBy === 'STAFF' ? (
              <div className="space-y-1.5">
                <Label>Assign Staff</Label>
                <select value={pickupStaffId} onChange={(e) => setPickupStaffId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">— Select staff —</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            ) : pickupBy === 'OUTSOURCED' ? (
              <div className="space-y-1.5">
                <Label>Vendor / Driver Name</Label>
                <Input value={pickupVendor} onChange={(e) => setPickupVendor(e.target.value)}
                  placeholder="Company or person name" />
              </div>
            ) : <div />}
          </div>

          {/* ── Schedule ────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Expected Arrival Time</Label>
              <Input type="datetime-local" value={scheduledArrival}
                onChange={(e) => setScheduledArrival(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Jetty → Property By</Label>
              <Input value={jettyTransport} onChange={(e) => setJettyTransport(e.target.value)}
                placeholder="e.g. Dhoni, Walk, Buggy" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Luggage Count</Label>
              <Input type="number" min="0" value={luggageCount}
                onChange={(e) => setLuggageCount(e.target.value)} placeholder="0" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Special Notes</Label>
            <Textarea value={specialNotes} onChange={(e) => setSpecialNotes(e.target.value)}
              placeholder="VIP requirements, dietary, accessibility needs…" rows={2} />
          </div>

          <DialogFooter className="border-t pt-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !selectedBooking}
              className="bg-cyan-600 hover:bg-cyan-700">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Arrival Plan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
