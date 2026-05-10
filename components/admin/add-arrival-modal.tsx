'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Search } from 'lucide-react';

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
}

export const TRANSPORT_TYPES = [
  { value: 'SEAPLANE', label: '🛩️ Seaplane' },
  { value: 'DOMESTIC_FLIGHT', label: '✈️ Domestic Flight' },
  { value: 'SPEEDBOAT', label: '🚤 Speedboat' },
  { value: 'CHARTER_BOAT', label: '⛵ Charter Boat' },
  { value: 'FERRY', label: '🚢 Ferry' },
  { value: 'SELF_ARRANGED', label: '👤 Self Arranged' },
  { value: 'OTHER', label: '📦 Other' },
];

export function AddArrivalModal({ open, onOpenChange, staff, onCreated }: AddArrivalModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

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

  useEffect(() => {
    if (!open) {
      setQuery(''); setBookings([]); setSelectedBooking(null);
      setTransportType('SPEEDBOAT'); setTransportRef(''); setTransportCost('');
      setCostPaid(false); setPickupBy('STAFF'); setPickupStaffId('');
      setPickupVendor(''); setScheduledArrival(''); setLuggageCount('');
      setJettyTransport(''); setSpecialNotes('');
    }
  }, [open]);

  useEffect(() => {
    if (!open || selectedBooking) return;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/admin/arrivals/bookings?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setBookings(data.bookings ?? []);
      } catch { /* ignore */ }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, open, selectedBooking]);

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
          {/* Booking search */}
          <div className="space-y-2">
            <Label>Link to Booking *</Label>
            {selectedBooking ? (
              <div className="flex items-center justify-between p-3 border rounded-lg bg-cyan-50 border-cyan-300">
                <div>
                  <p className="font-semibold text-sm">{selectedBooking.guest.name}</p>
                  <p className="text-xs text-gray-600">
                    Room {selectedBooking.room.number} · #{selectedBooking.confirmationNumber} ·{' '}
                    Check-in {new Date(selectedBooking.checkInDate).toLocaleDateString()} ·{' '}
                    {selectedBooking.adults} adult{selectedBooking.adults > 1 ? 's' : ''}
                    {selectedBooking.children > 0 ? ` + ${selectedBooking.children} child` : ''}
                  </p>
                </div>
                <button type="button" onClick={() => setSelectedBooking(null)}
                  className="text-xs text-red-500 hover:text-red-700 underline ml-3">
                  Change
                </button>
              </div>
            ) : (
              <div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    className="pl-9"
                    placeholder="Search by guest name, room, or confirmation…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                {(bookings.length > 0 || searching) && (
                  <div className="mt-1 border rounded-lg max-h-40 overflow-y-auto shadow-sm">
                    {searching ? (
                      <div className="p-3 text-center text-gray-400 text-sm">
                        <Loader2 className="h-4 w-4 animate-spin inline mr-1" /> Searching…
                      </div>
                    ) : bookings.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => { setSelectedBooking(b); setBookings([]); }}
                        className="w-full text-left px-3 py-2.5 hover:bg-gray-50 border-b last:border-0 text-sm"
                      >
                        <span className="font-medium">{b.guest.name}</span>
                        <span className="text-gray-500 ml-2 text-xs">
                          Room {b.room.number} · #{b.confirmationNumber} ·{' '}
                          {new Date(b.checkInDate).toLocaleDateString()}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Transport */}
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

          {/* Pickup */}
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

          {/* Schedule */}
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
