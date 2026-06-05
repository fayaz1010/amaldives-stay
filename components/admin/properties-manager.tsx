'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Plus, Loader2, Check, BedDouble, CalendarCheck } from 'lucide-react';

interface PropertyRow {
  id: string;
  name: string;
  city: string;
  address: string;
  isActive: boolean;
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
          return (
            <li
              key={p.id}
              className={`flex items-center gap-3 rounded-xl border p-4 ${
                isActive ? 'border-teal-300 bg-teal-50' : 'border-gray-200 bg-white'
              }`}
            >
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
                <p className="text-xs text-gray-500 truncate">
                  {p.city || 'No location set'}
                </p>
                <p className="mt-1 flex items-center gap-3 text-[11px] text-gray-400">
                  <span className="inline-flex items-center gap-1"><BedDouble className="h-3 w-3" />{p._count.rooms} rooms</span>
                  <span className="inline-flex items-center gap-1"><CalendarCheck className="h-3 w-3" />{p._count.bookings} bookings</span>
                </p>
              </div>
              {!isActive && (
                <button
                  onClick={() => switchTo(p.id)}
                  disabled={switching !== null}
                  className="shrink-0 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {switching === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Switch to'}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
