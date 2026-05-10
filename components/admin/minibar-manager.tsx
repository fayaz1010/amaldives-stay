'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Beer,
  Package,
  Receipt,
  Plus,
  Trash2,
  Check,
  X,
  Edit2,
  Loader2,
  History,
  RefreshCw,
  LayoutList,
  BedDouble,
  CheckCircle2,
  AlertCircle,
  Minus,
} from 'lucide-react';

export const MINIBAR_CATEGORIES = [
  { value: 'water', label: 'Water', emoji: '💧' },
  { value: 'soft-drinks', label: 'Soft Drinks', emoji: '🥤' },
  { value: 'juice', label: 'Juice', emoji: '🧃' },
  { value: 'alcohol', label: 'Alcohol', emoji: '🍺' },
  { value: 'snacks', label: 'Snacks', emoji: '🍫' },
  { value: 'amenity', label: 'Amenity', emoji: '🧴' },
  { value: 'other', label: 'Other', emoji: '📦' },
];

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  ON_BILL: 'bg-blue-100 text-blue-800 border-blue-200',
  PAID: 'bg-green-100 text-green-800 border-green-200',
  WAIVED: 'bg-gray-100 text-gray-700 border-gray-200',
};

type MinIBarStatus = 'PENDING' | 'ON_BILL' | 'PAID' | 'WAIVED';

interface MinIBarItem {
  id: string;
  name: string;
  category: string;
  isFree: boolean;
  price: number;
  description?: string | null;
  isActive: boolean;
}

interface RoomLite {
  id: string;
  number: string;
  name?: string | null;
}

interface UsageItem {
  id: string;
  name: string;
  price: number;
  category?: string;
  isFree?: boolean;
}

interface UsageRoom {
  id: string;
  number: string;
  name?: string | null;
}

interface UsageBookingGuest {
  id: string;
  name?: string | null;
  email?: string | null;
  guestProfile?: { firstName?: string | null; lastName?: string | null } | null;
}

interface MinIBarUsage {
  id: string;
  bookingId?: string | null;
  roomId: string;
  itemId: string;
  quantity: number;
  isFree: boolean;
  amount: number;
  status: MinIBarStatus;
  notes?: string | null;
  recordedAt: string | Date;
  item: UsageItem;
  room: UsageRoom;
  booking?: { id: string; guest?: UsageBookingGuest | null } | null;
}

interface Props {
  items: MinIBarItem[];
  pendingUsages: MinIBarUsage[];
  rooms: RoomLite[];
  minibarStandard: Array<{ itemId: string; quantity: number }>;
}

function categoryMeta(value: string) {
  return (
    MINIBAR_CATEGORIES.find((c) => c.value === value) ?? {
      value: 'other',
      label: value,
      emoji: '📦',
    }
  );
}

function guestName(g?: UsageBookingGuest | null) {
  if (!g) return null;
  const profile = g.guestProfile;
  if (profile?.firstName || profile?.lastName) {
    return [profile.firstName, profile.lastName].filter(Boolean).join(' ');
  }
  return g.name || g.email || null;
}

// =====================================================
// Item dialog (create / edit)
// =====================================================

