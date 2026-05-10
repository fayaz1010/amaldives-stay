'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Printer, Share2, CheckCircle2, Copy, Check } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BillBooking {
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
  notes?: string | null;
  specialRequests?: string | null;
  guest: { id: string; name: string | null; email: string };
  room: {
    id: string; number: string; name: string | null; type: string; basePrice: number;
    property: {
      name: string; address: string; city: string; country: string;
      phone: string; email: string; website?: string | null; currency: string;
    };
  };
  serviceOrders: Array<{
    id: string;
    totalAmount: number;
    quantity: number;
    notes?: string | null;
    createdAt: string;
    service: { name: string; category: string };
  }>;
  payments: Array<{
    id: string;
    amount: number;
    method: string;
    createdAt: string;
  }>;
}

interface CheckoutModalProps {
  bookingId: string | null;
  mode: 'checkout' | 'bill'; // checkout = confirm checkout + print; bill = print only
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nights(from: string, to: string) {
  return Math.max(1, Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / 86400000));
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function parseServiceNotes(notes: string | null | undefined): string {
  if (!notes) return '';
  try {
    const p = JSON.parse(notes);
    if (p?.items) {
      return p.items.map((i: any) => `${i.qty}× ${i.name}`).join(', ');
    }
  } catch { /* legacy format */ }
  const m = notes.match(/^\[([^\]]+)\]/);
  return m ? m[1] : notes;
}

// ─── Receipt component (also used for printing) ──────────────────────────────

