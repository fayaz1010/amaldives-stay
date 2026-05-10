'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Utensils,
  Coffee,
  Wine,
  Calendar,
  Receipt,
  Plus,
  Edit2,
  Trash2,
  CreditCard,
  Printer,
  Loader2,
  MapPin,
  Users,
  Clock,
  X,
  Eye,
  Leaf,
} from 'lucide-react';

type OutletType = 'RESTAURANT' | 'BAR' | 'CAFE' | 'BEACH_BAR' | 'ROOM_SERVICE_OUTLET';

interface Outlet {
  id: string;
  name: string;
  description: string | null;
  outletType: OutletType;
  location: string | null;
  isActive: boolean;
  menuItemCount: number;
  reservationCount: number;
  billCount: number;
  createdAt: string;
  updatedAt: string;
}

interface MenuItem {
  id: string;
  outletId: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  isActive: boolean;
  isVegetarian: boolean;
  isVegan: boolean;
  allergens: string[];
  preparationTime: number | null;
}

type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'SEATED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

interface Reservation {
  id: string;
  outletId: string;
  guestName: string;
  guestPhone: string | null;
  partySize: number;
  date: string;
  status: ReservationStatus;
  notes: string | null;
  outlet?: { id: string; name: string; outletType: OutletType };
}

type BillStatus = 'OPEN' | 'CLOSED' | 'PAID' | 'VOIDED';
type PaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'DIGITAL_WALLET' | 'CRYPTO';

interface BillItem {
  name: string;
  qty: number;
  unitPrice: number;
  totalPrice: number;
}

interface Bill {
  id: string;
  outletId: string;
  guestName: string | null;
  tableNumber: string | null;
  items: BillItem[];
  subtotal: number;
  discount: number;
  serviceCharge: number;
  tax: number;
  totalAmount: number;
  paidAmount: number;
  status: BillStatus;
  paymentMethod: PaymentMethod | null;
  notes: string | null;
  createdAt: string;
  outlet?: { id: string; name: string; outletType: OutletType };
}

const OUTLET_TYPES: { value: OutletType; label: string; icon: React.ComponentType<any>; color: string }[] = [
  { value: 'RESTAURANT', label: 'Restaurant', icon: Utensils, color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { value: 'BAR', label: 'Bar', icon: Wine, color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'CAFE', label: 'Café', icon: Coffee, color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'BEACH_BAR', label: 'Beach Bar', icon: Wine, color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  { value: 'ROOM_SERVICE_OUTLET', label: 'Room Service', icon: Utensils, color: 'bg-slate-100 text-slate-700 border-slate-200' },
];

const MENU_CATEGORIES = ['Appetizers', 'Mains', 'Desserts', 'Beverages', 'Cocktails', 'Wine', 'Sides', 'Specials'];

const RESERVATION_STATUSES: { value: ReservationStatus; label: string; color: string }[] = [
  { value: 'PENDING', label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'CONFIRMED', label: 'Confirmed', color: 'bg-blue-100 text-blue-700' },
  { value: 'SEATED', label: 'Seated', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'COMPLETED', label: 'Completed', color: 'bg-slate-100 text-slate-600' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'bg-red-100 text-red-700' },
  { value: 'NO_SHOW', label: 'No Show', color: 'bg-gray-100 text-gray-600' },
];

const BILL_STATUSES: { value: BillStatus; label: string; color: string }[] = [
  { value: 'OPEN', label: 'Open', color: 'bg-blue-100 text-blue-700' },
  { value: 'CLOSED', label: 'Closed', color: 'bg-amber-100 text-amber-700' },
  { value: 'PAID', label: 'Paid', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'VOIDED', label: 'Voided', color: 'bg-red-100 text-red-700' },
];

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'DIGITAL_WALLET', label: 'Digital Wallet' },
  { value: 'CRYPTO', label: 'Crypto' },
];

function getOutletTypeMeta(type: OutletType) {
  return OUTLET_TYPES.find((t) => t.value === type) ?? OUTLET_TYPES[0];
}