function ItemDialog({
  open,
  onOpenChange,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: MinIBarItem | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('water');
  const [isFree, setIsFree] = useState(false);
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? '');
      setCategory(initial?.category ?? 'water');
      setIsFree(initial?.isFree ?? false);
      setPrice(initial?.price?.toString() ?? '');
      setDescription(initial?.description ?? '');
    }
  }, [open, initial]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const url = initial
        ? `/api/admin/minibar/items/${initial.id}`
        : '/api/admin/minibar/items';
      const res = await fetch(url, {
        method: initial ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          category,
          isFree,
          price: isFree ? 0 : Number(price || 0),
          description,
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      onOpenChange(false);
      onSaved();
    } catch {
      alert('Failed to save mini bar item');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit Mini Bar Item' : 'Add Mini Bar Item'}</DialogTitle>
          <DialogDescription>
            Stock items kept in guest rooms — water, snacks, drinks, amenities.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mb-name">Item Name *</Label>
            <Input
              id="mb-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Coca-Cola 330ml"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="mb-cat">Category *</Label>
              <select
                id="mb-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {MINIBAR_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.emoji} {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mb-price">Price (USD)</Label>
              <Input
                id="mb-price"
                type="number"
                min="0"
                step="0.01"
                value={isFree ? '0' : price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                disabled={isFree}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-md border bg-gray-50 p-3">
            <input
              id="mb-free"
              type="checkbox"
              checked={isFree}
              onChange={(e) => setIsFree(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="mb-free" className="cursor-pointer">
              Complimentary item (no charge)
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mb-desc">Description</Label>
            <Textarea
              id="mb-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes about this item"
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : initial ? (
                'Save Changes'
              ) : (
                'Add Item'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =====================================================
// Charge dialog (record consumption)
// =====================================================

function ChargeDialog({
  open,
  onOpenChange,
  items,
  rooms,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  items: MinIBarItem[];
  rooms: RoomLite[];
  onSaved: () => void;
}) {
  const [roomId, setRoomId] = useState('');
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setRoomId('');
      setItemId('');
      setQuantity('1');
      setNotes('');
    }
  }, [open]);

  const selectedItem = items.find((i) => i.id === itemId);
  const qty = Math.max(1, Number(quantity) || 1);
  const previewAmount =
    selectedItem && !selectedItem.isFree ? selectedItem.price * qty : 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!roomId || !itemId) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/minibar/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, itemId, quantity: qty, notes }),
      });
      if (!res.ok) throw new Error('Save failed');
      onOpenChange(false);
      onSaved();
    } catch {
      alert('Failed to record consumption');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Mini Bar Consumption</DialogTitle>
          <DialogDescription>
            Log an item consumed in a room. Charge stays pending until added to
            the bill, paid, or waived.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ch-room">Room *</Label>
            <Select value={roomId} onValueChange={setRoomId}>
              <SelectTrigger id="ch-room">
                <SelectValue placeholder="Select room" />
              </SelectTrigger>
              <SelectContent>
                {rooms.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    Room {r.number}
                    {r.name ? ` — ${r.name}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ch-item">Item *</Label>
            <Select value={itemId} onValueChange={setItemId}>
              <SelectTrigger id="ch-item">
                <SelectValue placeholder="Select item" />
              </SelectTrigger>
              <SelectContent>
                {items.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {categoryMeta(i.category).emoji} {i.name}
                    {i.isFree
                      ? ' — Free'
                      : ` — $${i.price.toFixed(2)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ch-qty">Quantity</Label>
              <Input
                id="ch-qty"
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <div className="flex h-10 items-center rounded-md border bg-gray-50 px-3 text-sm font-semibold text-cyan-700">
                {selectedItem?.isFree ? 'Free' : `$${previewAmount.toFixed(2)}`}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ch-notes">Notes</Label>
            <Textarea
              id="ch-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || !roomId || !itemId}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Record Charge'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =====================================================
// Room stock types
// =====================================================

interface StockItem {
  itemId: string;
  itemName: string;
  itemCategory: string;
  isFree: boolean;
  standardQty: number;
  consumedQty: number;
  needsRestock: boolean;
  lastRestockedAt: string | null;
  usageIds: string[];
}

interface RoomStock {
  room: RoomLite & { type: string };
  stockItems: StockItem[];
  needsRestockCount: number;
  allStocked: boolean;
  hasStandard: boolean;
}

// =====================================================
// Main manager
// =====================================================

export function MinIBarManager({ items, pendingUsages, rooms, minibarStandard }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'inventory' | 'charges' | 'history' | 'standard' | 'rooms'>(
    'inventory'
  );

  // Inventory state
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [editItem, setEditItem] = useState<MinIBarItem | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  // Charge state
  const [chargeOpen, setChargeOpen] = useState(false);
  const [updatingUsageId, setUpdatingUsageId] = useState<string | null>(null);

  // History state
  const [history, setHistory] = useState<MinIBarUsage[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRoom, setHistoryRoom] = useState<string>('all');
  const [historyStatus, setHistoryStatus] = useState<string>('all');

  // Standard tab state
  const [standard, setStandard] = useState<Array<{ itemId: string; quantity: number }>>(minibarStandard);
  const [standardSaving, setStandardSaving] = useState(false);
  const [standardDirty, setStandardDirty] = useState(false);

  // Rooms tab state
  const [roomStocks, setRoomStocks] = useState<RoomStock[] | null>(null);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [restockingRoomId, setRestockingRoomId] = useState<string | null>(null);

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams();
      if (historyRoom && historyRoom !== 'all') params.set('roomId', historyRoom);
      if (historyStatus && historyStatus !== 'all') params.set('status', historyStatus);
      const qs = params.toString();
      const res = await fetch(`/api/admin/minibar/usage${qs ? `?${qs}` : ''}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setHistory(data);
    } catch {
      alert('Failed to load history');
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === 'history') loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, historyRoom, historyStatus]);

  // ---------------------------------------------------
  // Standard handlers
  // ---------------------------------------------------

  function standardQtyForItem(itemId: string) {
    return standard.find((s) => s.itemId === itemId)?.quantity ?? 0;
  }

  function setStandardQty(itemId: string, qty: number) {
    setStandard((prev) => {
      const existing = prev.find((s) => s.itemId === itemId);
      if (qty <= 0) return prev.filter((s) => s.itemId !== itemId);
      if (existing) return prev.map((s) => s.itemId === itemId ? { ...s, quantity: qty } : s);
      return [...prev, { itemId, quantity: qty }];
    });
    setStandardDirty(true);
  }

  async function saveStandard() {
    setStandardSaving(true);
    try {
      const res = await fetch('/api/admin/minibar/standard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ standard }),
      });
      if (!res.ok) throw new Error('Save failed');
      setStandardDirty(false);
      if (activeTab === 'rooms') loadRooms();
    } catch {
      alert('Failed to save standard');
    } finally {
      setStandardSaving(false);
    }
  }

  // ---------------------------------------------------
  // Rooms handlers
  // ---------------------------------------------------

  const loadRooms = useCallback(async () => {
    setRoomsLoading(true);
    try {
      const res = await fetch('/api/admin/minibar/rooms');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRoomStocks(data.rooms);
    } catch {
      alert('Failed to load room stock');
    } finally {
      setRoomsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'rooms') loadRooms();
  }, [activeTab, loadRooms]);

  async function restockRoom(roomId: string, itemIds?: string[]) {
    setRestockingRoomId(roomId);
    try {
      const res = await fetch('/api/admin/minibar/rooms/restock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, itemIds }),
      });
      if (!res.ok) throw new Error('Restock failed');
      await loadRooms();
    } catch {
      alert('Failed to record restock');
    } finally {
      setRestockingRoomId(null);
    }
  }

  // ---------------------------------------------------
  // Inventory handlers
  // ---------------------------------------------------

  async function deactivateItem(item: MinIBarItem) {
    if (!confirm(`Deactivate "${item.name}"? It will be hidden from new charges.`))
      return;
    setDeactivatingId(item.id);
    try {
      const res = await fetch(`/api/admin/minibar/items/${item.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      alert('Failed to deactivate item');
    } finally {
      setDeactivatingId(null);
    }
  }

  // ---------------------------------------------------
  // Usage handlers
  // ---------------------------------------------------

  async function updateUsage(id: string, status: MinIBarStatus) {
    setUpdatingUsageId(id);
    try {
      const res = await fetch(`/api/admin/minibar/usage/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
      if (activeTab === 'history') loadHistory();
    } catch {
      alert('Failed to update charge');
    } finally {
      setUpdatingUsageId(null);
    }
  }

  async function deleteUsage(id: string) {
    if (!confirm('Delete this charge entry?')) return;
    setUpdatingUsageId(id);
    try {
      const res = await fetch(`/api/admin/minibar/usage/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error();
      router.refresh();
      if (activeTab === 'history') loadHistory();
    } catch {
      alert('Failed to delete charge');
    } finally {
      setUpdatingUsageId(null);
    }
  }

  // ---------------------------------------------------
  // Stats
  // ---------------------------------------------------

  const pendingTotal = useMemo(
    () => pendingUsages.reduce((sum, u) => sum + (u.isFree ? 0 : u.amount), 0),
    [pendingUsages]
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Beer className="h-6 w-6 text-cyan-600" />
            Mini Bar
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {items.length} items in stock · {pendingUsages.length} pending charges ·
            ${pendingTotal.toFixed(2)} pending revenue ·{' '}
            {standard.length} standard items configured
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full max-w-2xl grid-cols-5">
          <TabsTrigger value="inventory" className="gap-1.5">
            <Package className="h-4 w-4" /> Inventory
          </TabsTrigger>
          <TabsTrigger value="standard" className="gap-1.5">
            <LayoutList className="h-4 w-4" /> Standard
            {standard.length === 0 && (
              <Badge className="ml-1 h-5 bg-orange-400 hover:bg-orange-400 text-white">!</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="rooms" className="gap-1.5">
            <BedDouble className="h-4 w-4" /> Rooms
          </TabsTrigger>
          <TabsTrigger value="charges" className="gap-1.5">
            <Receipt className="h-4 w-4" /> Charges
            {pendingUsages.length > 0 && (
              <Badge className="ml-1 h-5 bg-yellow-500 hover:bg-yellow-500">
                {pendingUsages.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <History className="h-4 w-4" /> History
          </TabsTrigger>
        </TabsList>

        {/* ============== STANDARD ============== */}
        <TabsContent value="standard" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="flex items-center justify-between p-4 border-b">
                <div>
                  <h2 className="font-semibold">Mini Bar Standard Setup</h2>
                  <p className="text-xs text-gray-500">
                    Define which items and quantities every room should be stocked with.
                    This template drives the Rooms restocking view.
                  </p>
                </div>
                {standardDirty && (
                  <Button
                    onClick={saveStandard}
                    disabled={standardSaving}
                    className="bg-cyan-600 hover:bg-cyan-700"
                  >
                    {standardSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Save Standard
                  </Button>
                )}
              </div>

              {items.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  <Package className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                  <p className="text-lg font-medium mb-1">No items yet</p>
                  <p className="text-sm">Add items in the Inventory tab first.</p>
                </div>
              ) : (
                <>
                  {/* Group by category */}
                  {Array.from(new Set(items.map((i) => i.category))).map((cat) => {
                    const catMeta = categoryMeta(cat);
                    const catItems = items.filter((i) => i.category === cat);
                    return (
                      <div key={cat}>
                        <div className="px-4 py-2 bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          {catMeta.emoji} {catMeta.label}
                        </div>
                        <Table>
                          <TableBody>
                            {catItems.map((item) => {
                              const qty = standardQtyForItem(item.id);
                              const inStandard = qty > 0;
                              return (
                                <TableRow key={item.id} className={inStandard ? 'bg-cyan-50' : ''}>
                                  <TableCell className="font-medium">
                                    {item.name}
                                    {item.isFree && (
                                      <Badge className="ml-2 bg-green-100 text-green-800 border-green-200 hover:bg-green-100" variant="outline">
                                        Free
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-gray-500">
                                    {item.isFree ? '—' : `$${item.price.toFixed(2)}`}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => setStandardQty(item.id, qty - 1)}
                                        disabled={qty <= 0}
                                        className="h-7 w-7 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-30"
                                      >
                                        <Minus className="h-3 w-3" />
                                      </button>
                                      <span className={`w-8 text-center font-semibold ${inStandard ? 'text-cyan-700' : 'text-gray-400'}`}>
                                        {qty > 0 ? qty : '—'}
                                      </span>
                                      <button
                                        onClick={() => setStandardQty(item.id, qty + 1)}
                                        className="h-7 w-7 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                                      >
                                        <Plus className="h-3 w-3" />
                                      </button>
                                      {inStandard && (
                                        <span className="text-xs text-cyan-600 font-medium">in standard</span>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    );
                  })}

                  {standardDirty && (
                    <div className="p-4 border-t flex justify-end">
                      <Button
                        onClick={saveStandard}
                        disabled={standardSaving}
                        className="bg-cyan-600 hover:bg-cyan-700"
                      >
                        {standardSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Check className="h-4 w-4 mr-2" />
                        )}
                        Save Standard ({standard.length} items)
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============== ROOMS ============== */}
        <TabsContent value="rooms" className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-semibold text-gray-900">Room Mini Bar Status</h2>
              <p className="text-xs text-gray-500">
                Track stocking status per room based on the standard setup.
                Consumed items show as needing restock.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={loadRooms} disabled={roomsLoading}>
              {roomsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>

          {standard.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <LayoutList className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                <p className="text-lg font-medium mb-1">No standard configured</p>
                <p className="text-sm mb-4">Set up the standard mini bar in the Standard tab first.</p>
                <Button variant="outline" size="sm" onClick={() => setActiveTab('standard')}>
                  Go to Standard Setup
                </Button>
              </CardContent>
            </Card>
          ) : roomsLoading && !roomStocks ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading rooms…
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(roomStocks ?? []).map((rs) => {
                const isRestocking = restockingRoomId === rs.room.id;
                const needsItems = rs.stockItems.filter((i) => i.needsRestock);
                const okItems = rs.stockItems.filter((i) => !i.needsRestock);

                return (
                  <Card key={rs.room.id} className={`border-2 ${
                    !rs.hasStandard ? 'border-gray-100' :
                    rs.allStocked ? 'border-green-200' : 'border-orange-200'
                  }`}>
                    <CardContent className="p-4">
                      {/* Room header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <BedDouble className="h-4 w-4 text-gray-500" />
                          <span className="font-semibold">Room {rs.room.number}</span>
                          {rs.room.name && (
                            <span className="text-xs text-gray-500">— {rs.room.name}</span>
                          )}
                        </div>
                        {rs.hasStandard && (
                          rs.allStocked ? (
                            <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100 gap-1" variant="outline">
                              <CheckCircle2 className="h-3 w-3" /> Stocked
                            </Badge>
                          ) : (
                            <Badge className="bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100 gap-1" variant="outline">
                              <AlertCircle className="h-3 w-3" /> {rs.needsRestockCount} need restock
                            </Badge>
                          )
                        )}
                      </div>

                      {/* Items needing restock */}
                      {needsItems.length > 0 && (
                        <div className="space-y-1.5 mb-3">
                          <p className="text-[10px] font-bold uppercase text-orange-500 tracking-wide">Needs Restock</p>
                          {needsItems.map((si) => (
                            <div key={si.itemId} className="flex items-center justify-between text-sm bg-orange-50 rounded-md px-2.5 py-1.5">
                              <div>
                                <span className="font-medium">{si.itemName}</span>
                                <span className="text-xs text-orange-600 ml-1.5">
                                  {si.consumedQty} consumed
                                </span>
                              </div>
                              <button
                                onClick={() => restockRoom(rs.room.id, [si.itemId])}
                                disabled={isRestocking}
                                className="flex items-center gap-1 text-xs text-green-700 bg-green-100 hover:bg-green-200 rounded px-2 py-1 font-medium disabled:opacity-50"
                              >
                                {isRestocking ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                Restocked
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Items OK */}
                      {okItems.length > 0 && (
                        <div className="space-y-1 mb-3">
                          <p className="text-[10px] font-bold uppercase text-green-600 tracking-wide">Stocked</p>
                          {okItems.map((si) => (
                            <div key={si.itemId} className="flex items-center justify-between text-xs text-gray-600 px-1">
                              <span>{categoryMeta(si.itemCategory).emoji} {si.itemName}</span>
                              <span className="font-medium text-green-600">×{si.standardQty} ✓</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Restock All button */}
                      {rs.needsRestockCount > 0 && (
                        <Button
                          size="sm"
                          className="w-full bg-cyan-600 hover:bg-cyan-700 mt-1"
                          onClick={() => restockRoom(rs.room.id)}
                          disabled={isRestocking}
                        >
                          {isRestocking ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <RefreshCw className="h-4 w-4 mr-2" />
                          )}
                          Restock All ({rs.needsRestockCount})
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ============== INVENTORY ============== */}
        <TabsContent value="inventory" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="flex items-center justify-between p-4 border-b">
                <div>
                  <h2 className="font-semibold">Mini Bar Items</h2>
                  <p className="text-xs text-gray-500">
                    Active items available for charging to rooms.
                  </p>
                </div>
                <Button
                  onClick={() => setAddItemOpen(true)}
                  className="bg-cyan-600 hover:bg-cyan-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>

              {items.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  <Package className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                  <p className="text-lg font-medium mb-1">No items yet</p>
                  <p className="text-sm">
                    Add your first item — water, soda, snacks, or amenities.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => {
                      const cat = categoryMeta(item.category);
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            <div>{item.name}</div>
                            {item.description && (
                              <div className="text-xs text-gray-500 line-clamp-1">
                                {item.description}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-600">
                              {cat.emoji} {cat.label}
                            </span>
                          </TableCell>
                          <TableCell>
                            {item.isFree ? (
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
                                Free
                              </Badge>
                            ) : (
                              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200">
                                Paid
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {item.isFree ? '—' : `$${item.price.toFixed(2)}`}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`text-xs ${
                                item.isActive ? 'text-green-600' : 'text-gray-400'
                              }`}
                            >
                              {item.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setEditItem(item)}
                                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                                title="Edit"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => deactivateItem(item)}
                                disabled={deactivatingId === item.id}
                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                                title="Deactivate"
                              >
                                {deactivatingId === item.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============== CHARGES ============== */}
        <TabsContent value="charges" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="flex items-center justify-between p-4 border-b">
                <div>
                  <h2 className="font-semibold">Pending Charges</h2>
                  <p className="text-xs text-gray-500">
                    Consumption awaiting billing decision.
                  </p>
                </div>
                <Button
                  onClick={() => setChargeOpen(true)}
                  disabled={items.length === 0 || rooms.length === 0}
                  className="bg-cyan-600 hover:bg-cyan-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Record Charge
                </Button>
              </div>

              {pendingUsages.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  <Receipt className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                  <p className="text-lg font-medium mb-1">No pending charges</p>
                  <p className="text-sm">All caught up.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Room</TableHead>
                      <TableHead>Guest</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingUsages.map((u) => {
                      const guest = guestName(u.booking?.guest);
                      return (
                        <TableRow key={u.id}>
                          <TableCell className="text-xs text-gray-500 whitespace-nowrap">
                            {new Date(u.recordedAt).toLocaleString()}
                          </TableCell>
                          <TableCell className="font-medium">
                            Room {u.room.number}
                          </TableCell>
                          <TableCell className="text-sm">
                            {guest ?? <span className="text-gray-400">—</span>}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{u.item.name}</div>
                            {u.notes && (
                              <div className="text-xs text-gray-500">{u.notes}</div>
                            )}
                          </TableCell>
                          <TableCell>{u.quantity}</TableCell>
                          <TableCell className="font-semibold">
                            {u.isFree ? (
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
                                Free
                              </Badge>
                            ) : (
                              `$${u.amount.toFixed(2)}`
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {!u.isFree && u.bookingId && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
                                  onClick={() => updateUsage(u.id, 'ON_BILL')}
                                  disabled={updatingUsageId === u.id}
                                  title="Add to room bill"
                                >
                                  <Receipt className="h-3.5 w-3.5 mr-1" />
                                  Add to Bill
                                </Button>
                              )}
                              {!u.isFree && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs border-green-200 text-green-700 hover:bg-green-50"
                                  onClick={() => updateUsage(u.id, 'PAID')}
                                  disabled={updatingUsageId === u.id}
                                  title="Mark paid"
                                >
                                  <Check className="h-3.5 w-3.5 mr-1" />
                                  Paid
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs border-gray-200 text-gray-700 hover:bg-gray-50"
                                onClick={() => updateUsage(u.id, 'WAIVED')}
                                disabled={updatingUsageId === u.id}
                                title="Waive charge"
                              >
                                <X className="h-3.5 w-3.5 mr-1" />
                                Waive
                              </Button>
                              <button
                                onClick={() => deleteUsage(u.id)}
                                disabled={updatingUsageId === u.id}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                                title="Delete"
                              >
                                {updatingUsageId === u.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============== HISTORY ============== */}
        <TabsContent value="history" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b">
                <div>
                  <h2 className="font-semibold">Charge History</h2>
                  <p className="text-xs text-gray-500">
                    All recorded mini bar consumption.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={historyRoom} onValueChange={setHistoryRoom}>
                    <SelectTrigger className="h-9 w-40">
                      <SelectValue placeholder="All rooms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All rooms</SelectItem>
                      {rooms.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          Room {r.number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={historyStatus} onValueChange={setHistoryStatus}>
                    <SelectTrigger className="h-9 w-36">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="ON_BILL">On Bill</SelectItem>
                      <SelectItem value="PAID">Paid</SelectItem>
                      <SelectItem value="WAIVED">Waived</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9"
                    onClick={loadHistory}
                    disabled={historyLoading}
                  >
                    {historyLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {historyLoading && history === null ? (
                <div className="py-12 text-center text-gray-500">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </div>
              ) : !history || history.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  <History className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                  <p className="text-lg font-medium mb-1">No history</p>
                  <p className="text-sm">No matching charges found.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Room</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="text-xs text-gray-500 whitespace-nowrap">
                          {new Date(u.recordedAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-medium">
                          Room {u.room.number}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{u.item.name}</div>
                          {u.notes && (
                            <div className="text-xs text-gray-500">{u.notes}</div>
                          )}
                        </TableCell>
                        <TableCell>{u.quantity}</TableCell>
                        <TableCell className="font-semibold">
                          {u.isFree ? '—' : `$${u.amount.toFixed(2)}`}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`border ${
                              STATUS_STYLES[u.status] ?? STATUS_STYLES.PENDING
                            }`}
                            variant="outline"
                          >
                            {u.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {u.status !== 'PAID' && !u.isFree && (
                              <button
                                onClick={() => updateUsage(u.id, 'PAID')}
                                disabled={updatingUsageId === u.id}
                                className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
                                title="Mark paid"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                            )}
                            {u.status !== 'WAIVED' && (
                              <button
                                onClick={() => updateUsage(u.id, 'WAIVED')}
                                disabled={updatingUsageId === u.id}
                                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded disabled:opacity-50"
                                title="Waive"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => deleteUsage(u.id)}
                              disabled={updatingUsageId === u.id}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                              title="Delete"
                            >
                              {updatingUsageId === u.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ItemDialog
        open={addItemOpen}
        onOpenChange={setAddItemOpen}
        initial={null}
        onSaved={() => router.refresh()}
      />
      <ItemDialog
        open={!!editItem}
        onOpenChange={(o) => !o && setEditItem(null)}
        initial={editItem}
        onSaved={() => {
          setEditItem(null);
          router.refresh();
        }}
      />
      <ChargeDialog
        open={chargeOpen}
        onOpenChange={setChargeOpen}
        items={items}
        rooms={rooms}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
