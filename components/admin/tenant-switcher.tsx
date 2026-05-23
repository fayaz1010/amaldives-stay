'use client';

import { useState } from 'react';
import { ChevronDown, Check, Plus, Loader2, Building2 } from 'lucide-react';
import Link from 'next/link';
import type { SessionMembership } from '@/types/next-auth';

interface Props {
  /** Tenant the user is currently acting as. Drives the chip label. */
  activeTenantId: string;
  /** All tenants this user has access to. From session.user.memberships. */
  memberships: SessionMembership[];
  /** Optional logo for the active tenant — passed by the server layout. */
  activeLogo?: string | null;
  /** Optional accent colour — used when no logo is set. */
  accentColor?: string;
}

/**
 * Tenant switcher rendered in the admin sidebar header. Single source of
 * truth for which guesthouse the admin is currently managing. Renders as
 * a plain non-interactive label when the user only belongs to one tenant
 * (i.e., the common case — no need to clutter with a dropdown).
 */
export function TenantSwitcher({
  activeTenantId,
  memberships,
  activeLogo,
  accentColor,
}: Props) {
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const active = memberships.find((m) => m.tenantId === activeTenantId);
  const others = memberships.filter((m) => m.tenantId !== activeTenantId);

  async function switchTo(tenantId: string, subdomain: string) {
    if (busyId) return;
    setBusyId(tenantId);
    try {
      const res = await fetch('/api/account/switch-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j?.error || 'Could not switch tenant');
        setBusyId(null);
        return;
      }
      // Hard navigation across subdomains — the session cookie set on
      // ".stay.amaldives.com" will still authenticate us, but the new
      // subdomain hosts the new tenant's content.
      window.location.href = `https://${subdomain}.stay.amaldives.com/admin`;
    } catch (e) {
      setBusyId(null);
      alert('Network error while switching tenant');
    }
  }

  // Single-tenant path: no dropdown, just the label. Keeps the UI calm
  // for owners with one property (the majority).
  if (memberships.length <= 1) {
    return (
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {activeLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={activeLogo}
            alt={active?.tenantName || 'Property'}
            className="w-7 h-7 rounded-lg object-cover shrink-0"
          />
        ) : (
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: accentColor || '#0d9488' }}
          >
            <Building2 className="h-4 w-4 text-white" />
          </div>
        )}
        <span className="font-bold text-gray-900 text-sm truncate flex-1">
          {active?.tenantName || 'amaldives STAY'}
        </span>
        {/* Add another business — discoverable from day 1, even for owners
            who only have one tenant today. Sits inline with the tenant
            name so it's hard to miss but easy to ignore. */}
        <Link
          href="/account/add-business"
          aria-label="Add another business"
          title="Add another business"
          className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-md text-gray-400 hover:text-teal-700 hover:bg-teal-50 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  // Multi-tenant path: dropdown.
  return (
    <div className="relative flex-1 min-w-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 py-1 px-1 rounded-md hover:bg-gray-50 transition-colors min-w-0"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {activeLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={activeLogo}
            alt={active?.tenantName || 'Property'}
            className="w-7 h-7 rounded-lg object-cover shrink-0"
          />
        ) : (
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: accentColor || '#0d9488' }}
          >
            <Building2 className="h-4 w-4 text-white" />
          </div>
        )}
        <div className="flex-1 min-w-0 text-left">
          <span className="block font-bold text-gray-900 text-sm truncate">
            {active?.tenantName || 'amaldives STAY'}
          </span>
          <span className="block text-[10px] text-gray-500">
            {memberships.length} accounts · switch
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <>
          {/* Click-outside catcher */}
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
                Your accounts
              </p>
            </div>
            <ul className="max-h-64 overflow-y-auto">
              {/* Active first */}
              {active && (
                <li>
                  <div className="flex items-center gap-2 px-3 py-2 bg-teal-50">
                    <Check className="h-4 w-4 text-teal-700 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {active.tenantName}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate">
                        {active.subdomain}.stay.amaldives.com · {active.role.toLowerCase().replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                </li>
              )}
              {others.map((m) => (
                <li key={m.tenantId}>
                  <button
                    type="button"
                    onClick={() => switchTo(m.tenantId, m.subdomain)}
                    disabled={busyId !== null}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 disabled:opacity-50 disabled:cursor-wait transition-colors"
                  >
                    {busyId === m.tenantId ? (
                      <Loader2 className="h-4 w-4 text-gray-400 animate-spin shrink-0" />
                    ) : (
                      <div className="w-4 h-4 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {m.tenantName}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate">
                        {m.subdomain}.stay.amaldives.com · {m.role.toLowerCase().replace('_', ' ')}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
            <div className="border-t border-gray-100">
              <Link
                href="/account/add-business"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-teal-700 hover:bg-teal-50 transition-colors font-medium"
              >
                <Plus className="h-4 w-4" />
                Add another business
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
