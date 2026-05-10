'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Search, X } from 'lucide-react';
import { TRANSPORT_TYPES } from './add-arrival-modal';

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

interface DepartureRecord {
  id: string;
  transportType: string;
  transportRef?: string | null;
  transportOptionId?: string | null;
  transportCost?: number | null;
  costPaid: boolean;
  ticketsPurchased: boolean;
  seatNumbers?: string | null;
  scheduledDeparture?: string | Date | null;
  luggageCount?: number | null;
  jettyTransport?: string | null;
  jettyTransportSeats?: number | null;
  jettyTransportCapacity?: number | null;
  jettyTransportOptionId?: string | null;
  specialNotes?: string | null;
  booking: {
    id: string;
    confirmationNumber: string;
    checkOutDate: string | Date;
    guest: { name: string | null; email: string };
    room: { number: string; name: string | null };
  };
}

interface AddDepartureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  preselectedBookingId?: string;
  defaultDate?: string;
  editRecord?: DepartureRecord | null;
}

export function AddDepartureModal({
  open, onOpenChange, onCreated, preselectedBookingId, defaultDate, editRecord,
}: AddDepartureModalProps) {
  const [submitting, setSubmitting] = useState(false);

  // Booking picker
  const [query, setQuery] = useState('');
  const [listBookings, setListBookings] = useState<Booking[]>([]);
  const [listTotal, setListTotal] = useState(0);
  const [listOffset, setListOffset] = useState(0);
  const [listHasMore, setListHasMore] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Form fields
  const [transportType, setTransportType] = useState('SPEEDBOAT');
  const [transportRef, setTransportRef] = useState('');
  const [transportOptionId, setTransportOptionId] = useState('');
  const [transportCost, setTransportCost] = useState('');
  const [costPaid, setCostPaid] = useState(false);
  const [ticketsPurchased, setTicketsPurchased] = useState(false);
  const [seatNumbers, setSeatNumbers] = useState('');
  const [scheduledDeparture, setScheduledDeparture] = useState('');
  const [luggageCount, setLuggageCount] = useState('');
  const [jettyTransport, setJettyTransport] = useState('');
  const [jettyTransportSeats, setJettyTransportSeats] = useState('');
  const [jettyTransportCapacity, setJettyTransportCapacity] = useState('');
  const [jettyTransportOptionId, setJettyTransportOptionId] = useState('');
  const [specialNotes, setSpecialNotes] = useState('');

  // Transport catalog
  const [catalogOptions, setCatalogOptions] = useState<Array<{
    id: string; type: string; name: string; operator?: string | null;
    contactName?: string | null; contactPhone?: string | null;
    capacity?: number | null; arrivalPoint?: string | null; departurePoint?: string | null; schedule?: string | null;
  }>>([]);

  // Reset / pre-fill on open
  useEffect(() => {
    if (!open) {
      setQuery(''); setListBookings([]); setSelectedBooking(null);
      setPickerOpen(false); setListOffset(0);
      setTransportType('SPEEDBOAT'); setTransportRef(''); setTransportOptionId('');
      setTransportCost(''); setCostPaid(false);
      setTicketsPurchased(false); setSeatNumbers('');
      setScheduledDeparture(''); setLuggageCount('');
      setJettyTransport(''); setJettyTransportSeats(''); setJettyTransportCapacity('');
      setJettyTransportOptionId(''); setSpecialNotes('');
    } else {
      fetch('/api/admin/transport-options')
        .then((r) => r.json())
        .then((d) => setCatalogOptions(d.options ?? []))
        .catch(() => {});

      if (editRecord) {
        setSelectedBooking(editRecord.booking as any);
        setTransportType(editRecord.transportType);
        setTransportRef(editRecord.transportRef ?? '');
        setTransportOptionId(editRecord.transportOptionId ?? '');
        setTransportCost(editRecord.transportCost != null ? String(editRecord.transportCost) : '');
        setCostPaid(editRecord.costPaid);
        setTicketsPurchased(editRecord.ticketsPurchased);
        setSeatNumbers(editRecord.seatNumbers ?? '');
        setScheduledDeparture(
          editRecord.scheduledDeparture
            ? new Date(editRecord.scheduledDeparture).toISOString().slice(0, 16)
            : ''
        );
        setLuggageCount(editRecord.luggageCount != null ? String(editRecord.luggageCount) : '');
        setJettyTransport(editRecord.jettyTransport ?? '');
        setJettyTransportSeats(editRecord.jettyTransportSeats != null ? String(editRecord.jettyTransportSeats) : '');
        setJettyTransportCapacity(editRecord.jettyTransportCapacity != null ? String(editRecord.jettyTransportCapacity) : '');
        setJettyTransportOptionId(editRecord.jettyTransportOptionId ?? '');
        setSpecialNotes(editRecord.specialNotes ?? '');
        setPickerOpen(false);
      } else {
        if (defaultDate) setScheduledDeparture(`${defaultDate}T10:00`);
        if (preselectedBookingId) {
          fetch(`/api/admin/departures/bookings?id=${preselectedBookingId}`)
            .then((r) => r.json())
            .then((d) => { const b = (d.bookings ?? [])[0]; if (b) setSelectedBooking(b); })
            .catch(() => {});
        } else {
          loadList(0, '');
          setPickerOpen(true);
        }
      }
    }
  }, [open]);

  const transportMeta = TRANSPORT_TYPES.find((t) => t.value === transportType);
  const needsTicket = transportMeta?.needsTicket ?? false;
  const inboundOptions = catalogOptions.filter((o) => o.type === transportType);
  const jettyOptions = catalogOptions.filter((o) =>
    ['SPEEDBOAT', 'CHARTER_BOAT', 'SEAPLANE', 'OTHER'].includes(o.type)
  );

  function applyInboundOption(id: string) {
    setTransportOptionId(id);
    const opt = catalogOptions.find((o) => o.id === id);
    if (!opt) return;
    if (opt.name) setTransportRef(opt.name);
    if (opt.capacity) setJettyTransportCapacity(String(opt.capacity));
  }

  function applyJettyOption(id: string) {
    setJettyTransportOptionId(id);
    const opt = catalogOptions.find((o) => o.id === id);
    if (!opt) return;
    if (opt.name) setJettyTransport(opt.name);
    if (opt.capacity) setJettyTransportCapacity(String(opt.capacity));
  }

  async function loadList(off: number, q: string) {
    setListLoading(true);
    try {
      const params = new URLSearchParams({ offset: String(off) });
      if (q) params.set('q', q);
      const res = await fetch(`/api/admin/departures/bookings?${params}`);
      const data = await res.json();
      if (off === 0) setListBookings(data.bookings ?? []);
      else setListBookings((prev) => [...prev, ...(data.bookings ?? [])]);
      setListTotal(data.total ?? 0);
      setListOffset(off);
      setListHasMore(data.hasMore ?? false);
    } finally {
      setListLoading(false);
    }
  }

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
      const payload = {
        bookingId: selectedBooking.id,
        transportType,
        transportRef: transportRef || null,
        transportOptionId: transportOptionId || null,
        transportCost: transportCost ? Number(transportCost) : null,
        costPaid,
        ticketsPurchased,
        seatNumbers: seatNumbers || null,
        scheduledDeparture: scheduledDeparture || null,
        luggageCount: luggageCount ? Number(luggageCount) : null,
        jettyTransport: jettyTransport || null,
        jettyTransportSeats: jettyTransportSeats ? Number(jettyTransportSeats) : null,
        jettyTransportCapacity: jettyTransportCapacity ? Number(jettyTransportCapacity) : null,
        jettyTransportOptionId: jettyTransportOptionId || null,
        specialNotes: specialNotes || null,
      };
      const res = editRecord
        ? await fetch(`/api/admin/departures/${editRecord.id}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
          })
        : await fetch('/api/admin/departures', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
          });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Save failed');
      }
      onOpenChange(false);
      onCreated();
    } catch (err: any) {
      alert(err?.message || 'Failed to save departure plan');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editRecord ? 'Edit Departure Plan' : 'Plan Guest Departure'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 py-1">

          {/* ── Booking picker ───────────────────────────────────────── */}
          <div className="space-y-2">
            <Label>Link to Booking *</Label>
            {editRecord ? (
              <div className="flex items-center p-3 border rounded-lg bg-gray-50 border-gray-200">
                <div>
                  <p className="font-semibold text-sm">{editRecord.booking.guest.name || editRecord.booking.guest.email}</p>
                  <p className="text-xs text-gray-600">
                    Room {editRecord.booking.room.number} · #{editRecord.booking.confirmationNumber} ·{' '}
                    Check-out {new Date(editRecord.booking.checkOutDate).toLocaleDateString()}
                  </p>
                </div>
                <span className="ml-auto text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">locked</span>
              </div>
            ) : selectedBooking ? (
              <div className="flex items-center justify-between p-3 border rounded-lg bg-teal-50 border-teal-300">
                <div>
                  <p className="font-semibold text-sm">{selectedBooking.guest.name || selectedBooking.guest.email}</p>
                  <p className="text-xs text-gray-600">
                    Room {selectedBooking.room.number} · #{selectedBooking.confirmationNumber} ·{' '}
                    Check-out {new Date(selectedBooking.checkOutDate).toLocaleDateString()} ·{' '}
                    {selectedBooking.adults} adult{selectedBooking.adults > 1 ? 's' : ''}
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
                <div className="flex items-center border-b px-3 bg-gray-50">
                  <Search className="h-4 w-4 text-gray-400 shrink-0" />
                  <input autoFocus
                    className="flex-1 px-2.5 py-2.5 text-sm bg-transparent outline-none placeholder:text-gray-400"
                    placeholder="Search by name, room, confirmation…"
                    value={query} onChange={(e) => setQuery(e.target.value)} />
                  {query && (
                    <button type="button" onClick={() => { setQuery(''); loadList(0, ''); }}>
                      <X className="h-4 w-4 text-gray-400 hover:text-gray-700" />
                    </button>
                  )}
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {listLoading && listBookings.length === 0 ? (
                    <div className="flex items-center justify-center py-5 text-gray-400 text-sm gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                    </div>
                  ) : listBookings.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm py-5">
                      {query ? 'No matches found.' : 'All guests have departure plans.'}
                    </p>
                  ) : (
                    <>
                      {listBookings.map((b) => (
                        <button key={b.id} type="button"
                          onClick={() => { setSelectedBooking(b); setPickerOpen(false); }}
                          className="w-full text-left px-3 py-2.5 hover:bg-teal-50 border-b last:border-b-0 transition-colors">
                          <p className="text-sm font-medium">{b.guest.name || b.guest.email}</p>
                          <p className="text-[11px] text-gray-500">
                            Room {b.room.number} · #{b.confirmationNumber} · Check-out {new Date(b.checkOutDate).toLocaleDateString()}
                          </p>
                        </button>
                      ))}
                      {listHasMore && (
                        <button type="button" onClick={() => loadList(listOffset + 20, query)} disabled={listLoading}
                          className="w-full py-2 text-xs text-teal-600 hover:bg-teal-50 border-t flex items-center justify-center gap-1">
                          {listLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : `Load more (${listTotal - listOffset - listBookings.length} remaining)`}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Outbound Transport ──────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Transport Type *</Label>
              <select value={transportType} onChange={(e) => { setTransportType(e.target.value); setTransportOptionId(''); }}
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

          {/* Catalog lookup */}
          {inboundOptions.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
              <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">📋 Select from Transfer Catalog</p>
              <select value={transportOptionId} onChange={(e) => applyInboundOption(e.target.value)}
                className="flex h-9 w-full rounded-md border border-amber-300 bg-white px-3 py-1 text-sm">
                <option value="">— Choose a saved transport —</option>
                {inboundOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}{o.operator ? ` · ${o.operator}` : ''}{o.capacity ? ` (${o.capacity} pax)` : ''}
                  </option>
                ))}
              </select>
              {transportOptionId && (() => {
                const opt = catalogOptions.find((o) => o.id === transportOptionId);
                if (!opt) return null;
                return (
                  <div className="text-[11px] text-amber-700 space-y-0.5">
                    {(opt.departurePoint || opt.arrivalPoint) && (
                      <p>📍 {opt.departurePoint}{opt.departurePoint && opt.arrivalPoint ? ' → ' : ''}{opt.arrivalPoint}</p>
                    )}
                    {opt.contactName && <p>👤 {opt.contactName}{opt.contactPhone ? `  📞 ${opt.contactPhone}` : ''}</p>}
                    {opt.schedule && <p>🕐 {opt.schedule}</p>}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Ticket confirmation */}
          {needsTicket && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-3">
              <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide">🎫 Return Tickets</p>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={ticketsPurchased}
                    onChange={(e) => setTicketsPurchased(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300" />
                  <span className="text-sm font-medium text-blue-800">Tickets purchased</span>
                </label>
                {ticketsPurchased
                  ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">✓ Confirmed</span>
                  : <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">⚠ Not yet purchased</span>
                }
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Seat Numbers <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Input value={seatNumbers} onChange={(e) => setSeatNumbers(e.target.value)}
                  placeholder="e.g. 12A, 12B" className="h-9 text-sm" />
              </div>
            </div>
          )}

          {/* Cost */}
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

          {/* Schedule + Jetty transport */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Scheduled Departure</Label>
              <Input type="datetime-local" value={scheduledDeparture}
                onChange={(e) => setScheduledDeparture(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Property → Jetty By</Label>
              <Input value={jettyTransport} onChange={(e) => setJettyTransport(e.target.value)}
                placeholder="e.g. Dhoni, Walk, Buggy" />
            </div>
          </div>

          {/* Jetty catalog lookup + capacity */}
          {jettyOptions.length > 0 && (
            <div className="rounded-lg border border-teal-200 bg-teal-50 p-3 space-y-2">
              <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide">📋 Select Jetty Transport from Catalog</p>
              <select value={jettyTransportOptionId} onChange={(e) => applyJettyOption(e.target.value)}
                className="flex h-9 w-full rounded-md border border-teal-300 bg-white px-3 py-1 text-sm">
                <option value="">— Choose a saved boat/vehicle —</option>
                {jettyOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}{o.capacity ? ` (${o.capacity} pax)` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {jettyTransport && (
            <div className="rounded-lg border border-teal-200 bg-teal-50 p-3 space-y-2">
              <p className="text-xs font-semibold text-teal-800 uppercase tracking-wide">🚤 Jetty Transport Seats</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Seats for this party</Label>
                  <Input type="number" min="1" max="50" value={jettyTransportSeats}
                    onChange={(e) => setJettyTransportSeats(e.target.value)}
                    placeholder={String((selectedBooking?.adults ?? 1) + (selectedBooking?.children ?? 0))}
                    className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Vehicle max capacity</Label>
                  <Input type="number" min="1" max="100" value={jettyTransportCapacity}
                    onChange={(e) => setJettyTransportCapacity(e.target.value)}
                    placeholder="e.g. 8" className="h-9 text-sm" />
                </div>
              </div>
              {jettyTransportSeats && jettyTransportCapacity && (
                (() => {
                  const seats = Number(jettyTransportSeats);
                  const cap = Number(jettyTransportCapacity);
                  const remaining = cap - seats;
                  return (
                    <p className={`text-xs font-medium ${remaining < 0 ? 'text-red-600' : remaining === 0 ? 'text-amber-600' : 'text-teal-700'}`}>
                      {remaining < 0 ? `⛔ Over capacity by ${Math.abs(remaining)}` : remaining === 0 ? '⚠ Fully booked' : `✓ ${remaining} seat${remaining !== 1 ? 's' : ''} remaining`}
                    </p>
                  );
                })()
              )}
            </div>
          )}

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
              placeholder="Early departure, late luggage, VIP escort…" rows={2} />
          </div>

          <DialogFooter className="border-t pt-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
            <Button type="submit" disabled={submitting || !selectedBooking}
              className="bg-teal-600 hover:bg-teal-700">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : editRecord ? 'Update Departure Plan' : 'Create Departure Plan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
