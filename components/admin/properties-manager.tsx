'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Plus, Loader2, Check, BedDouble, CalendarCheck, Receipt, ChevronDown } from 'lucide-react';

interface PropertyRow {
  id: string;
  name: string;
  city: string;
  address: string;
  isActive: boolean;
  taxTin: string | null;
  tgstRate: number | null;
  greenTaxUsdPerNight: number | null;
  serviceChargeRate: number | null;
  _count: { rooms: number; bookings: number };
}

interface Props {
  properties: PropertyRow[];
  activePropertyId: string | null;
  canManage: boolean;
}

export function PropertiesManager({ properties, activePropertyId, canManage }: Props) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [taxOpenId, setTaxOpenId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', island: '', atoll: '', phone: '', email: '' });
  const [error, setError] = useState<string | null>(null);

  async function addProperty(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !form.name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j?.error || 'Could not create property');
        setBusy(false);
        return;
      }
      setForm({ name: '', island: '', atoll: '', phone: '', email: '' });
      setAdding(false);
      setBusy(false);
      router.refresh();
    } catch {
      setError('Network error');
      setBusy(false);
    }
  }

  async function switchTo(id: string) {
    if (switching) return;
    setSwitching(id);
    try {
      const res = await fetch('/api/account/switch-property', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: id }),
      });
      if (!res.ok) {
        setSwitching(null);
        return;
      }
      window.location.reload();
    } catch {
      setSwitching(null);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Properties</h1>
          <p className="text-sm text-gray-500">
            All properties under this account. Staff are shared; finance &amp; reservations are per property.
          </p>
        </div>
        {canManage && !adding && (
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            <Plus className="h-4 w-4" /> Add property
          </button>
        )}
      </div>

      {adding && (
        <form onSubmit={addProperty} className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <h2 className="font-semibold text-gray-900">New property</h2>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-gray-600">Property name *</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="e.g. H78 Guraidhoo"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-600">Island</span>
              <input
                value={form.island}
                onChange={(e) => setForm({ ...form, island: e.target.value })}
                placeholder="e.g. Guraidhoo"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-600">Atoll</span>
              <input
                value={form.atoll}
                onChange={(e) => setForm({ ...form, atoll: e.target.value })}
                placeholder="e.g. Kaafu"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-600">Phone</span>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-medium text-gray-600">Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <p className="text-xs text-gray-400">
            You can fill in address, tax/MIRA details and rooms after creating it.
          </p>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create property
            </button>
            <button
              type="button"
              onClick={() => { setAdding(false); setError(null); }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <ul className="space-y-2">
        {properties.map((p) => {
          const isActive = p.id === activePropertyId;
          const taxOpen = taxOpenId === p.id;
          return (
            <li
              key={p.id}
              className={`rounded-xl border ${isActive ? 'border-teal-300 bg-teal-50' : 'border-gray-200 bg-white'}`}
            >
              <div className="flex items-center gap-3 p-4">
                <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  <MapPin className="h-4 w-4 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">
                    {p.name}
                    {isActive && (
                      <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-medium text-teal-700">
                        <Check className="h-3 w-3" /> active
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{p.city || 'No location set'}</p>
                  <p className="mt-1 flex items-center gap-3 text-[11px] text-gray-400">
                    <span className="inline-flex items-center gap-1"><BedDouble className="h-3 w-3" />{p._count.rooms} rooms</span>
                    <span className="inline-flex items-center gap-1"><CalendarCheck className="h-3 w-3" />{p._count.bookings} bookings</span>
                    {p.taxTin && <span className="inline-flex items-center gap-1"><Receipt className="h-3 w-3" />TIN set</span>}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {!isActive && (
                    <button
                      onClick={() => switchTo(p.id)}
                      disabled={switching !== null}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {switching === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Switch to'}
                    </button>
                  )}
                  {canManage && (
                    <button
                      onClick={() => setTaxOpenId(taxOpen ? null : p.id)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-teal-700 hover:bg-teal-50"
                    >
                      <Receipt className="h-3.5 w-3.5" /> Tax / MIRA
                      <ChevronDown className={`h-3 w-3 transition-transform ${taxOpen ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                </div>
              </div>
              {taxOpen && canManage && (
                <TaxEditor property={p} onSaved={() => { setTaxOpenId(null); router.refresh(); }} />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function TaxEditor({ property, onSaved }: { property: PropertyRow; onSaved: () => void }) {
  const [tin, setTin] = useState(property.taxTin ?? '');
  const [tgst, setTgst] = useState(property.tgstRate != null ? String(property.tgstRate * 100) : '');
  const [green, setGreen] = useState(property.greenTaxUsdPerNight != null ? String(property.greenTaxUsdPerNight) : '');
  const [svc, setSvc] = useState(property.serviceChargeRate != null ? String(property.serviceChargeRate * 100) : '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setErr(null);
    const pct = (v: string) => (v.trim() === '' ? null : Number(v) / 100);
    const num = (v: string) => (v.trim() === '' ? null : Number(v));
    try {
      const res = await fetch(`/api/admin/properties/${property.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taxTin: tin,
          tgstRate: pct(tgst),
          greenTaxUsdPerNight: num(green),
          serviceChargeRate: pct(svc),
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(j?.error || 'Save failed'); setBusy(false); return; }
      onSaved();
    } catch {
      setErr('Network error');
      setBusy(false);
    }
  }

  return (
    <div className="border-t border-gray-200 px-4 py-3 bg-gray-50/60 space-y-3">
      <p className="text-xs text-gray-500">
        This property files its <strong>own</strong> MIRA return. Leave a rate blank to use the
        Maldives default (TGST 17%, Green Tax $6 ≤50 rooms / $12 above, service charge 10%).
      </p>
      {err && <p className="text-xs text-red-600">{err}</p>}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <label className="block">
          <span className="text-[11px] font-medium text-gray-600">MIRA TIN</span>
          <input value={tin} onChange={(e) => setTin(e.target.value)} placeholder="e.g. 1009XXXGST" className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
        </label>
        <label className="block">
          <span className="text-[11px] font-medium text-gray-600">TGST %</span>
          <input value={tgst} onChange={(e) => setTgst(e.target.value)} placeholder="17" inputMode="decimal" className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
        </label>
        <label className="block">
          <span className="text-[11px] font-medium text-gray-600">Green Tax $/night</span>
          <input value={green} onChange={(e) => setGreen(e.target.value)} placeholder="6" inputMode="decimal" className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
        </label>
        <label className="block">
          <span className="text-[11px] font-medium text-gray-600">Service charge %</span>
          <input value={svc} onChange={(e) => setSvc(e.target.value)} placeholder="10" inputMode="decimal" className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
        </label>
      </div>
      <button
        onClick={save}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        Save tax settings
      </button>
    </div>
  );
}