function Receipt({ b }: { b: BillBooking }) {
  const n = nights(b.checkInDate, b.checkOutDate);
  const roomTotal = b.room.basePrice * n;
  const svcTotal = b.serviceOrders.reduce((s, o) => s + o.totalAmount, 0);
  const balance = b.totalAmount - b.paidAmount;
  const currency = b.room.property.currency || 'USD';
  const fmt$ = (v: number) => `${currency} ${v.toFixed(2)}`;

  return (
    <div id="print-receipt" className="font-mono text-sm text-gray-800">
      {/* Header */}
      <div className="text-center border-b border-dashed border-gray-300 pb-4 mb-4">
        <p className="text-base font-bold uppercase tracking-widest">{b.room.property.name}</p>
        <p className="text-xs text-gray-500">{b.room.property.address}, {b.room.property.city}</p>
        <p className="text-xs text-gray-500">{b.room.property.phone} · {b.room.property.email}</p>
        {b.room.property.website && (
          <p className="text-xs text-gray-400">{b.room.property.website}</p>
        )}
      </div>

      {/* Title */}
      <div className="text-center mb-4">
        <p className="font-bold text-base uppercase tracking-wider">
          {b.status === 'CHECKED_OUT' ? 'Final Invoice' : 'Folio / Bill'}
        </p>
        <p className="text-xs text-gray-500">#{b.confirmationNumber}</p>
        <p className="text-xs text-gray-400">Printed {new Date().toLocaleString()}</p>
      </div>

      {/* Guest */}
      <div className="border border-gray-200 rounded p-3 mb-4 space-y-0.5">
        <div className="flex justify-between">
          <span className="text-gray-500">Guest</span>
          <span className="font-medium">{b.guest.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Email</span>
          <span>{b.guest.email}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Room</span>
          <span className="font-medium">{b.room.number} — {b.room.name || b.room.type}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Check-in</span>
          <span>{fmt(b.checkInDate)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Check-out</span>
          <span>{fmt(b.checkOutDate)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Guests</span>
          <span>{b.adults} adult{b.adults !== 1 ? 's' : ''}
            {b.children > 0 ? ` + ${b.children} child` : ''}</span>
        </div>
      </div>

      {/* Charges */}
      <div className="mb-4">
        <p className="text-xs font-bold uppercase text-gray-400 tracking-widest mb-2">Charges</p>
        <table className="w-full text-xs">
          <tbody>
            {/* Room */}
            <tr>
              <td className="py-0.5 pr-2 text-gray-600">
                Room {b.room.number} × {n} night{n !== 1 ? 's' : ''}
              </td>
              <td className="text-right text-xs text-gray-400">{fmt$(b.room.basePrice)}/night</td>
              <td className="text-right font-medium pl-3">{fmt$(roomTotal)}</td>
            </tr>

            {/* Service orders */}
            {b.serviceOrders.map((o) => (
              <tr key={o.id}>
                <td className="py-0.5 pr-2 text-gray-600">
                  {parseServiceNotes(o.notes) || o.service.name}
                </td>
                <td className="text-right text-xs text-gray-400">
                  {new Date(o.createdAt).toLocaleDateString()}
                </td>
                <td className="text-right font-medium pl-3">{fmt$(o.totalAmount)}</td>
              </tr>
            ))}

            {/* Platform fee */}
            {b.platformFee > 0 && (
              <tr className="text-gray-400">
                <td className="py-0.5 pr-2" colSpan={2}>Platform fee</td>
                <td className="text-right pl-3">{fmt$(b.platformFee)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="border-t border-gray-200 pt-3 space-y-1 mb-4">
        <div className="flex justify-between text-sm font-bold">
          <span>Total</span>
          <span>{fmt$(b.totalAmount)}</span>
        </div>
        <div className="flex justify-between text-sm text-green-600">
          <span>Paid</span>
          <span>– {fmt$(b.paidAmount)}</span>
        </div>
        {balance > 0 ? (
          <div className="flex justify-between text-sm font-bold text-red-600">
            <span>Balance Due</span>
            <span>{fmt$(balance)}</span>
          </div>
        ) : (
          <div className="flex justify-between text-sm font-bold text-green-600">
            <span>Balance</span>
            <span>SETTLED ✓</span>
          </div>
        )}
      </div>

      {/* Payments */}
      {b.payments.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-bold uppercase text-gray-400 tracking-widest mb-2">Payments Received</p>
          {b.payments.map((p) => (
            <div key={p.id} className="flex justify-between text-xs">
              <span className="text-gray-500">{new Date(p.createdAt).toLocaleDateString()} · {p.method}</span>
              <span>{fmt$(p.amount)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-dashed border-gray-300 pt-3 text-center text-xs text-gray-400">
        <p>Thank you for staying with us!</p>
        <p className="mt-0.5">{b.room.property.name} · {b.room.property.website ?? b.room.property.email}</p>
      </div>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export function CheckoutModal({ bookingId, mode, onClose }: CheckoutModalProps) {
  const router = useRouter();
  const [booking, setBooking] = useState<BillBooking | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkedOut, setCheckedOut] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!bookingId) { setBooking(null); return; }
    setLoading(true);
    setCheckedOut(false);
    fetch(`/api/admin/bookings/${bookingId}/bill`)
      .then((r) => r.json())
      .then((d) => setBooking(d.booking ?? null))
      .catch(() => setBooking(null))
      .finally(() => setLoading(false));
  }, [bookingId]);

  async function handleCheckout() {
    if (!booking) return;
    setCheckingOut(true);
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CHECKED_OUT' }),
      });
      if (!res.ok) throw new Error('Checkout failed');
      setCheckedOut(true);
      router.refresh();
    } catch {
      alert('Failed to check out guest');
    } finally {
      setCheckingOut(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  async function handleShare() {
    if (!booking) return;
    const text = buildPlainTextBill(booking);
    if (navigator.share) {
      try {
        await navigator.share({ title: `Bill – ${booking.confirmationNumber}`, text });
        return;
      } catch { /* fall through to copy */ }
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      {/* Print-only styles injected globally */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #print-receipt-wrapper { display: block !important; position: fixed; top: 0; left: 0; width: 100%; }
        }
        #print-receipt-wrapper { display: none; }
      `}</style>

      {/* Hidden print area outside dialog */}
      <div id="print-receipt-wrapper" className="p-8 max-w-sm mx-auto">
        {booking && <Receipt b={booking} />}
      </div>

      <Dialog open={!!bookingId} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {mode === 'checkout' ? '🏁 Check Out Guest' : '🧾 Bill / Receipt'}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-1">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-gray-400">
                <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading bill…
              </div>
            ) : !booking ? (
              <p className="text-center text-red-500 py-8">Failed to load booking data.</p>
            ) : (
              <>
                {/* Success banner */}
                {checkedOut && (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-4 text-green-700 text-sm font-medium">
                    <CheckCircle2 className="h-4 w-4" />
                    Guest checked out successfully!
                  </div>
                )}

                <Receipt b={booking} />
              </>
            )}
          </div>

          {/* Action bar */}
          {booking && (
            <div className="border-t pt-3 flex flex-wrap gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
                <Printer className="h-4 w-4" /> Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleShare} className="gap-1.5">
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Share2 className="h-4 w-4" />}
                {copied ? 'Copied!' : 'Share / Copy'}
              </Button>

              {mode === 'checkout' && !checkedOut && booking.status !== 'CHECKED_OUT' && (
                <Button
                  className="ml-auto bg-teal-600 hover:bg-teal-700 gap-1.5"
                  size="sm"
                  onClick={handleCheckout}
                  disabled={checkingOut}
                >
                  {checkingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Confirm Checkout
                </Button>
              )}
              {(checkedOut || booking.status === 'CHECKED_OUT') && (
                <Button variant="outline" size="sm" className="ml-auto" onClick={onClose}>
                  Close
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Plain text bill for sharing ─────────────────────────────────────────────

function buildPlainTextBill(b: BillBooking): string {
  const n = nights(b.checkInDate, b.checkOutDate);
  const currency = b.room.property.currency || 'USD';
  const f = (v: number) => `${currency} ${v.toFixed(2)}`;
  const lines: string[] = [
    `=== ${b.room.property.name.toUpperCase()} ===`,
    `${b.room.property.address}, ${b.room.property.city}`,
    '',
    `FOLIO / BILL`,
    `Ref: ${b.confirmationNumber}`,
    '',
    `Guest:     ${b.guest.name}`,
    `Room:      ${b.room.number} (${b.room.name || b.room.type})`,
    `Check-in:  ${fmt(b.checkInDate)}`,
    `Check-out: ${fmt(b.checkOutDate)}`,
    `Guests:    ${b.adults} adults${b.children > 0 ? ` + ${b.children} children` : ''}`,
    '',
    '--- CHARGES ---',
    `Room ${b.room.number} × ${n} nights @ ${f(b.room.basePrice)}   ${f(b.room.basePrice * n)}`,
    ...b.serviceOrders.map(
      (o) => `${parseServiceNotes(o.notes) || o.service.name}   ${f(o.totalAmount)}`
    ),
    ...(b.platformFee > 0 ? [`Platform fee   ${f(b.platformFee)}`] : []),
    '',
    `TOTAL:    ${f(b.totalAmount)}`,
    `PAID:     ${f(b.paidAmount)}`,
    `BALANCE:  ${f(b.totalAmount - b.paidAmount)}`,
    '',
    `Thank you for staying with us!`,
    b.room.property.website ?? b.room.property.email,
  ];
  return lines.join('\n');
}
