'use client';

import { useEffect, useMemo, useState } from 'react';
import { Tag, Calendar, TrendingUp, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

export type RoomTypeRow = {
  id: string;
  type: string;
  basePrice: number;
  count: number;
};

export type RatePlanRow = {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  multiplier: number;
  minStay: number;
  isActive: boolean;
};

interface PricingManagerProps {
  roomTypes: RoomTypeRow[];
  ratePlans: RatePlanRow[];
}

const ROOM_TYPE_LABEL: Record<string, string> = {
  STANDARD: 'Standard',
  DELUXE: 'Deluxe',
  SUITE: 'Suite',
  FAMILY: 'Family',
  DORMITORY: 'Dormitory',
};

function multiplierToPct(m: number): number {
  return Math.round((m - 1) * 100);
}

function pctToMultiplier(pct: number): number {
  return Math.round((1 + pct / 100) * 100) / 100;
}

function pctBadgeColor(pct: number): string {
  if (pct >= 25) return 'bg-orange-100 text-orange-700 border-orange-200';
  if (pct > 0) return 'bg-amber-100 text-amber-700 border-amber-200';
  if (pct === 0) return 'bg-gray-100 text-gray-700 border-gray-200';
  if (pct >= -20) return 'bg-blue-100 text-blue-700 border-blue-200';
  return 'bg-indigo-100 text-indigo-700 border-indigo-200';
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return `${fmt(s)} → ${fmt(e)}`;
}

function isoDateInput(value: string): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

interface PlanForm {
  id?: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  pct: string;
  minStay: string;
}

const emptyForm: PlanForm = {
  name: '',
  description: '',
  startDate: '',
  endDate: '',
  pct: '0',
  minStay: '1',
};

export function PricingManager({ roomTypes: initialRoomTypes, ratePlans: initialPlans }: PricingManagerProps) {
  const [roomTypes, setRoomTypes] = useState<RoomTypeRow[]>(initialRoomTypes);
  const [ratePlans, setRatePlans] = useState<RatePlanRow[]>(initialPlans);
  const [loading, setLoading] = useState(false);

  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [priceDraft, setPriceDraft] = useState('');
  const [savingPriceId, setSavingPriceId] = useState<string | null>(null);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<PlanForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch('/api/admin/rate-plans', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (Array.isArray(data.ratePlans)) {
          setRatePlans(
            data.ratePlans.map((p: any) => ({
              ...p,
              startDate: typeof p.startDate === 'string' ? p.startDate : new Date(p.startDate).toISOString(),
              endDate: typeof p.endDate === 'string' ? p.endDate : new Date(p.endDate).toISOString(),
            }))
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const sortedPlans = useMemo(
    () => [...ratePlans].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()),
    [ratePlans]
  );

  function startPriceEdit(row: RoomTypeRow) {
    setEditingPriceId(row.id);
    setPriceDraft(String(row.basePrice));
  }

  function cancelPriceEdit() {
    setEditingPriceId(null);
    setPriceDraft('');
  }

  async function savePrice(row: RoomTypeRow) {
    const next = Number(priceDraft);
    if (!Number.isFinite(next) || next < 0) {
      cancelPriceEdit();
      return;
    }
    setSavingPriceId(row.id);
    try {
      const res = await fetch(`/api/admin/rooms/${row.id}/price`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ basePrice: next }),
      });
      if (res.ok) {
        setRoomTypes((prev) =>
          prev.map((r) => (r.type === row.type ? { ...r, basePrice: next } : r))
        );
      }
    } finally {
      setSavingPriceId(null);
      cancelPriceEdit();
    }
  }

  function openAddPlan() {
    setForm(emptyForm);
    setError(null);
    setSheetOpen(true);
  }

  function openEditPlan(plan: RatePlanRow) {
    setForm({
      id: plan.id,
      name: plan.name,
      description: plan.description ?? '',
      startDate: isoDateInput(plan.startDate),
      endDate: isoDateInput(plan.endDate),
      pct: String(multiplierToPct(plan.multiplier)),
      minStay: String(plan.minStay),
    });
    setError(null);
    setSheetOpen(true);
  }

  async function savePlan() {
    setError(null);
    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }
    if (!form.startDate || !form.endDate) {
      setError('Start and end date are required');
      return;
    }
    const pctNum = Number(form.pct);
    if (!Number.isFinite(pctNum) || pctNum < -50 || pctNum > 200) {
      setError('Adjustment must be between -50% and +200%');
      return;
    }
    const minStayNum = Math.max(1, Math.floor(Number(form.minStay) || 1));

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      startDate: form.startDate,
      endDate: form.endDate,
      multiplier: pctToMultiplier(pctNum),
      minStay: minStayNum,
    };

    setSaving(true);
    try {
      const url = form.id ? `/api/admin/rate-plans/${form.id}` : '/api/admin/rate-plans';
      const method = form.id ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || 'Failed to save rate plan');
        return;
      }
      const data = await res.json();
      const saved = data.ratePlan as RatePlanRow;
      const normalized: RatePlanRow = {
        ...saved,
        startDate: typeof saved.startDate === 'string' ? saved.startDate : new Date(saved.startDate).toISOString(),
        endDate: typeof saved.endDate === 'string' ? saved.endDate : new Date(saved.endDate).toISOString(),
      };
      setRatePlans((prev) => {
        const idx = prev.findIndex((p) => p.id === normalized.id);
        if (idx === -1) return [...prev, normalized];
        const next = [...prev];
        next[idx] = normalized;
        return next;
      });
      setSheetOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function deletePlan(plan: RatePlanRow) {
    if (!confirm(`Delete rate plan "${plan.name}"?`)) return;
    const res = await fetch(`/api/admin/rate-plans/${plan.id}`, { method: 'DELETE' });
    if (res.ok) {
      setRatePlans((prev) => prev.filter((p) => p.id !== plan.id));
    }
  }

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Tag className="h-6 w-6 text-teal-600" />
          Pricing & Rates
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage base rates per room type and seasonal multipliers.
        </p>
      </div>

      {/* Base Rates */}
      <section className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Base Rates</h2>
            <p className="text-xs text-gray-500">Click a price to edit. Updates all rooms of the same type.</p>
          </div>
        </div>
        {roomTypes.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-500">
            No room types yet. Add rooms first.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="text-left px-5 py-2 font-medium">Room Type</th>
                <th className="text-left px-5 py-2 font-medium">Rooms</th>
                <th className="text-left px-5 py-2 font-medium">Base Price / Night</th>
                <th className="px-5 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {roomTypes.map((row) => {
                const editing = editingPriceId === row.id;
                const isSaving = savingPriceId === row.id;
                return (
                  <tr key={row.id} className="border-t border-gray-100">
                    <td className="px-5 py-3 font-medium text-gray-900">
                      {ROOM_TYPE_LABEL[row.type] ?? row.type}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{row.count}</td>
                    <td className="px-5 py-3">
                      {editing ? (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">$</span>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={priceDraft}
                            onChange={(e) => setPriceDraft(e.target.value)}
                            className="h-8 w-28"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') savePrice(row);
                              if (e.key === 'Escape') cancelPriceEdit();
                            }}
                          />
                          <Button
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => savePrice(row)}
                            disabled={isSaving}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2"
                            onClick={cancelPriceEdit}
                            disabled={isSaving}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startPriceEdit(row)}
                          className="text-left font-semibold text-gray-900 hover:text-teal-700 hover:underline underline-offset-2"
                        >
                          ${row.basePrice.toFixed(2)}
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {!editing && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startPriceEdit(row)}
                          className="text-gray-500 hover:text-gray-900"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* Rate Plans */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-teal-600" />
              Seasonal Rate Plans
            </h2>
            <p className="text-xs text-gray-500">
              Multipliers applied on top of base rates during a date range.
            </p>
          </div>
          <Button onClick={openAddPlan} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Rate Plan
          </Button>
        </div>

        {loading && ratePlans.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-10 text-center text-sm text-gray-500">
            Loading rate plans…
          </div>
        ) : sortedPlans.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-lg p-10 text-center">
            <Calendar className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No rate plans yet.</p>
            <Button onClick={openAddPlan} variant="outline" size="sm" className="mt-3">
              <Plus className="h-4 w-4 mr-1" />
              Create your first rate plan
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sortedPlans.map((plan) => {
              const pct = multiplierToPct(plan.multiplier);
              const sign = pct > 0 ? '+' : '';
              return (
                <div
                  key={plan.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col gap-3 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 truncate">{plan.name}</h3>
                        {!plan.isActive && (
                          <Badge variant="secondary" className="text-[10px]">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      {plan.description && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{plan.description}</p>
                      )}
                    </div>
                    <Badge className={`${pctBadgeColor(pct)} border whitespace-nowrap`}>
                      {sign}
                      {pct}%
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-600 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-gray-400" />
                    {formatDateRange(plan.startDate, plan.endDate)}
                  </div>
                  <div className="text-xs text-gray-500">
                    Min stay: <span className="font-medium text-gray-700">{plan.minStay} night{plan.minStay === 1 ? '' : 's'}</span>
                  </div>
                  <div className="flex justify-end gap-1 pt-1 border-t border-gray-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditPlan(plan)}
                      className="text-gray-500 hover:text-gray-900"
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deletePlan(plan)}
                      className="text-gray-500 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{form.id ? 'Edit Rate Plan' : 'New Rate Plan'}</SheetTitle>
            <SheetDescription>
              Apply a percentage adjustment to base prices during the selected date range.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="rp-name">Name</Label>
              <Input
                id="rp-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="High Season"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rp-desc">Description</Label>
              <Input
                id="rp-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional notes"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rp-start">Start Date</Label>
                <Input
                  id="rp-start"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rp-end">End Date</Label>
                <Input
                  id="rp-end"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rp-pct">Adjustment (%)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="rp-pct"
                  type="number"
                  min="-50"
                  max="200"
                  step="1"
                  value={form.pct}
                  onChange={(e) => setForm((f) => ({ ...f, pct: e.target.value }))}
                />
                <span className="text-sm text-gray-500">%</span>
              </div>
              <p className="text-xs text-gray-500">
                Use negative for low-season discounts (e.g. -20). Range: -50 to +200.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rp-stay">Minimum Nights</Label>
              <Input
                id="rp-stay"
                type="number"
                min="1"
                step="1"
                value={form.minStay}
                onChange={(e) => setForm((f) => ({ ...f, minStay: e.target.value }))}
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setSheetOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={savePlan} disabled={saving}>
                {saving ? 'Saving…' : form.id ? 'Save Changes' : 'Create Plan'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
