'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  LayoutList,
  BarChart3,
  TrendingDown,
  TrendingUp,
  Edit2,
  RefreshCw,
  Link2,
  MinusCircle,
  SlidersHorizontal,
  History,
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

// ── Inventory types ────────────────────────────────────────────────────────

const INVENTORY_CATEGORIES = [
  { value: 'general', label: 'General', emoji: '📦' },
  { value: 'food', label: 'Food & Beverage', emoji: '🍱' },
  { value: 'cleaning', label: 'Cleaning', emoji: '🧹' },
  { value: 'amenities', label: 'Amenities', emoji: '🧴' },
  { value: 'linen', label: 'Linen & Laundry', emoji: '🛏️' },
  { value: 'maintenance', label: 'Maintenance', emoji: '🔧' },
  { value: 'office', label: 'Office', emoji: '📎' },
  { value: 'other', label: 'Other', emoji: '🗂️' },
];

function invCatMeta(value: string) {
  return INVENTORY_CATEGORIES.find((c) => c.value === value) ?? INVENTORY_CATEGORIES[0];
}

interface StockMovement {
  id: string;
  type: 'RECEIVED' | 'USED' | 'ADJUSTED';
  quantity: number;
  balanceAfter: number;
  notes: string | null;
  reference: string | null;
  recordedBy: string | null;
  recordedAt: string;
}

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  description: string | null;
  parLevel: number;
  currentStock: number;
  location: string | null;
  isActive: boolean;
  createdAt: string;
  stockMovements?: StockMovement[];
  _count?: { orderItems: number };
}

// ── Asset types ───────────────────────────────────────────────────────────────

const ASSET_CATEGORIES = [
  { value: 'furniture', label: 'Furniture', emoji: '🛋️' },
  { value: 'electronics', label: 'Electronics', emoji: '📺' },
  { value: 'appliances', label: 'Appliances', emoji: '❄️' },
  { value: 'equipment', label: 'Equipment', emoji: '🔧' },
  { value: 'vehicle', label: 'Vehicle / Boat', emoji: '⛵' },
  { value: 'linen', label: 'Linen & Bedding', emoji: '🛏️' },
  { value: 'safety', label: 'Safety & Security', emoji: '🔒' },
  { value: 'other', label: 'Other', emoji: '📦' },
];

type AssetCondition = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'UNDER_REPAIR' | 'RETIRED';

const CONDITION_STYLES: Record<AssetCondition, { label: string; color: string; dot: string }> = {
  EXCELLENT: { label: 'Excellent', color: 'bg-green-100 text-green-800 border-green-200', dot: 'bg-green-500' },
  GOOD:      { label: 'Good',      color: 'bg-blue-100 text-blue-800 border-blue-200',   dot: 'bg-blue-500' },
  FAIR:      { label: 'Fair',      color: 'bg-yellow-100 text-yellow-800 border-yellow-200', dot: 'bg-yellow-500' },
  POOR:      { label: 'Poor',      color: 'bg-orange-100 text-orange-800 border-orange-200', dot: 'bg-orange-500' },
  UNDER_REPAIR: { label: 'Under Repair', color: 'bg-red-100 text-red-800 border-red-200', dot: 'bg-red-500' },
  RETIRED:   { label: 'Retired',   color: 'bg-gray-100 text-gray-600 border-gray-200',  dot: 'bg-gray-400' },
};

function assetCatMeta(value: string) {
  return ASSET_CATEGORIES.find(c => c.value === value) ?? ASSET_CATEGORIES[ASSET_CATEGORIES.length - 1];
}

interface Asset {
  id: string;
  name: string;
  category: string;
  assetTag: string | null;
  serialNumber: string | null;
  location: string | null;
  condition: AssetCondition;
  purchaseDate: string | null;
  purchaseCost: number | null;
  warrantyExpiry: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
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
  const [mainTab, setMainTab] = useState<'orders' | 'consumables' | 'stock' | 'assets'>('orders');
  const [filter, setFilter] = useState<FilterTab>('ALL');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState<LogisticsOrder | null>(null);

