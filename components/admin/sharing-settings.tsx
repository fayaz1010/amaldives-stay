'use client';

import { useEffect, useState } from 'react';
import { Loader2, Share2, Check } from 'lucide-react';

const LABELS: Record<string, string> = {
  staff: 'Staff',
  services: 'Services menu',
  fnb: 'F&B outlets & menus',
  minibar: 'Minibar catalogue',
  inventory: 'Inventory & assets',
  ratePlans: 'Rate plans',
  transport: 'Transfers / transport',
};
const ORDER = ['staff', 'services', 'fnb', 'minibar', 'inventory', 'ratePlans', 'transport'];

export function SharingSettings() {
  const [sharing, setSharing] = useState<Record<string, boolean> | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/settings/sharing');
        const j = await res.json();
        if (res.ok) setSharing(j.sharing);
        else setError(j?.error || 'Failed to load');
      } catch { setError('Failed to load'); }
      finally { setLoading(false); }
    })();
  }, []);

  async function toggle(cat: string) {
    if (!sharing || savingKey) return;
    const next = { ...sharing, [cat]: !sharing[cat] };
    setSharing(next);
    setSavingKey(cat);
    setError(null);
    try {
      const res = await fetch('/api/admin/settings/sharing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sharing: { [cat]: next[cat] } }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j?.error || 'Save failed');
        setSharing({ ...sharing }); // revert
      }
    } catch {
      setError('Network error');
      setSharing({ ...sharing });
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Share2 className="h-4 w-4 text-gray-500" />
        <h2 className="font-semibold text-gray-900">Sharing across properties</h2>
      </div>
      <p className="text-xs text-gray-500">
        Choose what your properties share. Turn a category <strong>off</strong> when properties on
        different islands keep it separate (e.g. their own staff, stock, or menus). On = one shared
        pool; off = each property manages its own.
      </p>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {loading && (
        <div className="flex items-center gap-2 text-gray-500 text-sm py-3"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      )}
      {sharing && (
        <ul className="divide-y divide-gray-100">
          {ORDER.map((cat) => (
            <li key={cat} className="flex items-center justify-between py-2.5">
              <span className="text-sm text-gray-800">{LABELS[cat] ?? cat}</span>
              <button
                role="switch"
                aria-checked={sharing[cat]}
                onClick={() => toggle(cat)}
                disabled={savingKey !== null}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-60 ${
                  sharing[cat] ? 'bg-teal-600' : 'bg-gray-300'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${sharing[cat] ? 'translate-x-6' : 'translate-x-1'}`} />
                {savingKey === cat && (
                  <Loader2 className="absolute -right-5 h-3.5 w-3.5 animate-spin text-gray-400" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[11px] text-gray-400 flex items-center gap-1">
        <Check className="h-3 w-3" /> Shared = one pool across all properties · Off = per-property
      </p>
    </div>
  );
}
