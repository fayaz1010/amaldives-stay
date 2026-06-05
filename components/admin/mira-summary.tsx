'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2, Receipt, Leaf, HandCoins, CalendarClock, AlertTriangle } from 'lucide-react';

interface MiraData {
  property: { id: string; name: string };
  period: string;
  dueDate: string;
  roomCount: number;
  config: { tin: string | null; tgstRate: number; greenTaxUsdPerNight: number; serviceChargeRate: number };
  roomRevenue: number;
  guestNights: number;
  tgstOutput: number;
  greenTaxDue: number;
  serviceCharge: number;
  totalGovTaxDue: number;
  bookingCount: number;
  greenTaxExemptNote: string;
}

function ym(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function lastMonths(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    out.push(ym(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))));
  }
  return out;
}

const usd = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function MiraSummary() {
  const [period, setPeriod] = useState(ym(new Date()));
  const [data, setData] = useState<MiraData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (p: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/finance/mira?period=${p}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'Failed to load');
      setData(j);
    } catch (e: any) {
      setError(e.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(period); }, [period, load]);

  const overdue = data ? new Date(data.dueDate) < new Date() : false;

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">MIRA / Tax</h1>
          <p className="text-sm text-gray-500">
            {data ? `${data.property.name} · own MIRA return` : 'Per-property tax return'}
          </p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          {lastMonths(12).map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-gray-500 text-sm py-10 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {data && !loading && (
        <>
          <div className={`rounded-xl border p-4 flex items-center gap-3 ${overdue ? 'border-amber-300 bg-amber-50' : 'border-teal-200 bg-teal-50'}`}>
            <CalendarClock className={`h-5 w-5 ${overdue ? 'text-amber-600' : 'text-teal-700'}`} />
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">
                Total due to MIRA: {usd(data.totalGovTaxDue)}
              </p>
              <p className="text-xs text-gray-600">
                File &amp; pay by <strong>{data.dueDate}</strong> (28th of following month).
                {data.config.tin ? ` TIN ${data.config.tin}.` : ' No TIN set yet.'}
              </p>
            </div>
            {overdue && <AlertTriangle className="h-5 w-5 text-amber-600" />}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card icon={<Receipt className="h-4 w-4" />} label={`TGST (${(data.config.tgstRate * 100).toFixed(0)}%)`} value={usd(data.tgstOutput)} sub={`on ${usd(data.roomRevenue)} room sales`} />
            <Card icon={<Leaf className="h-4 w-4" />} label="Green Tax" value={usd(data.greenTaxDue)} sub={`${data.guestNights} guest-nights × $${data.config.greenTaxUsdPerNight}`} />
            <Card icon={<HandCoins className="h-4 w-4" />} label={`Service charge (${(data.config.serviceChargeRate * 100).toFixed(0)}%)`} value={usd(data.serviceCharge)} sub="to staff — not a tax" />
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600 space-y-1">
            <p><strong>{data.bookingCount}</strong> bookings · <strong>{data.roomCount}</strong> rooms · period {data.period}</p>
            <p className="text-xs text-gray-400">{data.greenTaxExemptNote}</p>
            <p className="text-xs text-gray-400">
              Figures are estimates from confirmed/checked bookings overlapping the period. Verify against MIRAconnect before filing.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function Card({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-1.5 text-gray-500 text-xs font-medium">{icon}{label}</div>
      <p className="mt-1 text-lg font-bold text-gray-900">{value}</p>
      <p className="text-[11px] text-gray-400">{sub}</p>
    </div>
  );
}
