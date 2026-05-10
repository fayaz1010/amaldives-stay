'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Package,
  Truck,
  CheckCircle2,
  PlusCircle,
  AlertTriangle,
  ChevronRight,
  Boxes,
  MoreVertical,
  ArrowRight,
  Trash2,
  Loader2,
  X,
  Plus,
} from 'lucide-react';

type LogisticsStatus = 'DRAFT' | 'SENT' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
type Urgency = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
type ItemStatus = 'PENDING' | 'SENT' | 'RECEIVED' | 'PARTIAL';

interface LogisticsItem {
  id: string;
  orderId: string;
  name: string;
  quantity: number;
  unit: string;
  estimatedCost: number | null;
  actualCost: number | null;
  notes: string | null;
  status: ItemStatus;
}

interface LogisticsOrder {
  id: string;
  tenantId: string;
  title: string;
  description: string | null;
  requestedBy: string | null;
  destination: string | null;
  status: LogisticsStatus;
  urgency: Urgency;
  requestedAt: string | Date;
  sentAt: string | Date | null;
  arrivedAt: string | Date | null;
  notes: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  items: LogisticsItem[];
}

interface Stats {
  totalOrders: number;
  itemsPending: number;
  inTransit: number;
  deliveredThisMonth: number;
}

interface LogisticsBoardProps {
  orders: LogisticsOrder[];
  stats: Stats;
}

const URGENCY_STYLES: Record<Urgency, string> = {
  LOW: 'bg-gray-100 text-gray-700 border-gray-200',
  MEDIUM: 'bg-blue-100 text-blue-700 border-blue-200',
  HIGH: 'bg-orange-100 text-orange-700 border-orange-200',
  URGENT: 'bg-red-100 text-red-700 border-red-200',
};

const ITEM_STATUS_STYLES: Record<ItemStatus, string> = {
  PENDING: 'bg-gray-100 text-gray-700',
  SENT: 'bg-blue-100 text-blue-700',
  RECEIVED: 'bg-green-100 text-green-700',
  PARTIAL: 'bg-amber-100 text-amber-700',
};

const COLUMNS: { key: LogisticsStatus; title: string; color: string; icon: any }[] = [
  { key: 'DRAFT', title: 'Draft', color: 'bg-gray-50 border-gray-200', icon: Package },
  { key: 'SENT', title: 'Sent', color: 'bg-blue-50 border-blue-200', icon: ArrowRight },
  { key: 'IN_TRANSIT', title: 'In Transit', color: 'bg-amber-50 border-amber-200', icon: Truck },
  { key: 'DELIVERED', title: 'Delivered', color: 'bg-green-50 border-green-200', icon: CheckCircle2 },
];

const NEXT_STATUS: Partial<Record<LogisticsStatus, LogisticsStatus>> = {
  DRAFT: 'SENT',
  SENT: 'IN_TRANSIT',
  IN_TRANSIT: 'DELIVERED',
};

const NEXT_LABEL: Partial<Record<LogisticsStatus, string>> = {
  DRAFT: 'Send',
  SENT: 'Mark In Transit',
  IN_TRANSIT: 'Mark Delivered',
};

type FilterTab = 'ALL' | LogisticsStatus;

