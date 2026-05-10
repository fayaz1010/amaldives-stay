'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Loader2, Printer, Share2, CheckCircle2,
  Check, Plus, Wallet,
  Building2, RotateCcw,
} from 'lucide-react';
import { MV_PAYMENT_METHODS } from './quick-pay-modal';

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
  guest: { id: string; name: string | null; email: string };
  room: {
    id: string; number: string; name: string | null; type: string; basePrice: number;
    property: {
      name: string; address: string; city: string; country: string;
      phone: string; email: string; website?: string | null; currency: string;
    };
  };
  serviceOrders: Array<{
    id: string; totalAmount: number; quantity: number;
    notes?: string | null; createdAt: string;
    service: { name: string; category: string };
  }>;
  payments: Array<{
    id: string; amount: number; method: string; status: string;
    transactionId?: string | null; notes?: string | null; createdAt: string;
  }>;
}

interface CheckoutModalProps {
  bookingId: string | null;
  mode: 'checkout' | 'bill';
  onClose: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const METHODS = [
  { value: 'CASH', label: 'Cash', icon: Banknote, color: 'text-green-600' },
  { value: 'CARD', label: 'Card / FPOS', icon: CreditCard, color: 'text-blue-600' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer', icon: Building2, color: 'text-purple-600' },
  { value: 'DIGITAL_WALLET', label: 'Digital Wallet', icon: Wallet, color: 'text-orange-600' },
  { value: 'CRYPTO', label: 'Crypto', icon: Bitcoin, color: 'text-yellow-600' },
];

const METHOD_ICONS: Record<string, any> = {
  CASH: ({ className }: any) => <span className={className}>💵</span>,
  CARD: ({ className }: any) => <span className={className}>💳</span>,
  BANK_TRANSFER: ({ className }: any) => <span className={className}>🏦</span>,
  DIGITAL_WALLET: ({ className }: any) => <span className={className}>📱</span>,
  CRYPTO: ({ className }: any) => <span className={className}>₿</span>,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nights(from: string, to: string) {
  return Math.max(1, Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / 86400000));
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtTime(d: string) {
  return new Date(d).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
}
function parseServiceNotes(notes: string | null | undefined): string {
  if (!notes) return '';
  try {
    const p = JSON.parse(notes);
    if (p?.items) return p.items.map((i: any) => `${i.qty}× ${i.name}`).join(', ');
  } catch { /* fallthrough */ }
  const m = notes.match(/^\[([^\]]+)\]/);
  return m ? m[1] : notes;
}

// ─── Receipt for printing ─────────────────────────────────────────────────────

function Receipt({ b }: { b: BillBooking }) {
  const n = nights(b.checkInDate, b.checkOutDate);
  const currency = b.room.property.currency || 'USD';
  const fmt$ = (v: number) => `${currency} ${v.toFixed(2)}`;
  const confirmedPayments = b.payments.filter(p => p.status === 'COMPLETED');
  const balance = b.totalAmount - b.paidAmount;

  return (
    <div className="font-mono text-sm text-gray-800 space-y-0">
      {/* Property header */}
      <div className="text-center border-b border-dashed border-gray-300 pb-3 mb-3">
        <p className="text-base font-bold uppercase tracking-widest">{b.room.property.name}</p>
        <p className="text-xs text-gray-500">{b.room.property.address}, {b.room.property.city}, {b.room.property.country}</p>
        <p className="text-xs text-gray-500">{b.room.property.phone} · {b.room.property.email}</p>
        {b.room.property.website && <p className="text-xs text-gray-400">{b.room.property.website}</p>}
      </div>

      {/* Doc title */}
      <div className="text-center mb-3">
        <p className="font-bold uppercase tracking-wider">{b.status === 'CHECKED_OUT' ? 'Final Invoice' : 'Guest Folio'}</p>
        <p className="text-xs text-gray-500">#{b.confirmationNumber} · Printed {new Date().toLocaleString()}</p>
      </div>

      {/* Guest details */}
      <div className="border border-gray-200 rounded p-2.5 mb-3 space-y-0.5 text-xs">
        {[
          ['Guest', b.guest.name],
          ['Email', b.guest.email],
          ['Room', `${b.room.number} — ${b.room.name || b.room.type}`],
          ['Check-in', fmtDate(b.checkInDate)],
          ['Check-out', fmtDate(b.checkOutDate)],
          ['Guests', `${b.adults} adult${b.adults !== 1 ? 's' : ''}${b.children > 0 ? ` + ${b.children} child` : ''}`],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between">
            <span className="text-gray-500">{label}</span>
            <span className="font-medium text-right">{value}</span>
          </div>
        ))}
      </div>

      {/* Charges table */}
      <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest mb-1.5">Charges</p>
      <table className="w-full text-xs mb-3">
        <tbody>
          <tr>
            <td className="py-0.5 pr-2 text-gray-600">Room {b.room.number} × {n} night{n !== 1 ? 's' : ''}</td>
            <td className="text-right text-[10px] text-gray-400">{fmt$(b.room.basePrice)}/night</td>
            <td className="text-right font-medium pl-2">{fmt$(b.room.basePrice * n)}</td>
          </tr>
          {b.serviceOrders.map((o) => (
            <tr key={o.id}>
              <td className="py-0.5 pr-2 text-gray-600">{parseServiceNotes(o.notes) || o.service.name}</td>
              <td className="text-right text-[10px] text-gray-400">{new Date(o.createdAt).toLocaleDateString()}</td>
              <td className="text-right font-medium pl-2">{fmt$(o.totalAmount)}</td>
            </tr>
          ))}
          {b.platformFee > 0 && (
            <tr className="text-gray-400 text-[11px]">
              <td className="py-0.5 pr-2" colSpan={2}>Platform fee</td>
              <td className="text-right pl-2">{fmt$(b.platformFee)}</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Totals */}
      <div className="border-t border-gray-200 pt-2 space-y-1 mb-3 text-sm">
        <div className="flex justify-between font-bold">
          <span>Total</span><span>{fmt$(b.totalAmount)}</span>
        </div>
        <div className="flex justify-between text-green-600">
          <span>Paid</span><span>– {fmt$(b.paidAmount)}</span>
        </div>
        {balance > 0 ? (
          <div className="flex justify-between font-bold text-red-600">
            <span>Balance Due</span><span>{fmt$(balance)}</span>
          </div>
        ) : (
          <div className="flex justify-between font-bold text-green-600">
            <span>Balance</span><span>SETTLED ✓</span>
          </div>
        )}
      </div>

      {/* Payment history */}
      {confirmedPayments.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest mb-1">Payments</p>
          {confirmedPayments.map((p) => (
            <div key={p.id} className="flex justify-between text-xs text-gray-600">
              <span>{fmtTime(p.createdAt)} · {p.method.replace('_', ' ')}
                {p.transactionId ? ` · ${p.transactionId}` : ''}
                {p.notes ? ` · ${p.notes}` : ''}
              </span>
              <span className="font-medium">{fmt$(p.amount)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-dashed border-gray-300 pt-2.5 text-center text-xs text-gray-400">
        <p>Thank you for staying with us!</p>
        <p className="mt-0.5">{b.room.property.name} · {b.room.property.website ?? b.room.property.email}</p>
      </div>
    </div>
  );
}

// ─── Record Payment Form ──────────────────────────────────────────────────────

function RecordPaymentForm({
  booking,
  onRecorded,
}: {
  booking: BillBooking;
  onRecorded: (newPaid: number) => void;
}) {
  const balance = booking.totalAmount - booking.paidAmount;
  const [selectedId, setSelectedId] = useState('BML_CARD');
  const [amount, setAmount] = useState(balance > 0 ? balance.toFixed(2) : '');
  const [transactionId, setTransactionId] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selected = MV_PAYMENT_METHODS.find((m) => m.id === selectedId)!;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) { setError('Enter a valid amount'); return; }
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          amount: Number(amount),
          method: selected.method,
          transactionId: transactionId || null,
          notes: notes || selected.notes || selected.label,
          currency: booking.room.property.currency || 'USD',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed');
      onRecorded(data.newPaidAmount);
    } catch (err: any) {
      setError(err?.message || 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="border border-dashed border-cyan-300 rounded-lg p-3 bg-cyan-50 space-y-3">
      <p className="text-xs font-semibold text-cyan-800 uppercase tracking-wide">Record Payment</p>

      {/* Maldives-first payment method grid */}
      <div className="grid grid-cols-4 gap-1.5">
        {MV_PAYMENT_METHODS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setSelectedId(m.id)}
            className={`rounded-lg border-2 p-1.5 text-center transition-all ${
              selectedId === m.id ? m.activeColor : m.color
            }`}
          >
            <div className="text-base leading-tight">{m.emoji}</div>
            <div className="text-[9px] font-bold leading-tight mt-0.5">{m.label}</div>
          </button>
        ))}
      </div>
      {selected && (
        <p className="text-[11px] text-gray-500 text-center -mt-1">{selected.sublabel}</p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Amount ({booking.room.property.currency || 'USD'}) *</Label>
          <Input type="number" step="0.01" min="0.01" value={amount}
            onChange={(e) => setAmount(e.target.value)} className="h-8 text-sm" required />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">
            {['BML_CARD', 'MIB_CARD'].includes(selectedId) ? 'FPOS Slip No.' :
             selectedId === 'MFAISAA' ? 'mFaisaa Ref.' :
             selectedId === 'BML_TRANSFER' ? 'Transfer Ref.' :
             selectedId === 'BML_CONNECT' ? 'IPG Ref.' : 'Ref. (optional)'}
          </Label>
          <Input value={transactionId} onChange={(e) => setTransactionId(e.target.value)}
            placeholder={['BML_CARD', 'MIB_CARD'].includes(selectedId) ? 'Slip no…' : 'optional'}
            className="h-8 text-sm" />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Notes (optional)</Label>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="partial payment, deposit…" className="h-8 text-sm" />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <Button type="submit" size="sm" disabled={saving}
        className="w-full h-8 bg-cyan-600 hover:bg-cyan-700 text-xs">
        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : (
          <><Plus className="h-3 w-3 mr-1" />Record Payment</>
        )}
      </Button>
    </form>
  );
}

// ─── Payment History ──────────────────────────────────────────────────────────

function PaymentHistory({
  payments,
  currency,
  onRefund,
}: {
  payments: BillBooking['payments'];
  currency: string;
  onRefund: (id: string) => void;
}) {
  const [refundingId, setRefundingId] = useState<string | null>(null);

  async function refund(id: string) {
    if (!confirm('Mark this payment as refunded?')) return;
    setRefundingId(id);
    try {
      await fetch(`/api/admin/payments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REFUNDED' }),
      });
      onRefund(id);
    } catch { alert('Refund failed'); }
    finally { setRefundingId(null); }
  }

  if (payments.length === 0) {
    return <p className="text-xs text-gray-400 text-center py-2">No payments recorded yet.</p>;
  }

  const fmt$ = (v: number) => `${currency} ${v.toFixed(2)}`;
  const methodEmoji = (m: string, notes: string | null | undefined) => {
    if (notes?.includes('BML FPOS') || notes?.includes('BML Card')) return '🏦';
    if (notes?.includes('MIB')) return '🕌';
    if (notes?.includes('mFaisaa')) return '📱';
    if (notes?.includes('BML Connect') || notes?.includes('IPG')) return '🌐';
    if (notes?.includes('MVR')) return '🪙';
    if (m === 'CASH') return '💵';
    if (m === 'CARD') return '💳';
    if (m === 'BANK_TRANSFER') return '🏦';
    if (m === 'DIGITAL_WALLET') return '📱';
    if (m === 'CRYPTO') return '₿';
    return '💳';
  };

  return (
    <div className="space-y-1.5">
      {payments.map((p) => {
        const isRefunded = p.status === 'REFUNDED';
        return (
          <div key={p.id} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
            isRefunded ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-white border-gray-200'
          }`}>
            <span className="text-base shrink-0">{methodEmoji(p.method, p.notes)}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold">{fmt$(p.amount)}</span>
                <span className="text-gray-500">{p.notes || p.method.replace('_', ' ')}</span>
                {isRefunded && <span className="text-red-500 font-medium">REFUNDED</span>}
              </div>
              <div className="text-gray-400 truncate">
                {fmtTime(p.createdAt)}
                {p.transactionId && <> · <span className="font-mono">{p.transactionId}</span></>}
              </div>
            </div>
            {!isRefunded && (
              <button onClick={() => refund(p.id)} disabled={refundingId === p.id}
                className="text-gray-300 hover:text-red-500 transition-colors" title="Refund">
                {refundingId === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
              </button>
            )}
          </div>
        );
      })}
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
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'bill' | 'payments'>('bill');

  useEffect(() => {
    if (!bookingId) { setBooking(null); return; }
    setLoading(true);
    setCheckedOut(false);
    setShowPaymentForm(false);
    setActiveTab('bill');
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
    } catch { alert('Failed to check out guest'); }
    finally { setCheckingOut(false); }
  }

  function handlePaymentRecorded(newPaid: number) {
    if (!booking) return;
    // Re-fetch fresh bill data
    fetch(`/api/admin/bookings/${booking.id}/bill`)
      .then((r) => r.json())
      .then((d) => setBooking(d.booking ?? null));
    setShowPaymentForm(false);
    router.refresh();
  }

  function handleRefund() {
    if (!booking) return;
    fetch(`/api/admin/bookings/${booking.id}/bill`)
      .then((r) => r.json())
      .then((d) => setBooking(d.booking ?? null));
    router.refresh();
  }

  async function handleShare() {
    if (!booking) return;
    const text = buildPlainTextBill(booking);
    if (navigator.share) {
      try { await navigator.share({ title: `Bill – ${booking.confirmationNumber}`, text }); return; }
      catch { /* fallthrough */ }
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const balance = booking ? booking.totalAmount - booking.paidAmount : 0;
  const confirmedPayments = booking?.payments.filter(p => p.status === 'COMPLETED') ?? [];

  return (
    <>
      <style>{`
        @media print {
          body > * { display: none !important; }
          #print-receipt-wrapper { display: block !important; position: fixed; top: 0; left: 0; width: 100%; padding: 32px; }
        }
        #print-receipt-wrapper { display: none; }
      `}</style>

      <div id="print-receipt-wrapper">
        {booking && <Receipt b={booking} />}
      </div>

      <Dialog open={!!bookingId} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-xl max-h-[92vh] flex flex-col gap-0 p-0">
          <DialogHeader className="px-5 pt-5 pb-3 border-b">
            <DialogTitle className="flex items-center gap-2 text-base">
              {mode === 'checkout' ? '🏁 Check Out' : '🧾 Bill / Receipt'}
              {booking && (
                <span className="text-sm font-normal text-gray-500">
                  — {booking.guest.name} · #{booking.confirmationNumber}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* Tabs */}
          {booking && (
            <div className="flex border-b px-5">
              <button
                onClick={() => setActiveTab('bill')}
                className={`py-2 px-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === 'bill' ? 'border-cyan-600 text-cyan-700' : 'border-transparent text-gray-500'
                }`}
              >
                Bill / Receipt
              </button>
              <button
                onClick={() => setActiveTab('payments')}
                className={`py-2 px-3 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${
                  activeTab === 'payments' ? 'border-cyan-600 text-cyan-700' : 'border-transparent text-gray-500'
                }`}
              >
                Payments
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  balance > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                }`}>
                  {balance > 0 ? `${booking.room.property.currency} ${balance.toFixed(0)} due` : 'Settled'}
                </span>
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-gray-400">
                <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading…
              </div>
            ) : !booking ? (
              <p className="text-center text-red-500 py-8">Failed to load booking data.</p>
            ) : activeTab === 'bill' ? (
              <>
                {checkedOut && (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-4 text-green-700 text-sm">
                    <CheckCircle2 className="h-4 w-4 shrink-0" /> Guest checked out successfully!
                  </div>
                )}
                <Receipt b={booking} />
              </>
            ) : (
              /* Payments tab */
              <div className="space-y-4">
                {/* Balance summary */}
                <div className={`rounded-lg p-3 text-sm font-medium flex items-center justify-between ${
                  balance <= 0
                    ? 'bg-green-50 border border-green-200 text-green-700'
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                  <span>{balance <= 0 ? '✅ Fully Settled' : `⚠ Balance Due`}</span>
                  <span className="font-bold">
                    {booking.room.property.currency} {Math.abs(balance).toFixed(2)}
                    {balance < 0 ? ' (overpaid)' : ''}
                  </span>
                </div>

                {/* Record payment button / form */}
                {booking.status !== 'CHECKED_OUT' || balance > 0 ? (
                  showPaymentForm ? (
                    <RecordPaymentForm
                      booking={booking}
                      onRecorded={handlePaymentRecorded}
                    />
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full border-dashed border-cyan-400 text-cyan-700 hover:bg-cyan-50"
                      onClick={() => setShowPaymentForm(true)}
                    >
                      <Plus className="h-4 w-4 mr-1.5" /> Record Payment
                    </Button>
                  )
                ) : null}

                {/* Payment history */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Payment History ({confirmedPayments.length})
                  </p>
                  <PaymentHistory
                    payments={booking.payments}
                    currency={booking.room.property.currency || 'USD'}
                    onRefund={handleRefund}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action bar */}
          {booking && (
            <div className="border-t px-5 py-3 flex flex-wrap gap-2 bg-gray-50 rounded-b-lg shrink-0">
              <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
                <Printer className="h-4 w-4" /> Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleShare} className="gap-1.5">
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Share2 className="h-4 w-4" />}
                {copied ? 'Copied!' : 'Share'}
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
                <Button variant="outline" size="sm" className="ml-auto" onClick={onClose}>Close</Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Plain text for sharing ───────────────────────────────────────────────────

function buildPlainTextBill(b: BillBooking): string {
  const n = nights(b.checkInDate, b.checkOutDate);
  const c = b.room.property.currency || 'USD';
  const f = (v: number) => `${c} ${v.toFixed(2)}`;
  const lines = [
    `=== ${b.room.property.name.toUpperCase()} ===`,
    `${b.room.property.address}, ${b.room.property.city}`,
    '',
    b.status === 'CHECKED_OUT' ? 'FINAL INVOICE' : 'GUEST FOLIO',
    `Ref: ${b.confirmationNumber}`,
    '',
    `Guest:     ${b.guest.name}`,
    `Email:     ${b.guest.email}`,
    `Room:      ${b.room.number} (${b.room.name || b.room.type})`,
    `Check-in:  ${fmtDate(b.checkInDate)}`,
    `Check-out: ${fmtDate(b.checkOutDate)}`,
    `Guests:    ${b.adults} adults${b.children > 0 ? ` + ${b.children} children` : ''}`,
    '',
    '--- CHARGES ---',
    `Room ${b.room.number} × ${n} nights @ ${f(b.room.basePrice)}   ${f(b.room.basePrice * n)}`,
    ...b.serviceOrders.map(o => `${parseServiceNotes(o.notes) || o.service.name}   ${f(o.totalAmount)}`),
    ...(b.platformFee > 0 ? [`Platform fee   ${f(b.platformFee)}`] : []),
    '',
    `TOTAL:    ${f(b.totalAmount)}`,
    `PAID:     ${f(b.paidAmount)}`,
    `BALANCE:  ${f(b.totalAmount - b.paidAmount)}`,
    '',
    '--- PAYMENTS ---',
    ...b.payments.filter(p => p.status === 'COMPLETED').map(
      p => `${fmtTime(p.createdAt)}  ${p.method}  ${p.transactionId ? `[${p.transactionId}]` : ''}  ${f(p.amount)}`
    ),
    '',
    'Thank you for staying with us!',
    b.room.property.website ?? b.room.property.email,
  ];
  return lines.join('\n');
}
