'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Pencil, Trash2, Tag } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface Promotion {
  id: string;
  name: string;
  description: string | null;
  code: string | null;
  discountPercent: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  appliesTo: 'RACK' | 'ALL';
}

const emptyForm = {
  name: '',
  description: '',
  code: '',
  discountPercent: '10',
  startDate: '',
  endDate: '',
  appliesTo: 'RACK' as 'RACK' | 'ALL',
};

export function PromotionsManager() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/promotions', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) setPromotions(data.promotions || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditId(null);
    setForm(emptyForm);
    setError(null);
    setSheetOpen(true);
  }

  function openEdit(p: Promotion) {
    setEditId(p.id);
    setForm({
      name: p.name,
      description: p.description ?? '',
      code: p.code ?? '',
      discountPercent: String(p.discountPercent),
      startDate: p.startDate.slice(0, 10),
      endDate: p.endDate.slice(0, 10),
      appliesTo: p.appliesTo,
    });
    setError(null);
    setSheetOpen(true);
  }

  async function save() {
    if (!form.name.trim() || !form.startDate || !form.endDate) {
      setError('Name and dates are required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        code: form.code.trim() || null,
        discountPercent: Number(form.discountPercent),
        startDate: form.startDate,
        endDate: form.endDate,
        appliesTo: form.appliesTo,
        isActive: true,
      };
      const url = editId ? `/api/admin/promotions/${editId}` : '/api/admin/promotions';
      const method = editId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setSheetOpen(false);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this promotion?')) return;
    const res = await fetch(`/api/admin/promotions/${id}`, { method: 'DELETE' });
    if (res.ok) setPromotions((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Tag className="h-6 w-6 text-teal-600" />
            Promotions
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Discount codes applied to rack or sell rates during a date window.
          </p>
        </div>
        <Button onClick={openCreate} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="h-4 w-4 mr-1" /> Add promotion
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
        </div>
      ) : promotions.length === 0 ? (
        <p className="text-sm text-gray-500">No promotions yet.</p>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="text-left px-4 py-2">Name / Code</th>
                <th className="text-left px-4 py-2">Discount</th>
                <th className="text-left px-4 py-2">Dates</th>
                <th className="text-left px-4 py-2">Applies to</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {promotions.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="px-4 py-3">
                    <p className="font-medium">{p.name}</p>
                    {p.code && (
                      <Badge variant="outline" className="text-[10px] mt-1">{p.code}</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">{p.discountPercent}%</td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(p.startDate).toLocaleDateString()} →{' '}
                    {new Date(p.endDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">{p.appliesTo}</td>
                  <td className="px-4 py-3 text-right gap-1 flex justify-end">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => remove(p.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editId ? 'Edit promotion' : 'New promotion'}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Code (optional)</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </div>
            <div>
              <Label>Discount %</Label>
              <Input
                type="number"
                value={form.discountPercent}
                onChange={(e) => setForm({ ...form, discountPercent: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start</Label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div>
                <Label>End</Label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Applies to</Label>
              <select
                className="w-full border rounded-md h-10 px-3 text-sm"
                value={form.appliesTo}
                onChange={(e) => setForm({ ...form, appliesTo: e.target.value as 'RACK' | 'ALL' })}
              >
                <option value="RACK">Rack rate (recommended)</option>
                <option value="ALL">Sell rate</option>
              </select>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button className="w-full bg-teal-600 hover:bg-teal-700" disabled={saving} onClick={save}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
