'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Plus, Pencil, Trash2, Loader2, Phone, Mail, Users, MapPin, Clock, FileText,
} from 'lucide-react';

export type TransportType =
  | 'DOMESTIC_FLIGHT' | 'SEAPLANE' | 'FERRY'
  | 'SPEEDBOAT' | 'CHARTER_BOAT' | 'SELF_ARRANGED' | 'OTHER';

export interface TransportOption {
  id: string;
  type: TransportType;
  name: string;
  operator?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  capacity?: number | null;
  arrivalPoint?: string | null;
  departurePoint?: string | null;
  schedule?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const TYPE_META: Record<TransportType, { label: string; emoji: string; color: string }> = {
  SEAPLANE:        { label: 'Seaplane',        emoji: '🛩️', color: 'bg-sky-100 text-sky-800 border-sky-200' },
  DOMESTIC_FLIGHT: { label: 'Domestic Flight', emoji: '✈️', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  FERRY:           { label: 'Ferry',           emoji: '🚢', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  SPEEDBOAT:       { label: 'Speedboat',       emoji: '🚤', color: 'bg-teal-100 text-teal-800 border-teal-200' },
  CHARTER_BOAT:    { label: 'Charter Boat',    emoji: '⛵', color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  SELF_ARRANGED:   { label: 'Self Arranged',   emoji: '👤', color: 'bg-gray-100 text-gray-700 border-gray-200' },
  OTHER:           { label: 'Other',           emoji: '📦', color: 'bg-orange-100 text-orange-800 border-orange-200' },
};

const TYPE_ORDER: TransportType[] = [
  'SEAPLANE', 'DOMESTIC_FLIGHT', 'FERRY', 'SPEEDBOAT', 'CHARTER_BOAT', 'SELF_ARRANGED', 'OTHER',
];

const EMPTY: Omit<TransportOption, 'id' | 'createdAt' | 'updatedAt' | 'isActive'> = {
  type: 'SPEEDBOAT',
  name: '',
  operator: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  capacity: null,
  arrivalPoint: '',
  departurePoint: '',
  schedule: '',
  notes: '',
};

interface Props {
  initialOptions: TransportOption[];
}

export function TransportSettingsClient({ initialOptions }: Props) {
  const [options, setOptions] = useState<TransportOption[]>(initialOptions);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TransportOption | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState('');

  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY });
    setError('');
    setModalOpen(true);
  };

  const openEdit = (opt: TransportOption) => {
    setEditing(opt);
    setForm({
      type: opt.type,
      name: opt.name,
      operator: opt.operator ?? '',
      contactName: opt.contactName ?? '',
      contactPhone: opt.contactPhone ?? '',
      contactEmail: opt.contactEmail ?? '',
      capacity: opt.capacity ?? null,
      arrivalPoint: opt.arrivalPoint ?? '',
      departurePoint: opt.departurePoint ?? '',
      schedule: opt.schedule ?? '',
      notes: opt.notes ?? '',
    });
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError('');
    try {
      const body = {
        ...form,
        capacity: form.capacity != null && form.capacity !== ('' as any) ? Number(form.capacity) : null,
        operator: form.operator || null,
        contactName: form.contactName || null,
        contactPhone: form.contactPhone || null,
        contactEmail: form.contactEmail || null,
        arrivalPoint: form.arrivalPoint || null,
        departurePoint: form.departurePoint || null,
        schedule: form.schedule || null,
        notes: form.notes || null,
      };
      let res: Response;
      if (editing) {
        res = await fetch(`/api/admin/transport-options/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch('/api/admin/transport-options', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }
      if (!res.ok) throw new Error((await res.json()).error ?? 'Save failed');
      const data = await res.json();
      if (editing) {
        setOptions((prev) => prev.map((o) => (o.id === editing.id ? data.option : o)));
      } else {
        setOptions((prev) => [...prev, data.option]);
      }
      setModalOpen(false);
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = useCallback(async (opt: TransportOption) => {
    if (!confirm(`Archive "${opt.name}"? It will no longer appear in lookups but existing arrival records are kept.`)) return;
    setDeleting(opt.id);
    try {
      await fetch(`/api/admin/transport-options/${opt.id}`, { method: 'DELETE' });
      setOptions((prev) => prev.filter((o) => o.id !== opt.id));
    } finally {
      setDeleting(null);
    }
  }, []);

  const grouped = TYPE_ORDER.reduce<Record<TransportType, TransportOption[]>>((acc, t) => {
    acc[t] = options.filter((o) => o.type === t);
    return acc;
  }, {} as any);

  const hasArrivalPoint = (type: TransportType) =>
    ['SEAPLANE', 'DOMESTIC_FLIGHT', 'FERRY'].includes(type);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transport Catalog</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Pre-configure ferries, flights, and own boats. Staff pick from this list when planning arrivals.
          </p>
        </div>
        <Button onClick={openAdd} className="bg-cyan-600 hover:bg-cyan-700 gap-2">
          <Plus className="h-4 w-4" /> Add Transport
        </Button>
      </div>

      {/* Groups */}
      {TYPE_ORDER.map((type) => {
        const group = grouped[type];
        if (group.length === 0) return null;
        const meta = TYPE_META[type];
        return (
          <div key={type} className="mb-8">
            <h2 className={`inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full border mb-3 ${meta.color}`}>
              <span>{meta.emoji}</span> {meta.label}s
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {group.map((opt) => (
                <div key={opt.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow transition-shadow">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-semibold text-gray-900 leading-tight">{opt.name}</p>
                      {opt.operator && (
                        <p className="text-xs text-gray-500 mt-0.5">{opt.operator}</p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => openEdit(opt)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDelete(opt)} disabled={deleting === opt.id}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600">
                        {deleting === opt.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 text-[11px] text-gray-600">
                    {opt.capacity != null && (
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3 w-3 text-gray-400" />
                        <span>{opt.capacity} pax max</span>
                      </div>
                    )}
                    {(opt.arrivalPoint || opt.departurePoint) && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 text-gray-400" />
                        <span>
                          {opt.departurePoint && <>{opt.departurePoint}</>}
                          {opt.departurePoint && opt.arrivalPoint && ' → '}
                          {opt.arrivalPoint && <>{opt.arrivalPoint}</>}
                        </span>
                      </div>
                    )}
                    {opt.schedule && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-gray-400" />
                        <span className="truncate">{opt.schedule}</span>
                      </div>
                    )}
                    {opt.contactName && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-400">👤</span>
                        <span>{opt.contactName}</span>
                      </div>
                    )}
                    {opt.contactPhone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3 text-gray-400" />
                        <a href={`tel:${opt.contactPhone}`} className="text-blue-600 hover:underline">{opt.contactPhone}</a>
                      </div>
                    )}
                    {opt.contactEmail && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3 w-3 text-gray-400" />
                        <a href={`mailto:${opt.contactEmail}`} className="text-blue-600 hover:underline truncate">{opt.contactEmail}</a>
                      </div>
                    )}
                    {opt.notes && (
                      <div className="flex items-start gap-1.5 mt-1.5 pt-1.5 border-t">
                        <FileText className="h-3 w-3 text-gray-400 mt-0.5 shrink-0" />
                        <span className="text-gray-500 line-clamp-2">{opt.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {options.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <span className="text-5xl mb-4 block">🚤</span>
          <p className="text-lg font-medium text-gray-500">No transport options yet</p>
          <p className="text-sm mt-1">Add ferries, flights, and own boats to speed up arrival planning.</p>
          <Button onClick={openAdd} className="mt-4 bg-cyan-600 hover:bg-cyan-700 gap-2">
            <Plus className="h-4 w-4" /> Add your first transport
          </Button>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Transport Option' : 'Add Transport Option'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {/* Type */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type *</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as TransportType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPE_ORDER.map((t) => (
                      <SelectItem key={t} value={t}>
                        {TYPE_META[t].emoji} {TYPE_META[t].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Capacity (max pax)</Label>
                <Input type="number" min="1" value={form.capacity ?? ''} placeholder="e.g. 16"
                  onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value ? Number(e.target.value) : null }))} />
              </div>
            </div>

            {/* Name + Operator */}
            <div className="space-y-1.5">
              <Label>Name / Identifier *</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={
                  form.type === 'FERRY' ? 'e.g. Island Ferry – Male Hulhumale' :
                  form.type === 'SEAPLANE' ? 'e.g. TMA Seaplane MLE–KDH' :
                  form.type === 'DOMESTIC_FLIGHT' ? 'e.g. Maldivian Q2-601' :
                  'e.g. Sea Star Dhoni'
                } />
            </div>
            <div className="space-y-1.5">
              <Label>Operator / Company</Label>
              <Input value={form.operator ?? ''} onChange={(e) => setForm((f) => ({ ...f, operator: e.target.value }))}
                placeholder="e.g. Trans Maldivian Airways, Island Ferries Ltd" />
            </div>

            {/* Route */}
            {hasArrivalPoint(form.type) && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Departure Point</Label>
                  <Input value={form.departurePoint ?? ''} onChange={(e) => setForm((f) => ({ ...f, departurePoint: e.target.value }))}
                    placeholder="e.g. Velana (VIA), Male Ferry Terminal" />
                </div>
                <div className="space-y-1.5">
                  <Label>Arrival Point</Label>
                  <Input value={form.arrivalPoint ?? ''} onChange={(e) => setForm((f) => ({ ...f, arrivalPoint: e.target.value }))}
                    placeholder="e.g. Hanimaadhoo (HDH), Dhigurah Jetty" />
                </div>
              </div>
            )}
            {!hasArrivalPoint(form.type) && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Departure Jetty</Label>
                  <Input value={form.departurePoint ?? ''} onChange={(e) => setForm((f) => ({ ...f, departurePoint: e.target.value }))}
                    placeholder="e.g. Male Harbour Jetty" />
                </div>
                <div className="space-y-1.5">
                  <Label>Arrival Jetty</Label>
                  <Input value={form.arrivalPoint ?? ''} onChange={(e) => setForm((f) => ({ ...f, arrivalPoint: e.target.value }))}
                    placeholder="e.g. Property Jetty" />
                </div>
              </div>
            )}

            {/* Schedule */}
            <div className="space-y-1.5">
              <Label>Schedule / Timings</Label>
              <Input value={form.schedule ?? ''} onChange={(e) => setForm((f) => ({ ...f, schedule: e.target.value }))}
                placeholder="e.g. Daily 08:00, 14:00, 18:00  or  Mon/Thu 09:30" />
            </div>

            {/* Contact */}
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Name / Captain / Agent</Label>
                  <Input value={form.contactName ?? ''} onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
                    placeholder="e.g. Ahmed Mohamed" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Phone</Label>
                  <Input value={form.contactPhone ?? ''} onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
                    placeholder="+960 777 1234" className="h-9 text-sm" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input type="email" value={form.contactEmail ?? ''} onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
                  placeholder="bookings@ferryco.mv" className="h-9 text-sm" />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes ?? ''} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Any special instructions, luggage limits, check-in requirements…" rows={2} />
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

            <DialogFooter className="border-t pt-3">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-cyan-600 hover:bg-cyan-700">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? 'Save Changes' : 'Add Transport'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
