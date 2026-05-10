'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, CreditCard } from 'lucide-react';

// ─── Maldives-first payment methods ──────────────────────────────────────────

export const MV_PAYMENT_METHODS = [
  {
    id: 'BML_CARD',
    label: 'BML Card',
    sublabel: 'Bank of Maldives FPOS',
    emoji: '🏦',
    method: 'CARD',
    notes: 'BML FPOS Terminal',
    color: 'border-blue-400 bg-blue-50 text-blue-800',
    activeColor: 'border-blue-600 bg-blue-600 text-white shadow-md',
  },
  {
    id: 'MIB_CARD',
    label: 'MIB Card',
    sublabel: 'Maldives Islamic Bank FPOS',
    emoji: '🕌',
    method: 'CARD',
    notes: 'MIB FPOS Terminal',
    color: 'border-emerald-400 bg-emerald-50 text-emerald-800',
    activeColor: 'border-emerald-600 bg-emerald-600 text-white shadow-md',
  },
  {
    id: 'MFAISAA',
    label: 'mFaisaa',
    sublabel: 'BML QR / Mobile Pay',
    emoji: '📱',
    method: 'DIGITAL_WALLET',
    notes: 'BML mFaisaa',
    color: 'border-cyan-400 bg-cyan-50 text-cyan-800',
    activeColor: 'border-cyan-600 bg-cyan-600 text-white shadow-md',
  },
  {
    id: 'BML_TRANSFER',
    label: 'BML Transfer',
    sublabel: 'BMLPay / Online Banking',
    emoji: '💸',
    method: 'BANK_TRANSFER',
    notes: 'BML Online Transfer',
    color: 'border-indigo-400 bg-indigo-50 text-indigo-800',
    activeColor: 'border-indigo-600 bg-indigo-600 text-white shadow-md',
  },
  {
    id: 'USD_CASH',
    label: 'USD Cash',
    sublabel: 'US Dollar cash payment',
    emoji: '💵',
    method: 'CASH',
    notes: 'USD Cash',
    color: 'border-green-400 bg-green-50 text-green-800',
    activeColor: 'border-green-600 bg-green-600 text-white shadow-md',
  },
  {
    id: 'MVR_CASH',
    label: 'MVR Cash',
    sublabel: 'Maldivian Rufiyaa cash',
    emoji: '🪙',
    method: 'CASH',
    notes: 'MVR Cash',
    color: 'border-yellow-400 bg-yellow-50 text-yellow-800',
    activeColor: 'border-yellow-600 bg-yellow-600 text-white shadow-md',
  },
  {
    id: 'BML_CONNECT',
    label: 'BML Connect',
    sublabel: 'Online card payment (IPG)',
    emoji: '🌐',
    method: 'CARD',
    notes: 'BML Connect IPG',
    color: 'border-sky-400 bg-sky-50 text-sky-800',
    activeColor: 'border-sky-600 bg-sky-600 text-white shadow-md',
  },
  {
    id: 'OTHER',
    label: 'Other',
    sublabel: 'Other payment method',
    emoji: '📦',
    method: 'CARD',
    notes: '',
    color: 'border-gray-300 bg-gray-50 text-gray-700',
    activeColor: 'border-gray-600 bg-gray-600 text-white shadow-md',
  },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface QuickPayModalProps {
  bookingId: string | null;
  guestName: string;
  roomNumber: string;
  confirmationNumber: string;
  balanceDue: number;
  currency: string;
  onClose: () => void;
  onPaid: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function QuickPayModal({
  bookingId, guestName, roomNumber, confirmationNumber,
  balanceDue, currency, onClose, onPaid,
}: QuickPayModalProps) {
  const [selectedId, setSelectedId] = useState('BML_CARD');
  const [amount, setAmount] = useState(balanceDue > 0 ? balanceDue.toFixed(2) : '');
  const [slipRef, setSlipRef] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const selected = MV_PAYMENT_METHODS.find((m) => m.id === selectedId)!;
  const fmt$ = (v: number) => `${currency} ${v.toFixed(2)}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) { setError('Enter a valid amount'); return; }
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          amount: numAmount,
          method: selected.method,
          transactionId: slipRef || null,
          notes: selected.notes || selected.label,
          currency,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed');
      setDone(true);
      onPaid();
    } catch (err: any) {
      setError(err?.message || 'Payment recording failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!bookingId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-cyan-600" />
            Quick Pay
          </DialogTitle>
        </DialogHeader>

        {done ? (
          <div className="text-center py-6 space-y-3">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            <p className="font-semibold text-gray-800">Payment recorded!</p>
            <p className="text-sm text-gray-500">
              {fmt$(Number(amount))} via {selected.emoji} {selected.label}
            </p>
            <Button onClick={onClose} className="w-full bg-teal-600 hover:bg-teal-700">Done</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {/* Booking summary */}
            <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Guest</span>
                <span className="font-medium">{guestName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Room {roomNumber}</span>
                <span className="text-gray-400 text-xs">#{confirmationNumber.slice(-8)}</span>
              </div>
              {balanceDue > 0 && (
                <div className="flex justify-between mt-1 pt-1 border-t">
                  <span className="text-red-600 font-medium text-xs">Balance Due</span>
                  <span className="text-red-600 font-bold">{fmt$(balanceDue)}</span>
                </div>
              )}
            </div>

            {/* Maldives payment method grid */}
            <div>
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                Payment Method
              </Label>
              <div className="grid grid-cols-4 gap-1.5">
                {MV_PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedId(m.id)}
                    className={`rounded-lg border-2 p-2 text-center transition-all ${
                      selectedId === m.id ? m.activeColor : m.color
                    }`}
                  >
                    <div className="text-lg leading-tight">{m.emoji}</div>
                    <div className="text-[10px] font-bold leading-tight mt-0.5">{m.label}</div>
                  </button>
                ))}
              </div>
              {selected && (
                <p className="text-[11px] text-gray-500 mt-1.5 text-center">{selected.sublabel}</p>
              )}
            </div>

            {/* Amount */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Amount ({currency}) *</Label>
                <Input
                  type="number" step="0.01" min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-9 text-sm font-semibold"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  {['BML_CARD', 'MIB_CARD'].includes(selectedId) ? 'FPOS Slip No.' :
                   selectedId === 'MFAISAA' ? 'mFaisaa Ref.' :
                   selectedId === 'BML_TRANSFER' ? 'Transfer Ref.' :
                   selectedId === 'BML_CONNECT' ? 'IPG Ref.' :
                   'Reference (optional)'}
                </Label>
                <Input
                  value={slipRef}
                  onChange={(e) => setSlipRef(e.target.value)}
                  placeholder={
                    ['BML_CARD', 'MIB_CARD'].includes(selectedId) ? 'e.g. 12345' : 'optional'
                  }
                  className="h-9 text-sm"
                />
              </div>
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={saving}
                className="flex-1 bg-cyan-600 hover:bg-cyan-700 gap-1.5">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                  <><CheckCircle2 className="h-4 w-4" />Confirm Payment</>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