  // Inventory state
  const [inventory, setInventory] = useState<InventoryItem[] | null>(null);
  const [invLoading, setInvLoading] = useState(false);
  const [invDialogOpen, setInvDialogOpen] = useState(false);
  const [editInvItem, setEditInvItem] = useState<InventoryItem | null>(null);
  const [useDialogItem, setUseDialogItem] = useState<InventoryItem | null>(null);
  const [adjustDialogItem, setAdjustDialogItem] = useState<InventoryItem | null>(null);
  const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);

  const loadInventory = useCallback(async () => {
    setInvLoading(true);
    try {
      const res = await fetch('/api/admin/logistics/inventory');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setInventory(data.items);
    } catch {
      alert('Failed to load inventory');
    } finally {
      setInvLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mainTab === 'consumables' || mainTab === 'stock') loadInventory();
    if (mainTab === 'assets') loadAssets();
  }, [mainTab, loadInventory]);

  // Assets state
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [assetDialogOpen, setAssetDialogOpen] = useState(false);
  const [editAsset, setEditAsset] = useState<Asset | null>(null);
  const [assetFilter, setAssetFilter] = useState<string>('all');

  const loadAssets = useCallback(async () => {
    setAssetsLoading(true);
    try {
      const res = await fetch('/api/admin/logistics/assets');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAssets(data.assets);
    } catch {
      alert('Failed to load assets');
    } finally {
      setAssetsLoading(false);
    }
  }, []);

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
            Supply orders, inventory catalog and stock tracking
          </p>
        </div>
        {mainTab === 'orders' && (
          <Button onClick={() => setCreateOpen(true)} className="bg-teal-600 hover:bg-teal-700">
            <PlusCircle className="h-4 w-4 mr-2" />
            New Order
          </Button>
        )}
        {(mainTab === 'consumables' || mainTab === 'stock') && (
          <Button onClick={() => { setEditInvItem(null); setInvDialogOpen(true); }} className="bg-teal-600 hover:bg-teal-700">
            <Plus className="h-4 w-4 mr-2" />
            Add Consumable
          </Button>
        )}
        {mainTab === 'assets' && (
          <Button onClick={() => { setEditAsset(null); setAssetDialogOpen(true); }} className="bg-teal-600 hover:bg-teal-700">
            <Plus className="h-4 w-4 mr-2" />
            Add Asset
          </Button>
        )}
      </div>

      {/* Main tab switcher */}
      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as any)} className="mb-5">
        <TabsList className="grid w-full max-w-xl grid-cols-4">
          <TabsTrigger value="orders" className="gap-1.5">
            <Truck className="h-4 w-4" /> Orders
          </TabsTrigger>
          <TabsTrigger value="consumables" className="gap-1.5">
            <LayoutList className="h-4 w-4" /> Consumables
          </TabsTrigger>
          <TabsTrigger value="stock" className="gap-1.5">
            <BarChart3 className="h-4 w-4" /> Stock View
            {inventory && inventory.some(i => i.currentStock <= i.parLevel && i.parLevel > 0) && (
              <Badge className="ml-1 h-5 bg-red-500 hover:bg-red-500 text-white">!</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="assets" className="gap-1.5">
            <Boxes className="h-4 w-4" /> Assets
            {assets && assets.some(a => a.condition === 'POOR' || a.condition === 'UNDER_REPAIR') && (
              <Badge className="ml-1 h-5 bg-orange-500 hover:bg-orange-500 text-white">!</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ========== ORDERS TAB ========== */}
        <TabsContent value="orders" className="mt-4">
          {/* Stats bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <StatCard label="Total Orders" value={stats.totalOrders} icon={<Boxes className="h-5 w-5 text-teal-600" />} />
            <StatCard label="Items Pending" value={stats.itemsPending} icon={<AlertTriangle className="h-5 w-5 text-amber-600" />} />
            <StatCard label="In Transit" value={stats.inTransit} icon={<Truck className="h-5 w-5 text-blue-600" />} />
            <StatCard label="Delivered This Month" value={stats.deliveredThisMonth} icon={<CheckCircle2 className="h-5 w-5 text-green-600" />} />
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
        </TabsContent>

        {/* ========== CONSUMABLES TAB ========== */}
        <TabsContent value="consumables" className="mt-4">
          {invLoading && !inventory ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading…
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="flex items-center justify-between p-4 border-b">
                  <div>
                    <h2 className="font-semibold">Item Catalog</h2>
                    <p className="text-xs text-gray-500">
                      {inventory?.length ?? 0} items · set par levels to get low-stock alerts
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={loadInventory} disabled={invLoading}>
                    <RefreshCw className={`h-4 w-4 ${invLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                {!inventory || inventory.length === 0 ? (
                  <div className="py-12 text-center text-gray-500">
                    <LayoutList className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                    <p className="text-lg font-medium mb-1">No items yet</p>
                    <p className="text-sm">Add items to track stock and link to orders.</p>
                  </div>
                ) : (
                  <>
                    {Array.from(new Set(inventory.map(i => i.category))).map(cat => {
                      const meta = invCatMeta(cat);
                      const catItems = inventory.filter(i => i.category === cat);
                      return (
                        <div key={cat}>
                          <div className="px-4 py-2 bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            {meta.emoji} {meta.label}
                          </div>
                          <Table>
                            <TableBody>
                              {catItems.map(item => {
                                const lowStock = item.parLevel > 0 && item.currentStock <= item.parLevel;
                                return (
                                  <TableRow key={item.id}>
                                    <TableCell className="font-medium">
                                      <div>{item.name}</div>
                                      {item.description && <div className="text-xs text-gray-400 line-clamp-1">{item.description}</div>}
                                    </TableCell>
                                    <TableCell className="text-xs text-gray-500">
                                      {item.location ?? '—'}
                                    </TableCell>
                                    <TableCell>
                                      <div className={`text-sm font-semibold ${lowStock ? 'text-red-600' : 'text-gray-800'}`}>
                                        {item.currentStock} {item.unit}
                                      </div>
                                      {item.parLevel > 0 && (
                                        <div className="text-[10px] text-gray-400">par: {item.parLevel}</div>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {lowStock && (
                                        <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100 gap-1" variant="outline">
                                          <AlertTriangle className="h-3 w-3" /> Low
                                        </Badge>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex items-center justify-end gap-1">
                                        <button onClick={() => setUseDialogItem(item)} className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded" title="Record Usage">
                                          <MinusCircle className="h-4 w-4" />
                                        </button>
                                        <button onClick={() => setAdjustDialogItem(item)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Adjust Stock">
                                          <SlidersHorizontal className="h-4 w-4" />
                                        </button>
                                        <button onClick={() => setHistoryItem(item)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded" title="Movement History">
                                          <History className="h-4 w-4" />
                                        </button>
                                        <button onClick={() => { setEditInvItem(item); setInvDialogOpen(true); }} className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded" title="Edit">
                                          <Edit2 className="h-4 w-4" />
                                        </button>
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
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ========== STOCK TAB ========== */}
        <TabsContent value="stock" className="mt-4">
          {invLoading && !inventory ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading…
            </div>
          ) : !inventory || inventory.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <BarChart3 className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                <p className="text-lg font-medium mb-1">No inventory items</p>
                <p className="text-sm mb-4">Add items in the Consumables tab first.</p>
                <Button variant="outline" size="sm" onClick={() => setMainTab('consumables')}>Go to Consumables</Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Low-stock alerts */}
              {inventory.filter(i => i.parLevel > 0 && i.currentStock <= i.parLevel).length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" /> Low Stock Alerts
                  </p>
                  <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                    {inventory.filter(i => i.parLevel > 0 && i.currentStock <= i.parLevel).map(item => (
                      <div key={item.id} className="flex items-center justify-between bg-white rounded px-3 py-2 text-sm border border-red-100">
                        <span className="font-medium truncate">{item.name}</span>
                        <span className="text-red-600 font-bold shrink-0 ml-2">
                          {item.currentStock}/{item.parLevel} {item.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stock cards grid */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {inventory.map(item => {
                  const pct = item.parLevel > 0 ? Math.min(100, (item.currentStock / item.parLevel) * 100) : null;
                  const lowStock = item.parLevel > 0 && item.currentStock <= item.parLevel;
                  const outOfStock = item.currentStock === 0;
                  return (
                    <Card key={item.id} className={`border-2 ${outOfStock ? 'border-red-300' : lowStock ? 'border-orange-200' : 'border-green-100'}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{item.name}</p>
                            <p className="text-[11px] text-gray-400">{invCatMeta(item.category).emoji} {invCatMeta(item.category).label}</p>
                          </div>
                          {outOfStock ? (
                            <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100 shrink-0" variant="outline">Out</Badge>
                          ) : lowStock ? (
                            <Badge className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100 shrink-0" variant="outline">Low</Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100 shrink-0" variant="outline">OK</Badge>
                          )}
                        </div>

                        <div className="text-2xl font-bold text-gray-900 mb-0.5">
                          {item.currentStock} <span className="text-sm font-normal text-gray-500">{item.unit}</span>
                        </div>
                        {item.parLevel > 0 && (
                          <div className="text-xs text-gray-500 mb-2">par level: {item.parLevel} {item.unit}</div>
                        )}
                        {pct !== null && (
                          <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3">
                            <div
                              className={`h-1.5 rounded-full ${pct <= 50 ? 'bg-red-500' : pct <= 80 ? 'bg-orange-400' : 'bg-green-500'}`}
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                        )}
                        {item.location && (
                          <p className="text-[11px] text-gray-400 mb-2">📍 {item.location}</p>
                        )}

                        <div className="flex gap-1.5 pt-1 border-t border-gray-100">
                          <button
                            onClick={() => setUseDialogItem(item)}
                            className="flex-1 text-xs font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 rounded px-2 py-1.5 flex items-center justify-center gap-1"
                          >
                            <MinusCircle className="h-3.5 w-3.5" /> Use
                          </button>
                          <button
                            onClick={() => setAdjustDialogItem(item)}
                            className="flex-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded px-2 py-1.5 flex items-center justify-center gap-1"
                          >
                            <SlidersHorizontal className="h-3.5 w-3.5" /> Adjust
                          </button>
                          <button
                            onClick={() => setHistoryItem(item)}
                            className="text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded px-2 py-1.5 flex items-center justify-center gap-1"
                          >
                            <History className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </TabsContent>

        {/* ========== ASSETS TAB ========== */}
        <TabsContent value="assets" className="mt-4">
          {assetsLoading && !assets ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading…
            </div>
          ) : (
            <>
              {/* Condition alerts */}
              {assets && assets.filter(a => a.condition === 'POOR' || a.condition === 'UNDER_REPAIR').length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                  <p className="text-sm font-semibold text-orange-700 mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" /> Assets Needing Attention
                  </p>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {assets.filter(a => a.condition === 'POOR' || a.condition === 'UNDER_REPAIR').map(a => (
                      <div key={a.id} className="flex items-center justify-between bg-white rounded px-3 py-2 text-sm border border-orange-100">
                        <span className="font-medium truncate">{a.name}</span>
                        <span className={`shrink-0 ml-2 text-xs px-2 py-0.5 rounded-full border ${CONDITION_STYLES[a.condition].color}`}>
                          {CONDITION_STYLES[a.condition].label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Filter bar */}
              {assets && assets.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {(['all', ...ASSET_CATEGORIES.map(c => c.value)] as string[]).map(cat => {
                    const count = cat === 'all' ? assets.length : assets.filter(a => a.category === cat).length;
                    if (count === 0 && cat !== 'all') return null;
                    const meta = cat === 'all' ? { emoji: '🗂️', label: 'All' } : assetCatMeta(cat);
                    return (
                      <button
                        key={cat}
                        onClick={() => setAssetFilter(cat)}
                        className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                          assetFilter === cat ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-200 hover:border-teal-300'
                        }`}
                      >
                        {meta.emoji} {meta.label} ({count})
                      </button>
                    );
                  })}
                </div>
              )}

              {!assets || assets.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-gray-500">
                    <Boxes className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                    <p className="text-lg font-medium mb-1">No assets yet</p>
                    <p className="text-sm">Track furniture, appliances, equipment and vehicles.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {(assets ?? [])
                    .filter(a => assetFilter === 'all' || a.category === assetFilter)
                    .map(asset => {
                      const cond = CONDITION_STYLES[asset.condition];
                      const catMeta = assetCatMeta(asset.category);
                      const warrantyExpired = asset.warrantyExpiry && new Date(asset.warrantyExpiry) < new Date();
                      return (
                        <Card key={asset.id} className={`border-2 ${
                          asset.condition === 'POOR' || asset.condition === 'UNDER_REPAIR' ? 'border-orange-200' :
                          asset.condition === 'RETIRED' ? 'border-gray-200 opacity-60' : 'border-gray-100'
                        }`}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-2 mb-3">
                              <div className="min-w-0">
                                <p className="font-semibold text-sm truncate">{asset.name}</p>
                                <p className="text-[11px] text-gray-400">{catMeta.emoji} {catMeta.label}</p>
                              </div>
                              <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${cond.color}`}>
                                <span className={`inline-block h-1.5 w-1.5 rounded-full ${cond.dot}`} />
                                {cond.label}
                              </span>
                            </div>

                            <div className="space-y-1 text-xs text-gray-600 mb-3">
                              {asset.location && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-gray-400">📍</span> {asset.location}
                                </div>
                              )}
                              {asset.assetTag && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-gray-400">🏷</span> {asset.assetTag}
                                </div>
                              )}
                              {asset.serialNumber && (
                                <div className="flex items-center gap-1.5 font-mono">
                                  <span className="text-gray-400">S/N</span> {asset.serialNumber}
                                </div>
                              )}
                              {asset.purchaseCost != null && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-gray-400">💰</span> ${asset.purchaseCost.toFixed(2)}
                                  {asset.purchaseDate && ` · ${new Date(asset.purchaseDate).getFullYear()}`}
                                </div>
                              )}
                              {asset.warrantyExpiry && (
                                <div className={`flex items-center gap-1.5 ${warrantyExpired ? 'text-red-600 font-medium' : ''}`}>
                                  <span className="text-gray-400">🛡</span>
                                  Warranty {warrantyExpired ? 'expired' : 'until'} {new Date(asset.warrantyExpiry).toLocaleDateString()}
                                </div>
                              )}
                            </div>

                            {asset.notes && (
                              <p className="text-[11px] text-gray-400 italic line-clamp-2 mb-3">{asset.notes}</p>
                            )}

                            <div className="flex gap-1.5 pt-2 border-t border-gray-100">
                              {/* Quick condition update */}
                              <select
                                value={asset.condition}
                                onChange={async (e) => {
                                  await fetch(`/api/admin/logistics/assets/${asset.id}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ condition: e.target.value }),
                                  });
                                  loadAssets();
                                }}
                                className={`flex-1 text-[11px] font-medium rounded border px-2 py-1.5 ${cond.color}`}
                              >
                                {Object.entries(CONDITION_STYLES).map(([val, s]) => (
                                  <option key={val} value={val}>{s.label}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => { setEditAsset(asset); setAssetDialogOpen(true); }}
                                className="px-2 py-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded border border-gray-200"
                                title="Edit"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Dialogs ── */}
      <CreateOrderDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        inventory={inventory ?? []}
        onCreated={() => router.refresh()}
      />

      {detailOrder && (
        <OrderDetailDialog
          order={detailOrder}
          inventory={inventory ?? []}
          onOpenChange={(open) => !open && setDetailOrder(null)}
          onChanged={() => router.refresh()}
          onCancel={() => cancelOrder(detailOrder)}
          busy={busyId === detailOrder.id}
        />
      )}

      <InventoryItemDialog
        open={invDialogOpen}
        onOpenChange={setInvDialogOpen}
        initial={editInvItem}
        onSaved={() => { setInvDialogOpen(false); loadInventory(); }}
      />

      {useDialogItem && (
        <UseStockDialog
          item={useDialogItem}
          onClose={() => setUseDialogItem(null)}
          onSaved={() => { setUseDialogItem(null); loadInventory(); }}
        />
      )}

      {adjustDialogItem && (
        <AdjustStockDialog
          item={adjustDialogItem}
          onClose={() => setAdjustDialogItem(null)}
          onSaved={() => { setAdjustDialogItem(null); loadInventory(); }}
        />
      )}

      {historyItem && (
        <StockHistoryDialog
          item={historyItem}
          onClose={() => setHistoryItem(null)}
        />
      )}

      <AssetDialog
        open={assetDialogOpen}
        onOpenChange={setAssetDialogOpen}
        initial={editAsset}
        onSaved={() => { setAssetDialogOpen(false); loadAssets(); }}
      />
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
  inventory,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventory: InventoryItem[];
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
    { name: string; quantity: string; unit: string; estimatedCost: string; notes: string; inventoryItemId: string }[]
  >([{ name: '', quantity: '1', unit: 'pcs', estimatedCost: '', notes: '', inventoryItemId: '' }]);

  function reset() {
    setTitle('');
    setDescription('');
    setRequestedBy('');
    setDestination('Male');
    setUrgency('MEDIUM');
    setNotes('');
    setItems([{ name: '', quantity: '1', unit: 'pcs', estimatedCost: '', notes: '', inventoryItemId: '' }]);
  }

  function addItemRow() {
    setItems((prev) => [
      ...prev,
      { name: '', quantity: '1', unit: 'pcs', estimatedCost: '', notes: '', inventoryItemId: '' },
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
        inventoryItemId: it.inventoryItemId || undefined,
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
                  {/* Inventory link row */}
                  {inventory.length > 0 && (
                    <div className="col-span-12">
                      <select
                        value={it.inventoryItemId}
                        onChange={(e) => {
                          updateItem(idx, 'inventoryItemId', e.target.value);
                          if (e.target.value) {
                            const inv = inventory.find(i => i.id === e.target.value);
                            if (inv) {
                              updateItem(idx, 'name', inv.name);
                              updateItem(idx, 'unit', inv.unit);
                            }
                          }
                        }}
                        className="w-full text-xs rounded border border-dashed border-teal-300 bg-teal-50 px-2 py-1"
                      >
                        <option value="">🔗 Link to inventory item (optional)</option>
                        {inventory.map(inv => (
                          <option key={inv.id} value={inv.id}>
                            {inv.name} — stock: {inv.currentStock} {inv.unit}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
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
  inventory,
  onOpenChange,
  onChanged,
  onCancel,
  busy,
}: {
  order: LogisticsOrder;
  inventory: InventoryItem[];
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
                      {(it as any).inventoryItemId && (
                        <p className="text-[10px] text-teal-600 flex items-center gap-0.5 mt-0.5">
                          <Link2 className="h-3 w-3" />
                          Linked to inventory — stock updates on Received
                        </p>
                      )}
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

// ── Inventory Item Dialog (create/edit) ──────────────────────────────────────

function InventoryItemDialog({
  open, onOpenChange, initial, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: InventoryItem | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('general');
  const [unit, setUnit] = useState('pcs');
  const [description, setDescription] = useState('');
  const [parLevel, setParLevel] = useState('0');
  const [openingStock, setOpeningStock] = useState('0');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? '');
      setCategory(initial?.category ?? 'general');
      setUnit(initial?.unit ?? 'pcs');
      setDescription(initial?.description ?? '');
      setParLevel(initial?.parLevel?.toString() ?? '0');
      setOpeningStock(initial?.currentStock?.toString() ?? '0');
      setLocation(initial?.location ?? '');
    }
  }, [open, initial]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const url = initial ? `/api/admin/logistics/inventory/${initial.id}` : '/api/admin/logistics/inventory';
      const method = initial ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category, unit, description, parLevel: Number(parLevel), openingStock: Number(openingStock), location }),
      });
      if (!res.ok) throw new Error('Save failed');
      onSaved();
    } catch {
      alert('Failed to save item');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit Inventory Item' : 'Add Inventory Item'}</DialogTitle>
          <DialogDescription>Track stock levels and link to supply orders.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label>Name *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Shower Gel 250ml" required />
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {INVENTORY_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Unit</Label>
              <Input value={unit} onChange={e => setUnit(e.target.value)} placeholder="pcs / bottles / kg…" />
            </div>
            <div className="space-y-1">
              <Label>Par Level (min stock)</Label>
              <Input type="number" min="0" step="any" value={parLevel} onChange={e => setParLevel(e.target.value)} />
            </div>
            {!initial && (
              <div className="space-y-1">
                <Label>Opening Stock</Label>
                <Input type="number" min="0" step="any" value={openingStock} onChange={e => setOpeningStock(e.target.value)} />
              </div>
            )}
            <div className={initial ? 'col-span-2' : ''} style={{ gridColumn: initial ? 'span 2' : undefined }}>
              <Label>Location</Label>
              <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Store Room A, Kitchen…" className="mt-1" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Optional notes" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-teal-600 hover:bg-teal-700">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (initial ? 'Save Changes' : 'Add Item')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Use Stock Dialog ──────────────────────────────────────────────────────────

function UseStockDialog({ item, onClose, onSaved }: { item: InventoryItem; onClose: () => void; onSaved: () => void }) {
  const [qty, setQty] = useState('1');
  const [notes, setNotes] = useState('');
  const [ref, setRef] = useState('');
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!qty || Number(qty) <= 0) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/logistics/inventory/${item.id}/use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: Number(qty), notes, reference: ref }),
      });
      if (!res.ok) throw new Error('Failed');
      onSaved();
    } catch {
      alert('Failed to record usage');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Usage — {item.name}</DialogTitle>
          <DialogDescription>Current stock: {item.currentStock} {item.unit}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Quantity Used *</Label>
            <Input type="number" min="0.01" step="any" value={qty} onChange={e => setQty(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label>Reference / Area</Label>
            <Input value={ref} onChange={e => setRef(e.target.value)} placeholder="Room 101, Kitchen…" />
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Optional" />
          </div>
          <div className="text-sm bg-orange-50 rounded p-3 text-orange-700 font-medium">
            After: {Math.max(0, item.currentStock - Number(qty || 0)).toFixed(2)} {item.unit}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-orange-600 hover:bg-orange-700">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Record Usage'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Adjust Stock Dialog ───────────────────────────────────────────────────────

function AdjustStockDialog({ item, onClose, onSaved }: { item: InventoryItem; onClose: () => void; onSaved: () => void }) {
  const [newStock, setNewStock] = useState(item.currentStock.toString());
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/logistics/inventory/${item.id}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newStock: Number(newStock), notes }),
      });
      if (!res.ok) throw new Error('Failed');
      onSaved();
    } catch {
      alert('Failed to adjust stock');
    } finally {
      setSaving(false);
    }
  }

  const delta = Number(newStock) - item.currentStock;

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust Stock — {item.name}</DialogTitle>
          <DialogDescription>Current: {item.currentStock} {item.unit}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>New Stock Quantity *</Label>
            <Input type="number" min="0" step="any" value={newStock} onChange={e => setNewStock(e.target.value)} required />
          </div>
          {delta !== 0 && (
            <div className={`text-sm rounded p-3 font-medium flex items-center gap-2 ${delta > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {delta > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {delta > 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2)} {item.unit} adjustment
            </div>
          )}
          <div className="space-y-1">
            <Label>Reason / Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Physical count, damaged, etc." />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply Adjustment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Stock History Dialog ──────────────────────────────────────────────────────

const MOVEMENT_STYLES: Record<string, string> = {
  RECEIVED: 'text-green-700 bg-green-50',
  USED: 'text-orange-700 bg-orange-50',
  ADJUSTED: 'text-blue-700 bg-blue-50',
};

function StockHistoryDialog({ item, onClose }: { item: InventoryItem; onClose: () => void }) {
  const [movements, setMovements] = useState<StockMovement[]>(item.stockMovements ?? []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/logistics/inventory/${item.id}`)
      .then(r => r.json())
      .then(d => setMovements(d.item?.stockMovements ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [item.id]);

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Stock History — {item.name}</DialogTitle>
          <DialogDescription>Current: {item.currentStock} {item.unit} · par: {item.parLevel}</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-1.5 py-2">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
          ) : movements.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">No movements recorded yet.</p>
          ) : (
            movements.map(m => (
              <div key={m.id} className="flex items-center gap-3 rounded-lg border px-3 py-2.5 text-xs">
                <span className={`shrink-0 px-2 py-0.5 rounded-full font-semibold ${MOVEMENT_STYLES[m.type] ?? ''}`}>
                  {m.type === 'RECEIVED' ? '▲' : m.type === 'USED' ? '▼' : '⟳'} {m.type}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${m.quantity >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {m.quantity >= 0 ? '+' : ''}{m.quantity} {item.unit}
                    </span>
                    <span className="text-gray-500">→ {m.balanceAfter} {item.unit}</span>
                  </div>
                  <div className="text-gray-400 truncate">
                    {m.notes ?? ''}
                    {m.reference ? ` · ref: ${m.reference}` : ''}
                    {m.recordedBy ? ` · ${m.recordedBy}` : ''}
                  </div>
                </div>
                <span className="text-gray-400 shrink-0">
                  {new Date(m.recordedAt).toLocaleDateString()}
                </span>
              </div>
            ))
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Asset Dialog (create/edit) ────────────────────────────────────────────────

function AssetDialog({
  open, onOpenChange, initial, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: Asset | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('equipment');
  const [assetTag, setAssetTag] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [location, setLocation] = useState('');
  const [condition, setCondition] = useState<AssetCondition>('GOOD');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchaseCost, setPurchaseCost] = useState('');
  const [warrantyExpiry, setWarrantyExpiry] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? '');
      setCategory(initial?.category ?? 'equipment');
      setAssetTag(initial?.assetTag ?? '');
      setSerialNumber(initial?.serialNumber ?? '');
      setLocation(initial?.location ?? '');
      setCondition(initial?.condition ?? 'GOOD');
      setPurchaseDate(initial?.purchaseDate ? initial.purchaseDate.split('T')[0] : '');
      setPurchaseCost(initial?.purchaseCost?.toString() ?? '');
      setWarrantyExpiry(initial?.warrantyExpiry ? initial.warrantyExpiry.split('T')[0] : '');
      setNotes(initial?.notes ?? '');
    }
  }, [open, initial]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const url = initial ? `/api/admin/logistics/assets/${initial.id}` : '/api/admin/logistics/assets';
      const method = initial ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, category, assetTag, serialNumber, location, condition,
          purchaseDate: purchaseDate || null,
          purchaseCost: purchaseCost ? Number(purchaseCost) : null,
          warrantyExpiry: warrantyExpiry || null,
          notes,
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      onSaved();
    } catch {
      alert('Failed to save asset');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit Asset' : 'Add Asset'}</DialogTitle>
          <DialogDescription>Track property assets — furniture, equipment, appliances and more.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label>Asset Name *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Samsung 55″ TV Room 101" required />
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {ASSET_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Condition</Label>
              <select value={condition} onChange={e => setCondition(e.target.value as AssetCondition)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {Object.entries(CONDITION_STYLES).map(([val, s]) => <option key={val} value={val}>{s.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Location / Room</Label>
              <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Room 101, Lobby…" />
            </div>
            <div className="space-y-1">
              <Label>Asset Tag</Label>
              <Input value={assetTag} onChange={e => setAssetTag(e.target.value)} placeholder="AST-001" />
            </div>
            <div className="space-y-1">
              <Label>Serial Number</Label>
              <Input value={serialNumber} onChange={e => setSerialNumber(e.target.value)} placeholder="SN…" />
            </div>
            <div className="space-y-1">
              <Label>Purchase Date</Label>
              <Input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Purchase Cost ($)</Label>
              <Input type="number" min="0" step="0.01" value={purchaseCost} onChange={e => setPurchaseCost(e.target.value)} placeholder="0.00" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Warranty Expiry</Label>
              <Input type="date" value={warrantyExpiry} onChange={e => setWarrantyExpiry(e.target.value)} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Maintenance history, issues, specs…" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-teal-600 hover:bg-teal-700">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (initial ? 'Save Changes' : 'Add Asset')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