export function LogisticsBoard({ orders, stats }: LogisticsBoardProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterTab>('ALL');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState<LogisticsOrder | null>(null);

  const filtered = useMemo(() => {
    if (filter === 'ALL') return orders;
    return orders.filter((o) => o.status === filter);
  }, [orders, filter]);

  async function advanceStatus(order: LogisticsOrder) {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    setBusyId(order.id);
    try {
      const res = await fetch(`/api/admin/logistics/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error('Update failed');
      router.refresh();
    } catch (err) {
      console.error(err);
      alert('Failed to update order');
    } finally {
      setBusyId(null);
    }
  }

  async function cancelOrder(order: LogisticsOrder) {
    if (!confirm(`Cancel order "${order.title}"?`)) return;
    setBusyId(order.id);
    try {
      const res = await fetch(`/api/admin/logistics/${order.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Cancel failed');
      router.refresh();
      setDetailOrder(null);
    } catch (err) {
      console.error(err);
      alert('Failed to cancel order');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Logistics</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Track supply orders shipped from Male to the property
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-teal-600 hover:bg-teal-700">
          <PlusCircle className="h-4 w-4 mr-2" />
          New Order
        </Button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard
          label="Total Orders"
          value={stats.totalOrders}
          icon={<Boxes className="h-5 w-5 text-teal-600" />}
        />
        <StatCard
          label="Items Pending"
          value={stats.itemsPending}
          icon={<AlertTriangle className="h-5 w-5 text-amber-600" />}
        />
        <StatCard
          label="In Transit"
          value={stats.inTransit}
          icon={<Truck className="h-5 w-5 text-blue-600" />}
        />
        <StatCard
          label="Delivered This Month"
          value={stats.deliveredThisMonth}
          icon={<CheckCircle2 className="h-5 w-5 text-green-600" />}
        />
      </div>

      {/* Filter tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterTab)} className="mb-4">
        <TabsList>
          <TabsTrigger value="ALL">All</TabsTrigger>
          <TabsTrigger value="DRAFT">Draft</TabsTrigger>
          <TabsTrigger value="SENT">Sent</TabsTrigger>
          <TabsTrigger value="IN_TRANSIT">In Transit</TabsTrigger>
          <TabsTrigger value="DELIVERED">Delivered</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map((col) => {
          const colOrders = filtered.filter((o) => o.status === col.key);
          const Icon = col.icon;
          return (
            <div key={col.key} className={`rounded-lg border-2 ${col.color} p-3`}>
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-gray-600" />
                  <h2 className="font-semibold text-gray-800 text-sm">{col.title}</h2>
                </div>
                <span className="text-xs font-medium bg-white px-2 py-0.5 rounded-full border">
                  {colOrders.length}
                </span>
              </div>

              <div className="space-y-2">
                {colOrders.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">No orders</p>
                ) : (
                  colOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      busy={busyId === order.id}
                      onOpen={() => setDetailOrder(order)}
                      onAdvance={() => advanceStatus(order)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <CreateOrderDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => router.refresh()}
      />

      {detailOrder && (
        <OrderDetailDialog
          order={detailOrder}
          onOpenChange={(open) => !open && setDetailOrder(null)}
          onChanged={() => {
            router.refresh();
          }}
          onCancel={() => cancelOrder(detailOrder)}
          busy={busyId === detailOrder.id}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-2">{icon}</div>
      </CardContent>
    </Card>
  );
}

function OrderCard({
  order,
  busy,
  onOpen,
  onAdvance,
}: {
  order: LogisticsOrder;
  busy: boolean;
  onOpen: () => void;
  onAdvance: () => void;
}) {
  const itemsToShow = order.items.slice(0, 3);
  const remaining = order.items.length - itemsToShow.length;
  const next = NEXT_STATUS[order.status];

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <button onClick={onOpen} className="text-left flex-1 min-w-0">
            <p className="font-semibold text-sm leading-tight truncate">{order.title}</p>
          </button>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border ${
              URGENCY_STYLES[order.urgency]
            }`}
          >
            {order.urgency}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {order.destination && (
            <Badge variant="outline" className="text-[10px] font-medium">
              <Package className="h-3 w-3 mr-1" />
              {order.destination}
            </Badge>
          )}
        </div>

        <div className="text-[11px] text-gray-500">
          {order.requestedBy ? `By ${order.requestedBy} · ` : ''}
          {new Date(order.requestedAt).toLocaleDateString()}
        </div>

        {order.items.length > 0 && (
          <div className="space-y-1 pt-1 border-t border-gray-100">
            {itemsToShow.map((it) => (
              <div
                key={it.id}
                className="flex items-center justify-between text-[11px] text-gray-600"
              >
                <span className="truncate">{it.name}</span>
                <span className="text-gray-400 shrink-0 ml-2">
                  {it.quantity} {it.unit}
                </span>
              </div>
            ))}
            {remaining > 0 && (
              <p className="text-[11px] text-gray-400 italic">+{remaining} more items</p>
            )}
          </div>
        )}

        <div className="flex items-center gap-1 pt-1">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs flex-1"
            onClick={onOpen}
          >
            Details
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
          {next && (
            <Button
              size="sm"
              className="h-7 text-xs flex-1 bg-teal-600 hover:bg-teal-700"
              disabled={busy}
              onClick={onAdvance}
            >
              {busy ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  {NEXT_LABEL[order.status]}
                  <ArrowRight className="h-3 w-3 ml-1" />
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CreateOrderDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requestedBy, setRequestedBy] = useState('');
  const [destination, setDestination] = useState('Male');
  const [urgency, setUrgency] = useState<Urgency>('MEDIUM');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<
    { name: string; quantity: string; unit: string; estimatedCost: string; notes: string }[]
  >([{ name: '', quantity: '1', unit: 'pcs', estimatedCost: '', notes: '' }]);

  function reset() {
    setTitle('');
    setDescription('');
    setRequestedBy('');
    setDestination('Male');
    setUrgency('MEDIUM');
    setNotes('');
    setItems([{ name: '', quantity: '1', unit: 'pcs', estimatedCost: '', notes: '' }]);
  }

  function addItemRow() {
    setItems((prev) => [
      ...prev,
      { name: '', quantity: '1', unit: 'pcs', estimatedCost: '', notes: '' },
    ]);
  }

  function removeItemRow(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, key: string, value: string) {
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, [key]: value } : it))
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      alert('Title is required');
      return;
    }
    const cleanItems = items
      .filter((it) => it.name.trim())
      .map((it) => ({
        name: it.name.trim(),
        quantity: Number(it.quantity) || 1,
        unit: it.unit.trim() || 'pcs',
        estimatedCost: it.estimatedCost ? Number(it.estimatedCost) : undefined,
        notes: it.notes.trim() || undefined,
      }));

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/logistics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          requestedBy: requestedBy.trim() || undefined,
          destination: destination.trim() || undefined,
          urgency,
          notes: notes.trim() || undefined,
          items: cleanItems,
        }),
      });
      if (!res.ok) throw new Error('Create failed');
      reset();
      onOpenChange(false);
      onCreated();
    } catch (err) {
      console.error(err);
      alert('Failed to create order');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Logistics Order</DialogTitle>
          <DialogDescription>
            Create a supply order for the Male team to fulfill.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lo-title">Title</Label>
            <Input
              id="lo-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Weekly grocery run"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lo-desc">Description</Label>
            <Textarea
              id="lo-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Context for the order…"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="lo-requestedBy">Requested By</Label>
              <Input
                id="lo-requestedBy"
                value={requestedBy}
                onChange={(e) => setRequestedBy(e.target.value)}
                placeholder="Staff name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lo-dest">Destination</Label>
              <Input
                id="lo-dest"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Male"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lo-urgency">Urgency</Label>
            <select
              id="lo-urgency"
              value={urgency}
              onChange={(e) => setUrgency(e.target.value as Urgency)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Items</Label>
              <Button type="button" size="sm" variant="outline" onClick={addItemRow}>
                <Plus className="h-3 w-3 mr-1" />
                Add Item
              </Button>
            </div>
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 gap-2 items-start p-2 rounded border bg-gray-50"
                >
                  <div className="col-span-5">
                    <Input
                      placeholder="Item name"
                      value={it.name}
                      onChange={(e) => updateItem(idx, 'name', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      step="any"
                      placeholder="Qty"
                      value={it.quantity}
                      onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      placeholder="unit"
                      value={it.unit}
                      onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      step="any"
                      placeholder="Est. cost"
                      value={it.estimatedCost}
                      onChange={(e) => updateItem(idx, 'estimatedCost', e.target.value)}
                    />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0 text-red-600 hover:text-red-700"
                        onClick={() => removeItemRow(idx)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lo-notes">Notes</Label>
            <Textarea
              id="lo-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes…"
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Order'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function OrderDetailDialog({
  order,
  onOpenChange,
  onChanged,
  onCancel,
  busy,
}: {
  order: LogisticsOrder;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const [items, setItems] = useState(order.items);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [newItemUnit, setNewItemUnit] = useState('pcs');
  const [working, setWorking] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  async function updateItemStatus(itemId: string, status: ItemStatus) {
    setWorking(itemId);
    try {
      const res = await fetch(`/api/admin/logistics/${order.id}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Update failed');
      const { item } = await res.json();
      setItems((prev) => prev.map((i) => (i.id === itemId ? item : i)));
      onChanged();
    } catch (err) {
      console.error(err);
      alert('Failed to update item');
    } finally {
      setWorking(null);
    }
  }

  async function deleteItem(itemId: string) {
    if (!confirm('Delete this item?')) return;
    setWorking(itemId);
    try {
      const res = await fetch(`/api/admin/logistics/${order.id}/items/${itemId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Delete failed');
      setItems((prev) => prev.filter((i) => i.id !== itemId));
      onChanged();
    } catch (err) {
      console.error(err);
      alert('Failed to delete item');
    } finally {
      setWorking(null);
    }
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newItemName.trim()) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/admin/logistics/${order.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newItemName.trim(),
          quantity: Number(newItemQty) || 1,
          unit: newItemUnit.trim() || 'pcs',
        }),
      });
      if (!res.ok) throw new Error('Add failed');
      const { item } = await res.json();
      setItems((prev) => [...prev, item]);
      setNewItemName('');
      setNewItemQty('1');
      setNewItemUnit('pcs');
      onChanged();
    } catch (err) {
      console.error(err);
      alert('Failed to add item');
    } finally {
      setAdding(false);
    }
  }

  const totalEstimate = items.reduce((sum, i) => sum + (i.estimatedCost || 0) * i.quantity, 0);
  const totalActual = items.reduce((sum, i) => sum + (i.actualCost || 0) * i.quantity, 0);

  return (
    <Dialog open={true} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <DialogTitle className="truncate">{order.title}</DialogTitle>
              <DialogDescription className="mt-1 flex items-center gap-2 flex-wrap">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    URGENCY_STYLES[order.urgency]
                  }`}
                >
                  {order.urgency}
                </span>
                <Badge variant="outline" className="text-[10px]">
                  {order.status.replace('_', ' ')}
                </Badge>
                {order.destination && (
                  <Badge variant="outline" className="text-[10px]">
                    <Package className="h-3 w-3 mr-1" />
                    {order.destination}
                  </Badge>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {order.description && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">Description</p>
              <p className="text-sm text-gray-700">{order.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-gray-500">Requested by</p>
              <p className="font-medium">{order.requestedBy || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500">Requested at</p>
              <p className="font-medium">
                {new Date(order.requestedAt).toLocaleString()}
              </p>
            </div>
            {order.sentAt && (
              <div>
                <p className="text-gray-500">Sent at</p>
                <p className="font-medium">{new Date(order.sentAt).toLocaleString()}</p>
              </div>
            )}
            {order.arrivedAt && (
              <div>
                <p className="text-gray-500">Arrived at</p>
                <p className="font-medium">{new Date(order.arrivedAt).toLocaleString()}</p>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold">Items ({items.length})</p>
              <div className="text-xs text-gray-500">
                Est: {totalEstimate.toFixed(2)} · Actual: {totalActual.toFixed(2)}
              </div>
            </div>
            <div className="space-y-1.5">
              {items.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No items yet.</p>
              ) : (
                items.map((it) => (
                  <div
                    key={it.id}
                    className="flex items-center gap-2 p-2 rounded border bg-white"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{it.name}</p>
                      <p className="text-[11px] text-gray-500">
                        {it.quantity} {it.unit}
                        {it.estimatedCost != null && ` · est ${it.estimatedCost}`}
                        {it.actualCost != null && ` · actual ${it.actualCost}`}
                      </p>
                    </div>
                    <select
                      value={it.status}
                      onChange={(e) =>
                        updateItemStatus(it.id, e.target.value as ItemStatus)
                      }
                      disabled={working === it.id}
                      className={`text-[11px] font-medium px-2 py-1 rounded border ${
                        ITEM_STATUS_STYLES[it.status]
                      }`}
                    >
                      <option value="PENDING">Pending</option>
                      <option value="SENT">Sent</option>
                      <option value="RECEIVED">Received</option>
                      <option value="PARTIAL">Partial</option>
                    </select>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      onClick={() => deleteItem(it.id)}
                      disabled={working === it.id}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </div>

            <form
              onSubmit={addItem}
              className="grid grid-cols-12 gap-2 mt-3 pt-3 border-t"
            >
              <div className="col-span-6">
                <Input
                  placeholder="Add new item…"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  step="any"
                  placeholder="Qty"
                  value={newItemQty}
                  onChange={(e) => setNewItemQty(e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <Input
                  placeholder="unit"
                  value={newItemUnit}
                  onChange={(e) => setNewItemUnit(e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <Button
                  type="submit"
                  size="sm"
                  className="w-full h-10 bg-teal-600 hover:bg-teal-700"
                  disabled={adding || !newItemName.trim()}
                >
                  {adding ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Add'}
                </Button>
              </div>
            </form>
          </div>

          {order.notes && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">Notes</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{order.notes}</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {order.status !== 'CANCELLED' && order.status !== 'DELIVERED' && (
            <Button
              type="button"
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={onCancel}
              disabled={busy}
            >
              Cancel Order
            </Button>
          )}
          <Button type="button" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