function fmtMoney(n: number) {
  return `$${(n ?? 0).toFixed(2)}`;
}

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toLocalDateTimeInput(iso?: string) {
  const d = iso ? new Date(iso) : new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface FnBManagerProps {
  outlets: Outlet[];
  todayReservationCount: number;
  openBillCount: number;
}

export function FnBManager({
  outlets: initialOutlets,
  todayReservationCount,
  openBillCount,
}: FnBManagerProps) {
  const router = useRouter();
  const [tab, setTab] = useState('outlets');
  const [outlets, setOutlets] = useState<Outlet[]>(initialOutlets);

  const [selectedOutletId, setSelectedOutletId] = useState<string>(
    initialOutlets[0]?.id ?? ''
  );
  const [billsOutletFilter, setBillsOutletFilter] = useState<string>('all');

  // Outlet dialog state
  const [outletDialogOpen, setOutletDialogOpen] = useState(false);
  const [editingOutlet, setEditingOutlet] = useState<Outlet | null>(null);

  useEffect(() => {
    setOutlets(initialOutlets);
    if (!selectedOutletId && initialOutlets.length > 0) {
      setSelectedOutletId(initialOutlets[0].id);
    }
  }, [initialOutlets]);

  async function refreshOutlets() {
    try {
      const res = await fetch('/api/admin/fnb/outlets');
      if (res.ok) {
        const json = await res.json();
        const mapped: Outlet[] = (json.outlets ?? []).map((o: any) => ({
          id: o.id,
          name: o.name,
          description: o.description,
          outletType: o.outletType,
          location: o.location,
          isActive: o.isActive,
          menuItemCount: o._count?.menuItems ?? 0,
          reservationCount: o._count?.reservations ?? 0,
          billCount: o._count?.bills ?? 0,
          createdAt: o.createdAt,
          updatedAt: o.updatedAt,
        }));
        setOutlets(mapped);
      }
    } catch {}
    router.refresh();
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Utensils className="h-6 w-6 text-cyan-600" />
            Food &amp; Beverage
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage outlets, menus, reservations and bills
          </p>
        </div>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-cyan-50 flex items-center justify-center">
              <Utensils className="h-5 w-5 text-cyan-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{outlets.filter((o) => o.isActive).length}</p>
              <p className="text-xs text-gray-500">Active outlets</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{todayReservationCount}</p>
              <p className="text-xs text-gray-500">Today&apos;s reservations</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Receipt className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{openBillCount}</p>
              <p className="text-xs text-gray-500">Open bills</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="outlets">Outlets</TabsTrigger>
          <TabsTrigger value="menu">Menu</TabsTrigger>
          <TabsTrigger value="reservations">Reservations</TabsTrigger>
          <TabsTrigger value="bills">Bills</TabsTrigger>
        </TabsList>

        <TabsContent value="outlets" className="mt-4">
          <OutletsTab
            outlets={outlets}
            onAdd={() => {
              setEditingOutlet(null);
              setOutletDialogOpen(true);
            }}
            onEdit={(o) => {
              setEditingOutlet(o);
              setOutletDialogOpen(true);
            }}
            onDelete={async (o) => {
              if (!confirm(`Deactivate outlet "${o.name}"?`)) return;
              const res = await fetch(`/api/admin/fnb/outlets/${o.id}`, { method: 'DELETE' });
              if (res.ok) refreshOutlets();
              else alert('Failed to deactivate outlet');
            }}
            onViewMenu={(o) => {
              setSelectedOutletId(o.id);
              setTab('menu');
            }}
            onViewBills={(o) => {
              setBillsOutletFilter(o.id);
              setTab('bills');
            }}
          />
        </TabsContent>

        <TabsContent value="menu" className="mt-4">
          <MenuTab
            outlets={outlets}
            outletId={selectedOutletId}
            onOutletChange={setSelectedOutletId}
          />
        </TabsContent>

        <TabsContent value="reservations" className="mt-4">
          <ReservationsTab outlets={outlets} />
        </TabsContent>

        <TabsContent value="bills" className="mt-4">
          <BillsTab
            outlets={outlets}
            outletFilter={billsOutletFilter}
            onOutletFilterChange={setBillsOutletFilter}
          />
        </TabsContent>
      </Tabs>

      <OutletDialog
        open={outletDialogOpen}
        onOpenChange={setOutletDialogOpen}
        initial={editingOutlet}
        onSaved={refreshOutlets}
      />
    </div>
  );
}

/* ----------------------------- OUTLETS TAB ----------------------------- */

function OutletsTab({
  outlets,
  onAdd,
  onEdit,
  onDelete,
  onViewMenu,
  onViewBills,
}: {
  outlets: Outlet[];
  onAdd: () => void;
  onEdit: (o: Outlet) => void;
  onDelete: (o: Outlet) => void;
  onViewMenu: (o: Outlet) => void;
  onViewBills: (o: Outlet) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Outlets</h2>
        <Button onClick={onAdd} className="bg-cyan-600 hover:bg-cyan-700">
          <Plus className="h-4 w-4 mr-2" /> Add Outlet
        </Button>
      </div>

      {outlets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <Utensils className="h-10 w-10 mx-auto text-gray-300 mb-3" />
            <p className="text-lg font-medium mb-1">No outlets yet</p>
            <p className="text-sm">Add your first restaurant, bar, or café to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {outlets.map((o) => {
            const meta = getOutletTypeMeta(o.outletType);
            const Icon = meta.icon;
            return (
              <Card key={o.id} className={o.isActive ? '' : 'opacity-60'}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`h-9 w-9 rounded-lg border flex items-center justify-center ${meta.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{o.name}</p>
                        <Badge variant="outline" className={`text-[10px] mt-0.5 ${meta.color}`}>
                          {meta.label}
                        </Badge>
                      </div>
                    </div>
                    {!o.isActive && <Badge variant="outline" className="text-[10px]">Inactive</Badge>}
                  </div>

                  {o.description && (
                    <p className="text-xs text-gray-500 line-clamp-2">{o.description}</p>
                  )}

                  {o.location && (
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {o.location}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-xs text-gray-600 pt-2 border-t">
                    <span><strong>{o.menuItemCount}</strong> items</span>
                    <span><strong>{o.reservationCount}</strong> reservations</span>
                    <span><strong>{o.billCount}</strong> bills</span>
                  </div>

                  <div className="flex items-center gap-1.5 pt-1">
                    <Button size="sm" variant="outline" className="flex-1 h-8" onClick={() => onViewMenu(o)}>
                      Menu
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 h-8" onClick={() => onViewBills(o)}>
                      Bills
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => onEdit(o)} title="Edit">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    {o.isActive && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        onClick={() => onDelete(o)}
                        title="Deactivate"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function OutletDialog({
  open,
  onOpenChange,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: Outlet | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [outletType, setOutletType] = useState<OutletType>('RESTAURANT');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? '');
      setOutletType(initial?.outletType ?? 'RESTAURANT');
      setLocation(initial?.location ?? '');
      setDescription(initial?.description ?? '');
    }
  }, [open, initial]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const url = initial ? `/api/admin/fnb/outlets/${initial.id}` : '/api/admin/fnb/outlets';
      const res = await fetch(url, {
        method: initial ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, outletType, location, description }),
      });
      if (!res.ok) throw new Error('Save failed');
      onOpenChange(false);
      onSaved();
    } catch {
      alert('Failed to save outlet');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit Outlet' : 'Add Outlet'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="o-name">Name *</Label>
            <Input id="o-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="o-type">Type *</Label>
              <Select value={outletType} onValueChange={(v) => setOutletType(v as OutletType)}>
                <SelectTrigger id="o-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OUTLET_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="o-loc">Location</Label>
              <Input
                id="o-loc"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Lobby, Beachfront"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="o-desc">Description</Label>
            <Textarea
              id="o-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-cyan-600 hover:bg-cyan-700">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : initial ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------ MENU TAB ------------------------------ */

function MenuTab({
  outlets,
  outletId,
  onOutletChange,
}: {
  outlets: Outlet[];
  outletId: string;
  onOutletChange: (id: string) => void;
}) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    if (!outletId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/fnb/outlets/${outletId}/menu?all=1`);
      if (res.ok) {
        const json = await res.json();
        setItems(json.items ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [outletId]);

  async function deleteItem(item: MenuItem) {
    if (!confirm(`Hide "${item.name}" from menu?`)) return;
    setBusyId(item.id);
    try {
      const res = await fetch(`/api/admin/fnb/outlets/${outletId}/menu/${item.id}`, { method: 'DELETE' });
      if (res.ok) load();
      else alert('Failed to hide item');
    } finally {
      setBusyId(null);
    }
  }

  async function toggleActive(item: MenuItem) {
    setBusyId(item.id);
    try {
      const res = await fetch(`/api/admin/fnb/outlets/${outletId}/menu/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      if (res.ok) load();
    } finally {
      setBusyId(null);
    }
  }

  const grouped = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    for (const it of items) {
      const k = it.category || 'Other';
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(it);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  if (outlets.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          Add an outlet first to manage its menu.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Label className="text-sm">Outlet</Label>
          <Select value={outletId} onValueChange={onOutletChange}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Choose an outlet" />
            </SelectTrigger>
            <SelectContent>
              {outlets.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.name} {!o.isActive && '(inactive)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={() => { setEditing(null); setDialogOpen(true); }}
          className="bg-cyan-600 hover:bg-cyan-700"
          disabled={!outletId}
        >
          <Plus className="h-4 w-4 mr-2" /> Add Menu Item
        </Button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin inline" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <Utensils className="h-10 w-10 mx-auto text-gray-300 mb-3" />
            <p className="text-lg font-medium mb-1">Empty menu</p>
            <p className="text-sm">Add your first item.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {grouped.map(([cat, list]) => (
            <div key={cat}>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                {cat} <span className="text-gray-300 font-normal">({list.length})</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {list.map((it) => (
                  <Card key={it.id} className={it.isActive ? '' : 'opacity-50'}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate flex items-center gap-1.5">
                            {it.name}
                            {it.isVegan && <Leaf className="h-3.5 w-3.5 text-green-600" />}
                            {!it.isVegan && it.isVegetarian && <Leaf className="h-3.5 w-3.5 text-green-400" />}
                          </p>
                          {it.description && (
                            <p className="text-xs text-gray-500 line-clamp-2 mt-1">{it.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <p className="text-base font-bold text-cyan-700">{fmtMoney(it.price)}</p>
                            {it.preparationTime != null && (
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Clock className="h-3 w-3" /> {it.preparationTime}m
                              </span>
                            )}
                          </div>
                          {it.allergens && it.allergens.length > 0 && (
                            <p className="text-[10px] text-amber-700 mt-1">
                              Allergens: {it.allergens.join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 mt-3 pt-2 border-t">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => toggleActive(it)}
                          disabled={busyId === it.id}
                        >
                          {busyId === it.id ? <Loader2 className="h-3 w-3 animate-spin" /> : (it.isActive ? 'Hide' : 'Show')}
                        </Button>
                        <div className="flex-1" />
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditing(it); setDialogOpen(true); }}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                          onClick={() => deleteItem(it)}
                          disabled={busyId === it.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <MenuItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        outletId={outletId}
        onSaved={() => { setDialogOpen(false); load(); }}
      />
    </div>
  );
}

function MenuItemDialog({
  open,
  onOpenChange,
  initial,
  outletId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: MenuItem | null;
  outletId: string;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Mains');
  const [price, setPrice] = useState('');
  const [isVegetarian, setIsVegetarian] = useState(false);
  const [isVegan, setIsVegan] = useState(false);
  const [allergens, setAllergens] = useState('');
  const [preparationTime, setPreparationTime] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? '');
      setDescription(initial?.description ?? '');
      setCategory(initial?.category ?? 'Mains');
      setPrice(initial?.price?.toString() ?? '');
      setIsVegetarian(initial?.isVegetarian ?? false);
      setIsVegan(initial?.isVegan ?? false);
      setAllergens((initial?.allergens ?? []).join(', '));
      setPreparationTime(initial?.preparationTime?.toString() ?? '');
    }
  }, [open, initial]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !category.trim() || !price) return;
    setSaving(true);
    try {
      const url = initial
        ? `/api/admin/fnb/outlets/${outletId}/menu/${initial.id}`
        : `/api/admin/fnb/outlets/${outletId}/menu`;
      const res = await fetch(url, {
        method: initial ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          category,
          price: Number(price),
          isVegetarian,
          isVegan,
          allergens: allergens.split(',').map((s) => s.trim()).filter(Boolean),
          preparationTime: preparationTime ? Number(preparationTime) : null,
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      onSaved();
    } catch {
      alert('Failed to save menu item');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit Menu Item' : 'Add Menu Item'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mi-name">Name *</Label>
            <Input id="mi-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="mi-cat">Category *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="mi-cat">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MENU_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mi-price">Price *</Label>
              <Input
                id="mi-price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="mi-desc">Description</Label>
            <Textarea
              id="mi-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="mi-prep">Prep time (min)</Label>
              <Input
                id="mi-prep"
                type="number"
                min="0"
                value={preparationTime}
                onChange={(e) => setPreparationTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mi-allerg">Allergens (comma-separated)</Label>
              <Input
                id="mi-allerg"
                value={allergens}
                onChange={(e) => setAllergens(e.target.value)}
                placeholder="nuts, dairy, gluten"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isVegetarian} onChange={(e) => setIsVegetarian(e.target.checked)} />
              Vegetarian
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isVegan}
                onChange={(e) => {
                  setIsVegan(e.target.checked);
                  if (e.target.checked) setIsVegetarian(true);
                }}
              />
              Vegan
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-cyan-600 hover:bg-cyan-700">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : initial ? 'Save' : 'Add'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------- RESERVATIONS TAB --------------------------- */

function ReservationsTab({ outlets }: { outlets: Outlet[] }) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [outletFilter, setOutletFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState(''); // yyyy-mm-dd
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (outletFilter !== 'all') params.set('outletId', outletFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (dateFilter) params.set('date', dateFilter);
      const res = await fetch(`/api/admin/fnb/reservations?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setReservations(json.reservations ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [outletFilter, statusFilter, dateFilter]);

  async function changeStatus(r: Reservation, status: ReservationStatus) {
    setBusyId(r.id);
    try {
      const res = await fetch(`/api/admin/fnb/reservations/${r.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={outletFilter} onValueChange={setOutletFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All outlets</SelectItem>
              {outlets.map((o) => (<SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {RESERVATION_STATUSES.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-40"
          />
          {dateFilter && (
            <Button variant="ghost" size="sm" onClick={() => setDateFilter('')}>
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-cyan-600 hover:bg-cyan-700" disabled={outlets.length === 0}>
          <Plus className="h-4 w-4 mr-2" /> New Reservation
        </Button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin inline" />
        </div>
      ) : reservations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <Calendar className="h-10 w-10 mx-auto text-gray-300 mb-3" />
            <p className="text-lg font-medium mb-1">No reservations</p>
            <p className="text-sm">Adjust filters or create a new reservation.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date / Time</TableHead>
                <TableHead>Guest</TableHead>
                <TableHead>Outlet</TableHead>
                <TableHead>Party</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reservations.map((r) => {
                const status = RESERVATION_STATUSES.find((s) => s.value === r.status)!;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{fmtDateTime(r.date)}</TableCell>
                    <TableCell>
                      <div>{r.guestName}</div>
                      {r.guestPhone && <div className="text-xs text-gray-500">{r.guestPhone}</div>}
                    </TableCell>
                    <TableCell className="text-sm">{r.outlet?.name ?? '—'}</TableCell>
                    <TableCell className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-gray-400" /> {r.partySize}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${status.color}`}>
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Select
                        value={r.status}
                        onValueChange={(v) => changeStatus(r, v as ReservationStatus)}
                        disabled={busyId === r.id}
                      >
                        <SelectTrigger className="w-36 h-8 ml-auto text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RESERVATION_STATUSES.map((s) => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <ReservationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        outlets={outlets}
        onSaved={() => { setDialogOpen(false); load(); }}
      />
    </div>
  );
}

type CheckedInGuest = {
  bookingId: string;
  confirmationNumber: string;
  roomNumber: string;
  guestName: string;
  guestPhone: string | null;
  checkOutDate: string;
};

function ReservationDialog({
  open,
  onOpenChange,
  outlets,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  outlets: Outlet[];
  onSaved: () => void;
}) {
  const [outletId, setOutletId] = useState(outlets[0]?.id ?? '');
  const [guestSource, setGuestSource] = useState<'inhouse' | 'walkin'>('inhouse');
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [partySize, setPartySize] = useState('2');
  const [date, setDate] = useState(toLocalDateTimeInput());
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [checkedInGuests, setCheckedInGuests] = useState<CheckedInGuest[]>([]);
  const [loadingGuests, setLoadingGuests] = useState(false);

  // Fetch currently checked-in guests when dialog opens
  useEffect(() => {
    if (!open) return;
    setOutletId(outlets[0]?.id ?? '');
    setGuestSource('inhouse');
    setSelectedBookingId('');
    setGuestName('');
    setGuestPhone('');
    setPartySize('2');
    setDate(toLocalDateTimeInput());
    setNotes('');
    setLoadingGuests(true);
    fetch('/api/admin/fnb/checked-in-guests')
      .then((r) => r.json())
      .then((d) => setCheckedInGuests(d.guests ?? []))
      .catch(() => setCheckedInGuests([]))
      .finally(() => setLoadingGuests(false));
  }, [open, outlets]);

  // When an in-house guest is selected from the dropdown, auto-fill name + phone
  function handleInHouseSelect(bookingId: string) {
    setSelectedBookingId(bookingId);
    const guest = checkedInGuests.find((g) => g.bookingId === bookingId);
    if (guest) {
      setGuestName(guest.guestName);
      setGuestPhone(guest.guestPhone ?? '');
    }
  }

  // Derive the effective name for validation
  const effectiveName = guestSource === 'inhouse'
    ? (checkedInGuests.find((g) => g.bookingId === selectedBookingId)?.guestName ?? guestName)
    : guestName;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!outletId || !effectiveName.trim() || !date) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/fnb/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outletId,
          guestName: effectiveName.trim(),
          guestPhone: guestPhone.trim() || null,
          partySize: Number(partySize),
          date: new Date(date).toISOString(),
          notes,
          bookingId: guestSource === 'inhouse' && selectedBookingId ? selectedBookingId : undefined,
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      onSaved();
    } catch {
      alert('Failed to save reservation');
    } finally {
      setSaving(false);
    }
  }

  const hasInHouseGuests = checkedInGuests.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Reservation</DialogTitle>
          <DialogDescription>Book a table at one of your outlets.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          {/* Outlet */}
          <div className="space-y-2">
            <Label>Outlet *</Label>
            <Select value={outletId} onValueChange={setOutletId}>
              <SelectTrigger><SelectValue placeholder="Choose outlet" /></SelectTrigger>
              <SelectContent>
                {outlets.map((o) => (<SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          {/* Guest source toggle */}
          <div className="space-y-2">
            <Label>Guest</Label>
            <div className="flex rounded-lg border overflow-hidden text-sm">
              <button
                type="button"
                onClick={() => setGuestSource('inhouse')}
                className={`flex-1 py-2 px-3 font-medium transition-colors ${
                  guestSource === 'inhouse'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                🏨 In-House Guest
              </button>
              <button
                type="button"
                onClick={() => { setGuestSource('walkin'); setSelectedBookingId(''); setGuestName(''); setGuestPhone(''); }}
                className={`flex-1 py-2 px-3 font-medium transition-colors border-l ${
                  guestSource === 'walkin'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                🚶 Walk-in / External
              </button>
            </div>
          </div>

          {guestSource === 'inhouse' ? (
            <>
              {/* In-house guest dropdown */}
              <div className="space-y-2">
                <Label>Select checked-in guest *</Label>
                {loadingGuests ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading guests…
                  </div>
                ) : !hasInHouseGuests ? (
                  <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-700">
                    No guests currently checked in. Switch to Walk-in to enter a name manually.
                  </div>
                ) : (
                  <Select value={selectedBookingId} onValueChange={handleInHouseSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose room / guest…" />
                    </SelectTrigger>
                    <SelectContent>
                      {checkedInGuests.map((g) => (
                        <SelectItem key={g.bookingId} value={g.bookingId}>
                          <span className="font-medium">Room {g.roomNumber}</span>
                          <span className="text-gray-500 ml-2">— {g.guestName}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {/* Show auto-filled details as read-only chips */}
                {selectedBookingId && (
                  <div className="flex gap-2 flex-wrap mt-1">
                    {(() => {
                      const g = checkedInGuests.find((x) => x.bookingId === selectedBookingId);
                      return g ? (
                        <>
                          <span className="inline-flex items-center gap-1 text-xs bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-full px-2 py-0.5">
                            Room {g.roomNumber}
                          </span>
                          {g.guestPhone && (
                            <span className="inline-flex items-center gap-1 text-xs bg-gray-50 text-gray-600 border rounded-full px-2 py-0.5">
                              📞 {g.guestPhone}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 text-xs bg-gray-50 text-gray-500 border rounded-full px-2 py-0.5">
                            Check-out {new Date(g.checkOutDate).toLocaleDateString()}
                          </span>
                        </>
                      ) : null;
                    })()}
                  </div>
                )}
              </div>
              {/* Allow overriding the phone number even for in-house */}
              <div className="space-y-2">
                <Label htmlFor="r-phone-ih">Phone (optional override)</Label>
                <Input
                  id="r-phone-ih"
                  placeholder="Leave blank to use guest profile phone"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                />
              </div>
            </>
          ) : (
            /* Walk-in / external guest free-text */
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="r-guest">Guest name *</Label>
                <Input
                  id="r-guest"
                  placeholder="e.g. John Smith"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="r-phone">Phone</Label>
                <Input
                  id="r-phone"
                  placeholder="+960 ..."
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Party size + date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="r-party">Party size</Label>
              <Input
                id="r-party"
                type="number"
                min="1"
                value={partySize}
                onChange={(e) => setPartySize(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-date">Date / time *</Label>
              <Input
                id="r-date"
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="r-notes">Notes</Label>
            <Textarea id="r-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Dietary requirements, occasion, seating preference…" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button
              type="submit"
              disabled={saving || (guestSource === 'inhouse' ? (!selectedBookingId && hasInHouseGuests) : !guestName.trim())}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------ BILLS TAB ------------------------------ */

function BillsTab({
  outlets,
  outletFilter,
  onOutletFilterChange,
}: {
  outlets: Outlet[];
  outletFilter: string;
  onOutletFilterChange: (v: string) => void;
}) {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewBill, setViewBill] = useState<Bill | null>(null);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (outletFilter !== 'all') params.set('outletId', outletFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/admin/fnb/bills?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setBills(json.bills ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [outletFilter, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={outletFilter} onValueChange={onOutletFilterChange}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All outlets</SelectItem>
              {outlets.map((o) => (<SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {BILL_STATUSES.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-cyan-600 hover:bg-cyan-700" disabled={outlets.length === 0}>
          <Plus className="h-4 w-4 mr-2" /> New Bill
        </Button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin inline" />
        </div>
      ) : bills.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <Receipt className="h-10 w-10 mx-auto text-gray-300 mb-3" />
            <p className="text-lg font-medium mb-1">No bills</p>
            <p className="text-sm">Adjust filters or create a new bill.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Created</TableHead>
                <TableHead>Outlet</TableHead>
                <TableHead>Guest / Table</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bills.map((b) => {
                const status = BILL_STATUSES.find((s) => s.value === b.status)!;
                const itemCount = Array.isArray(b.items) ? b.items.reduce((s, i) => s + (i.qty ?? 0), 0) : 0;
                return (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium text-sm">{fmtDateTime(b.createdAt)}</TableCell>
                    <TableCell className="text-sm">{b.outlet?.name ?? '—'}</TableCell>
                    <TableCell className="text-sm">
                      {b.guestName ?? '—'}
                      {b.tableNumber && <div className="text-xs text-gray-500">Table {b.tableNumber}</div>}
                    </TableCell>
                    <TableCell className="text-sm">{itemCount}</TableCell>
                    <TableCell className="text-right font-semibold">{fmtMoney(b.totalAmount)}</TableCell>
                    <TableCell className="text-right">{fmtMoney(b.paidAmount)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${status.color}`}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" className="h-8" onClick={() => setViewBill(b)}>
                        <Eye className="h-4 w-4 mr-1" /> Open
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <BillDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        outlets={outlets}
        onSaved={() => { setDialogOpen(false); load(); }}
      />

      <BillDetailDialog
        bill={viewBill}
        onOpenChange={(o) => { if (!o) setViewBill(null); }}
        onSaved={() => { setViewBill(null); load(); }}
      />
    </div>
  );
}

function BillDialog({
  open,
  onOpenChange,
  outlets,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  outlets: Outlet[];
  onSaved: () => void;
}) {
  const [outletId, setOutletId] = useState(outlets[0]?.id ?? '');
  const [guestName, setGuestName] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [items, setItems] = useState<BillItem[]>([{ name: '', qty: 1, unitPrice: 0, totalPrice: 0 }]);
  const [outletMenu, setOutletMenu] = useState<MenuItem[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setOutletId(outlets[0]?.id ?? '');
      setGuestName('');
      setTableNumber('');
      setItems([{ name: '', qty: 1, unitPrice: 0, totalPrice: 0 }]);
    }
  }, [open, outlets]);

  useEffect(() => {
    if (!outletId) { setOutletMenu([]); return; }
    fetch(`/api/admin/fnb/outlets/${outletId}/menu`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setOutletMenu(j?.items ?? []))
      .catch(() => setOutletMenu([]));
  }, [outletId]);

  function setItem(i: number, patch: Partial<BillItem>) {
    setItems((cur) => {
      const next = [...cur];
      next[i] = { ...next[i], ...patch };
      next[i].totalPrice = Number(((next[i].qty ?? 0) * (next[i].unitPrice ?? 0)).toFixed(2));
      return next;
    });
  }

  function pickFromMenu(i: number, menuItemId: string) {
    const m = outletMenu.find((x) => x.id === menuItemId);
    if (!m) return;
    setItem(i, { name: m.name, unitPrice: m.price });
  }

  function addRow() {
    setItems((cur) => [...cur, { name: '', qty: 1, unitPrice: 0, totalPrice: 0 }]);
  }
  function removeRow(i: number) {
    setItems((cur) => cur.filter((_, idx) => idx !== i));
  }

  const subtotal = items.reduce((s, it) => s + (it.totalPrice ?? 0), 0);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanItems = items.filter((it) => it.name.trim() && it.qty > 0);
    if (!outletId || cleanItems.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/fnb/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outletId,
          guestName,
          tableNumber,
          items: cleanItems,
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      onSaved();
    } catch {
      alert('Failed to create bill');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New Bill</DialogTitle>
          <DialogDescription>Create a bill with line items. Discounts and tax are applied later.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2 col-span-3 sm:col-span-1">
              <Label>Outlet *</Label>
              <Select value={outletId} onValueChange={setOutletId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {outlets.map((o) => (<SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="b-guest">Guest name</Label>
              <Input id="b-guest" value={guestName} onChange={(e) => setGuestName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="b-table">Table</Label>
              <Input id="b-table" value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Items</Label>
              <Button type="button" size="sm" variant="outline" onClick={addRow}>
                <Plus className="h-3 w-3 mr-1" /> Add row
              </Button>
            </div>
            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    {outletMenu.length > 0 ? (
                      <div className="flex gap-1">
                        <Input
                          placeholder="Item name"
                          value={it.name}
                          onChange={(e) => setItem(i, { name: e.target.value })}
                          className="h-9"
                        />
                        <Select onValueChange={(v) => pickFromMenu(i, v)}>
                          <SelectTrigger className="w-10 h-9 px-1" aria-label="Pick from menu">
                            <Utensils className="h-3 w-3" />
                          </SelectTrigger>
                          <SelectContent>
                            {outletMenu.map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.name} — {fmtMoney(m.price)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <Input
                        placeholder="Item name"
                        value={it.name}
                        onChange={(e) => setItem(i, { name: e.target.value })}
                        className="h-9"
                      />
                    )}
                  </div>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Qty"
                    value={it.qty}
                    onChange={(e) => setItem(i, { qty: Number(e.target.value) })}
                    className="col-span-2 h-9"
                  />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Unit price"
                    value={it.unitPrice}
                    onChange={(e) => setItem(i, { unitPrice: Number(e.target.value) })}
                    className="col-span-2 h-9"
                  />
                  <div className="col-span-2 text-right text-sm font-medium">{fmtMoney(it.totalPrice)}</div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="col-span-1 h-9 w-9 p-0 text-red-600"
                    onClick={() => removeRow(i)}
                    disabled={items.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="text-right text-sm font-semibold pt-2">
              Subtotal: <span className="text-cyan-700">{fmtMoney(subtotal)}</span>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-cyan-600 hover:bg-cyan-700">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Bill'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BillDetailDialog({
  bill,
  onOpenChange,
  onSaved,
}: {
  bill: Bill | null;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const open = !!bill;
  const [discount, setDiscount] = useState('0');
  const [serviceCharge, setServiceCharge] = useState('0');
  const [tax, setTax] = useState('0');
  const [paidAmount, setPaidAmount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (bill) {
      setDiscount(String(bill.discount ?? 0));
      setServiceCharge(String(bill.serviceCharge ?? 0));
      setTax(String(bill.tax ?? 0));
      setPaidAmount(String(bill.paidAmount ?? 0));
      setPaymentMethod((bill.paymentMethod as PaymentMethod) ?? '');
      setNotes(bill.notes ?? '');
    }
  }, [bill]);

  if (!bill) return null;

  const subtotal = bill.subtotal;
  const projectedTotal = Number((subtotal - Number(discount || 0) + Number(serviceCharge || 0) + Number(tax || 0)).toFixed(2));

  async function save(extra: Partial<{ status: BillStatus }> = {}) {
    setSaving(true);
    try {
      const body: any = {
        discount: Number(discount || 0),
        serviceCharge: Number(serviceCharge || 0),
        tax: Number(tax || 0),
        paidAmount: Number(paidAmount || 0),
        notes,
        ...extra,
      };
      if (paymentMethod) body.paymentMethod = paymentMethod;
      const res = await fetch(`/api/admin/fnb/bills/${bill!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Save failed');
      onSaved();
    } catch {
      alert('Failed to update bill');
    } finally {
      setSaving(false);
    }
  }

  function printBill() {
    if (typeof window === 'undefined') return;
    const w = window.open('', '_blank', 'width=400,height=600');
    if (!w) return;
    const rows = bill!.items
      .map((it) => `<tr><td>${it.name}</td><td style="text-align:right">${it.qty}</td><td style="text-align:right">${fmtMoney(it.unitPrice)}</td><td style="text-align:right">${fmtMoney(it.totalPrice)}</td></tr>`)
      .join('');
    w.document.write(`
      <html><head><title>Bill ${bill!.id.slice(-6)}</title>
      <style>body{font-family:monospace;padding:16px;font-size:12px}h2{margin:0 0 4px}table{width:100%;border-collapse:collapse;margin-top:8px}td,th{padding:2px 4px;border-bottom:1px dashed #ccc}.tot{font-weight:bold;font-size:14px}</style>
      </head><body>
      <h2>${bill!.outlet?.name ?? 'Bill'}</h2>
      <div>${new Date(bill!.createdAt).toLocaleString()}</div>
      ${bill!.guestName ? `<div>Guest: ${bill!.guestName}</div>` : ''}
      ${bill!.tableNumber ? `<div>Table: ${bill!.tableNumber}</div>` : ''}
      <table>
        <thead><tr><th align="left">Item</th><th align="right">Qty</th><th align="right">Unit</th><th align="right">Total</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="margin-top:8px"><div>Subtotal: ${fmtMoney(bill!.subtotal)}</div>
      <div>Discount: -${fmtMoney(bill!.discount)}</div>
      <div>Service: ${fmtMoney(bill!.serviceCharge)}</div>
      <div>Tax: ${fmtMoney(bill!.tax)}</div>
      <div class="tot">Total: ${fmtMoney(bill!.totalAmount)}</div>
      <div>Paid: ${fmtMoney(bill!.paidAmount)}</div></div>
      <script>window.print()</script>
      </body></html>
    `);
    w.document.close();
  }

  const statusMeta = BILL_STATUSES.find((s) => s.value === bill.status)!;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Bill #{bill.id.slice(-6)}
            <Badge variant="outline" className={`text-[10px] ${statusMeta.color}`}>{statusMeta.label}</Badge>
          </DialogTitle>
          <DialogDescription>
            {bill.outlet?.name} · {fmtDateTime(bill.createdAt)}
            {bill.guestName ? ` · ${bill.guestName}` : ''}
            {bill.tableNumber ? ` · Table ${bill.tableNumber}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs uppercase text-gray-500">Items</Label>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right w-16">Qty</TableHead>
                  <TableHead className="text-right w-24">Unit</TableHead>
                  <TableHead className="text-right w-24">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bill.items.map((it, i) => (
                  <TableRow key={i}>
                    <TableCell>{it.name}</TableCell>
                    <TableCell className="text-right">{it.qty}</TableCell>
                    <TableCell className="text-right">{fmtMoney(it.unitPrice)}</TableCell>
                    <TableCell className="text-right">{fmtMoney(it.totalPrice)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="b-disc">Discount</Label>
              <Input id="b-disc" type="number" min="0" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="b-svc">Service charge</Label>
              <Input id="b-svc" type="number" min="0" step="0.01" value={serviceCharge} onChange={(e) => setServiceCharge(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="b-tax">Tax</Label>
              <Input id="b-tax" type="number" min="0" step="0.01" value={tax} onChange={(e) => setTax(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="b-paid">Paid amount</Label>
              <Input id="b-paid" type="number" min="0" step="0.01" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Payment method</Label>
              <Select value={paymentMethod || 'none'} onValueChange={(v) => setPaymentMethod(v === 'none' ? '' : (v as PaymentMethod))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— none —</SelectItem>
                  {PAYMENT_METHODS.map((p) => (<SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="b-notes">Notes</Label>
              <Textarea id="b-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          </div>

          <div className="rounded-md bg-gray-50 p-3 text-sm space-y-1">
            <div className="flex justify-between"><span>Subtotal</span><span>{fmtMoney(subtotal)}</span></div>
            <div className="flex justify-between"><span>Discount</span><span>-{fmtMoney(Number(discount || 0))}</span></div>
            <div className="flex justify-between"><span>Service</span><span>{fmtMoney(Number(serviceCharge || 0))}</span></div>
            <div className="flex justify-between"><span>Tax</span><span>{fmtMoney(Number(tax || 0))}</span></div>
            <Separator />
            <div className="flex justify-between font-semibold text-base">
              <span>Total</span><span className="text-cyan-700">{fmtMoney(projectedTotal)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-600">
              <span>Paid</span><span>{fmtMoney(Number(paidAmount || 0))}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={printBill}>
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
          <div className="flex-1" />
          {bill.status === 'OPEN' && (
            <Button type="button" variant="outline" onClick={() => save({ status: 'CLOSED' })} disabled={saving}>
              Close
            </Button>
          )}
          {bill.status !== 'PAID' && bill.status !== 'VOIDED' && (
            <Button type="button" variant="outline" onClick={() => save({ status: 'VOIDED' })} disabled={saving}>
              Void
            </Button>
          )}
          <Button
            type="button"
            onClick={() => save({ status: 'PAID' })}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Mark Paid
          </Button>
          <Button type="button" onClick={() => save()} disabled={saving} className="bg-cyan-600 hover:bg-cyan-700">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
