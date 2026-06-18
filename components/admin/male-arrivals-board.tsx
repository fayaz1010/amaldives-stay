'use client';

import { useEffect, useState, useCallback } from 'react';
import { PlaneLanding, Loader2, RefreshCw, Anchor } from 'lucide-react';

interface FlightArrival {
  flight: string;
  airline: string;
  from: string;
  scheduled: string;
  estimated: string | null;
  status: string;
}
interface Board {
  source: 'live' | 'demo';
  airport: string;
  generatedAt: string;
  arrivals: FlightArrival[];
  note?: string;
}

function hhmm(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  // Show in Maldives time (UTC+5)
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Indian/Maldives' });
}
// Suggested boat pickup = 35 min after landing (immigration + bags + walk to jetty)
function pickup(iso: string): string {
  if (!iso) return '—';
  const d = new Date(new Date(iso).getTime() + 35 * 60_000);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Indian/Maldives' });
}
function delayMinutes(scheduled: string, estimated: string | null): number {
  if (!scheduled || !estimated) return 0;
  const s = new Date(scheduled).getTime();
  const e = new Date(estimated).getTime();
  if (isNaN(s) || isNaN(e)) return 0;
  return Math.round((e - s) / 60_000);
}

const statusColor = (s: string) =>
  /land|arriv/i.test(s) ? 'bg-green-100 text-green-700'
  : /expect|approach|en ?route/i.test(s) ? 'bg-amber-100 text-amber-700'
  : 'bg-gray-100 text-gray-600';

export function MaleArrivalsBoard() {
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/arrivals/flights', { cache: 'no-store' });
      setBoard(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <PlaneLanding className="h-5 w-5 text-teal-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Flight arrivals — Velana (MLE)</h1>
            <p className="text-sm text-gray-500">Plan boat pickups around live landing times.</p>
          </div>
        </div>
        <button onClick={load} disabled={loading} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Refresh
        </button>
      </div>

      {board && (
        <div className={`rounded-lg border px-3 py-2 text-xs ${board.source === 'live' ? 'border-green-200 bg-green-50 text-green-700' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
          {board.source === 'live'
            ? `Live feed · ${board.airport} · updated ${hhmm(board.generatedAt)}`
            : (board.note || 'Sample data — connect a flight feed for live arrivals.')}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-[11px] uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-3 py-2">Flight</th>
              <th className="px-3 py-2">From</th>
              <th className="px-3 py-2">Lands (MVT)</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2"><span className="inline-flex items-center gap-1"><Anchor className="h-3 w-3" />Pickup</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && !board && (
              <tr><td colSpan={5} className="px-3 py-8 text-center text-gray-400"><Loader2 className="h-4 w-4 animate-spin inline" /></td></tr>
            )}
            {board?.arrivals.map((f, i) => {
              const delay = delayMinutes(f.scheduled, f.estimated);
              return (
              <tr key={`${f.flight}-${i}`} className="hover:bg-gray-50">
                <td className="px-3 py-2.5 font-semibold text-gray-900">{f.flight}<div className="text-[11px] font-normal text-gray-400">{f.airline}</div></td>
                <td className="px-3 py-2.5 text-gray-700">{f.from}</td>
                <td className="px-3 py-2.5 font-medium text-gray-900">
                  {hhmm(f.estimated || f.scheduled)}
                  {f.estimated && <span className="ml-1 text-[11px] text-amber-600">(est)</span>}
                  {delay > 20 && (
                    <span className="ml-1.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                      +{delay}m delay
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5"><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusColor(f.status)}`}>{f.status}</span></td>
                <td className="px-3 py-2.5 text-teal-700 font-medium">{pickup(f.estimated || f.scheduled)}</td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-gray-400">
        Suggested pickup = landing + 35 min (immigration, bags, jetty). H78 runs its own boats — this is the schedule eZee can't give them.
      </p>
    </div>
  );
}
