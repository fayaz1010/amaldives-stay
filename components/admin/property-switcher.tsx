'use client';

import { useState } from 'react';
import { ChevronDown, Check, Plus, Loader2, MapPin } from 'lucide-react';
import Link from 'next/link';

interface PropertyLite {
  id: string;
  name: string;
}

interface Props {
  /** Property the admin is currently operating on. */
  activePropertyId: string | null;
  /** All properties for the active tenant. */
  properties: PropertyLite[];
}

/**
 * Property switcher in the admin header. Sits BELOW the tenant switcher: the
 * tenant switcher picks which business (account) you're in; this picks which
 * property within it. Renders nothing for single-property tenants (the common
 * case) so their UI stays calm — the tenant name already identifies them.
 */
export function PropertySwitcher({ activePropertyId, properties }: Props) {
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Nothing to switch between → don't clutter the header.
  if (!properties || properties.length <= 1) return null;

  const active = properties.find((p) => p.id === activePropertyId) ?? properties[0];
  const others = properties.filter((p) => p.id !== active.id);

  async function switchTo(propertyId: string) {
    if (busyId) return;
    setBusyId(propertyId);
    try {
      const res = await fetch('/api/account/switch-property', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j?.error || 'Could not switch property');
        setBusyId(null);
        return;
      }
      // Reload so all server components re-read the active-property cookie.
      window.location.reload();
    } catch {
      setBusyId(null);
      alert('Network error while switching property');
    }
  }

  return (
    <div className="relative flex-1 min-w-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 py-1 px-1 rounded-md hover:bg-gray-50 transition-colors min-w-0"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <div className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center shrink-0">
          <MapPin className="h-3.5 w-3.5 text-gray-500" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <span className="block text-[10px] uppercase tracking-wider text-gray-400 font-semibold leading-tight">
            Property
          </span>
          <span className="block font-semibold text-gray-800 text-xs truncate leading-tight">
            {active.name}
          </span>
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <>
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40"
          />
          <div
            role="menu"
            className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden"
          >
            <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                {properties.length} properties
              </p>
            </div>
            <ul className="max-h-64 overflow-y-auto">
              <li>
                <div className="flex items-center gap-2 px-3 py-2 bg-teal-50">
                  <Check className="h-4 w-4 text-teal-700 shrink-0" />
                  <p className="text-sm font-medium text-gray-900 truncate flex-1">{active.name}</p>
                </div>
              </li>
              {others.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => switchTo(p.id)}
                    disabled={busyId !== null}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 disabled:opacity-50 disabled:cursor-wait transition-colors"
                  >
                    {busyId === p.id ? (
                      <Loader2 className="h-4 w-4 text-gray-400 animate-spin shrink-0" />
                    ) : (
                      <div className="w-4 h-4 shrink-0" />
                    )}
                    <p className="text-sm font-medium text-gray-900 truncate flex-1">{p.name}</p>
                  </button>
                </li>
              ))}
            </ul>
            <div className="border-t border-gray-100">
              <Link
                href="/admin/properties"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-teal-700 hover:bg-teal-50 transition-colors font-medium"
              >
                <Plus className="h-4 w-4" />
                Add / manage properties
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
