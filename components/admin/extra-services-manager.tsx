'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Compass,
  Waves,
  Fish,
  Sailboat,
  Calendar,
  RotateCcw,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';

type ExtraCategory =
  | 'EXCURSION'
  | 'DIVING'
  | 'SNORKELLING'
  | 'PICNIC'
  | 'FISHING'
  | 'RENTAL';

const CATEGORY_META: Record<
  ExtraCategory,
  { label: string; emoji: string; icon: typeof Compass; color: string }
> = {
  EXCURSION: {
    label: 'Excursion',
    emoji: '🌴',
    icon: Compass,
    color: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  },
  DIVING: {
    label: 'Diving',
    emoji: '🤿',
    icon: Waves,
    color: 'bg-blue-50 border-blue-200 text-blue-700',
  },
  SNORKELLING: {
    label: 'Snorkelling',
    emoji: '🐠',
    icon: Fish,
    color: 'bg-cyan-50 border-cyan-200 text-cyan-700',
  },
  PICNIC: {
    label: 'Picnic',
    emoji: '🧺',
    icon: Sailboat,
    color: 'bg-amber-50 border-amber-200 text-amber-700',
  },
  FISHING: {
    label: 'Fishing',
    emoji: '🎣',
    icon: Fish,
    color: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  },
  RENTAL: {
    label: 'Rental',
    emoji: '🚲',
    icon: RotateCcw,
    color: 'bg-purple-50 border-purple-200 text-purple-700',
  },
};

const CATEGORIES = Object.keys(CATEGORY_META) as ExtraCategory[];

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-purple-100 text-purple-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-700',
};

interface Service {
  id: string;
  tenantId: string;
  name: string;
  description?: string | null;
  category: string;
  price: number;
  duration?: number | null;
  isActive: boolean;
}

interface Room {
  id: string;
  number: string;
  type?: string;
}

interface ServiceOrder {
  id: string;
  status: string;
  quantity: number;
  totalAmount: number;
  notes?: string | null;
  scheduledDate?: string | null;
  completedAt?: string | null;
  rentalDueAt?: string | null;
  rentalReturnedAt?: string | null;
  rentalItem?: string | null;
  isRental: boolean;
  createdAt: string;
  service: { id: string; name: string; category: string; price: number };
  room?: { id: string; number: string; type?: string } | null;
  booking?: {
    id: string;
    confirmationNumber?: string | null;
    room?: { id: string; number: string } | null;
    guest?: {
      id: string;
      name: string | null;
      guestProfile?: { firstName: string; lastName: string } | null;
    } | null;
  } | null;
  guest?: {
    id: string;
    name: string | null;
    guestProfile?: { firstName: string; lastName: string } | null;
  } | null;
}

interface ExtraServicesManagerProps {
  services: Service[];
  orders: ServiceOrder[];
  rooms: Room[];
}

function guestLabel(order: ServiceOrder): string {
  if (order.booking?.guest) {
    const gp = order.booking.guest.guestProfile;
    if (gp) return `${gp.firstName} ${gp.lastName}`.trim();
    if (order.booking.guest.name) return order.booking.guest.name;
  }
  if (order.guest) {
    const gp = order.guest.guestProfile;
    if (gp) return `${gp.firstName} ${gp.lastName}`.trim();
    if (order.guest.name) return order.guest.name;
  }
  return 'Walk-in';
}

function roomLabel(order: ServiceOrder): string | null {
  return (
    order.room?.number ??
    order.booking?.room?.number ??
    null
  );
}

function ServiceFormDialog({
  open,
  onOpenChange,
  initial,
  defaultCategory,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Service | null;
  defaultCategory?: ExtraCategory;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ExtraCategory>(
    defaultCategory ?? 'EXCURSION'
  );
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [saving, setSaving] = useState(false);

  function reset() {
    setName(initial?.name ?? '');
    setDescription(initial?.description ?? '');
    setCategory(((initial?.category as ExtraCategory) ?? defaultCategory ?? 'EXCURSION'));
    setPrice(initial?.price?.toString() ?? '');
    setDuration(initial?.duration?.toString() ?? '');
  }

  function handleOpen(o: boolean) {
    if (o) reset();
    onOpenChange(o);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !price) return;
    setSaving(true);
    try {
      const url = initial
        ? `/api/admin/extra-services/${initial.id}`
        : '/api/admin/extra-services';
      const res = await fetch(url, {
        method: initial ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description || null,
          category,
          price: Number(price),
          duration: duration ? Number(duration) : null,
          isRental: category === 'RENTAL',
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      onOpenChange(false);
      onSaved();
    } catch {
      alert('Failed to save service');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit Service' : 'Add Service'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="es-name">Name *</Label>
            <Input
              id="es-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sandbank Picnic"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="es-cat">Category *</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as ExtraCategory)}>
              <SelectTrigger id="es-cat">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CATEGORY_META[c].emoji} {CATEGORY_META[c].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="es-price">Price (USD) *</Label>
              <Input
                id="es-price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="es-dur">Duration (minutes)</Label>
              <Input
                id="es-dur"
                type="number"
                min="0"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g. 120"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="es-desc">Description</Label>
            <Textarea
              id="es-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Short description for staff & guests"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {initial ? 'Save changes' : 'Create service'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NewOrderDialog({
  open,
  onOpenChange,
  services,
  rooms,
  defaultCategory,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  services: Service[];
  rooms: Room[];
  defaultCategory?: ExtraCategory;
  onCreated: () => void;
}) {
  const [serviceId, setServiceId] = useState('');
  const [roomId, setRoomId] = useState<string>('none');
  const [quantity, setQuantity] = useState('1');
  const [scheduledDate, setScheduledDate] = useState('');
  const [rentalItem, setRentalItem] = useState('');
  const [rentalDueAt, setRentalDueAt] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const filteredServices = useMemo(() => {
    const list = services.filter((s) => s.isActive);
    if (defaultCategory) {
      return list.filter((s) => s.category === defaultCategory);
    }
    return list;
  }, [services, defaultCategory]);

  const selectedService = filteredServices.find((s) => s.id === serviceId);
  const isRentalCategory = selectedService?.category === 'RENTAL';

  function reset() {
    setServiceId(filteredServices[0]?.id ?? '');
    setRoomId('none');
    setQuantity('1');
    setScheduledDate('');
    setRentalItem('');
    setRentalDueAt('');
    setNotes('');
  }

  function handleOpen(o: boolean) {
    if (o) reset();
    onOpenChange(o);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!serviceId) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/extra-services/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId,
          roomId: roomId !== 'none' ? roomId : undefined,
          quantity: Number(quantity) || 1,
          scheduledDate: scheduledDate || undefined,
          notes: notes || undefined,
          isRental: isRentalCategory,
          rentalItem: isRentalCategory ? rentalItem || undefined : undefined,
          rentalDueAt: isRentalCategory ? rentalDueAt || undefined : undefined,
        }),
      });
      if (!res.ok) throw new Error('Create failed');
      onOpenChange(false);
      onCreated();
    } catch {
      alert('Failed to create order');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Order</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Service *</Label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a service" />
              </SelectTrigger>
              <SelectContent>
                {filteredServices.length === 0 ? (
                  <div className="px-2 py-3 text-sm text-gray-500">
                    No active services
                  </div>
                ) : (
                  filteredServices.map((s) => {
                    const meta = CATEGORY_META[s.category as ExtraCategory];
                    return (
                      <SelectItem key={s.id} value={s.id}>
                        {meta?.emoji ?? ''} {s.name} — ${s.price.toFixed(2)}
                      </SelectItem>
                    );
                  })
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Room (optional)</Label>
              <Select value={roomId} onValueChange={setRoomId}>
                <SelectTrigger>
                  <SelectValue placeholder="No room" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No room</SelectItem>
                  {rooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      Room {r.number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="o-qty">Quantity</Label>
              <Input
                id="o-qty"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="o-date">Scheduled Date / Time</Label>
            <Input
              id="o-date"
              type="datetime-local"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
            />
          </div>

          {isRentalCategory && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div className="space-y-2">
                <Label htmlFor="o-rental-item">Rental Item</Label>
                <Input
                  id="o-rental-item"
                  value={rentalItem}
                  onChange={(e) => setRentalItem(e.target.value)}
                  placeholder="e.g. Bike #3"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="o-rental-due">Due Back</Label>
                <Input
                  id="o-rental-due"
                  type="datetime-local"
                  value={rentalDueAt}
                  onChange={(e) => setRentalDueAt(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="o-notes">Notes</Label>
            <Textarea
              id="o-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special instructions"
            />
          </div>

          {selectedService && (
            <div className="rounded-md bg-gray-50 border px-3 py-2 text-sm flex items-center justify-between">
              <span className="text-gray-600">Total</span>
              <span className="font-semibold text-gray-900">
                ${(selectedService.price * (Number(quantity) || 1)).toFixed(2)}
              </span>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !serviceId}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create order
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ExtraServicesManager({
  services,
  orders,
  rooms,
}: ExtraServicesManagerProps) {
  const router = useRouter();

  const [activeCategory, setActiveCategory] = useState<ExtraCategory | 'ALL'>(
    'ALL'
  );
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const visibleServices = useMemo(() => {
    if (activeCategory === 'ALL') return services;
    return services.filter((s) => s.category === activeCategory);
  }, [services, activeCategory]);

  const visibleOrders = useMemo(() => {
    if (activeCategory === 'ALL') return orders;
    return orders.filter((o) => o.service.category === activeCategory);
  }, [orders, activeCategory]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: orders.length };
    CATEGORIES.forEach((cat) => {
      c[cat] = orders.filter((o) => o.service.category === cat).length;
    });
    return c;
  }, [orders]);

  async function patchOrder(id: string, body: Record<string, unknown>) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/extra-services/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Update failed');
      router.refresh();
    } catch {
      alert('Failed to update order');
    } finally {
      setBusyId(null);
    }
  }

  async function deleteService(id: string) {
    if (!confirm('Deactivate this service? It will be hidden from new orders.')) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/extra-services/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Delete failed');
      router.refresh();
    } catch {
      alert('Failed to delete service');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Extra Services</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Excursions, diving, snorkelling, picnics, fishing & rentals
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setEditingService(null);
              setServiceDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Service
          </Button>
          <Button
            onClick={() => setOrderDialogOpen(true)}
            className="bg-cyan-600 hover:bg-cyan-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Order
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCategory('ALL')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            activeCategory === 'ALL'
              ? 'bg-gray-900 text-white border-gray-900'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          All <span className="ml-1 opacity-70">({counts.ALL})</span>
        </button>
        {CATEGORIES.map((cat) => {
          const meta = CATEGORY_META[cat];
          const active = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors flex items-center gap-1.5 ${
                active
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>{meta.emoji}</span>
              <span>{meta.label}</span>
              <span className="opacity-70">({counts[cat] ?? 0})</span>
            </button>
          );
        })}
      </div>

      <Tabs defaultValue="orders" className="w-full">
        <TabsList>
          <TabsTrigger value="orders">
            <Calendar className="h-4 w-4 mr-2" />
            Orders ({visibleOrders.length})
          </TabsTrigger>
          <TabsTrigger value="services">
            Services ({visibleServices.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-4">
          {visibleOrders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <Calendar className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                <p className="text-sm">No active orders in this category yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleOrders.map((order) => {
                const meta = CATEGORY_META[order.service.category as ExtraCategory];
                const Icon = meta?.icon ?? Calendar;
                const room = roomLabel(order);
                const isRental = order.isRental || order.service.category === 'RENTAL';
                const isOverdue =
                  isRental &&
                  order.rentalDueAt &&
                  !order.rentalReturnedAt &&
                  new Date(order.rentalDueAt) < new Date();

                return (
                  <Card key={order.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-md border ${
                              meta?.color ?? 'bg-gray-50 border-gray-200'
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <CardTitle className="text-sm truncate">
                              {order.service.name}
                            </CardTitle>
                            <p className="text-xs text-gray-500 truncate">
                              {guestLabel(order)}
                              {room ? ` · Room ${room}` : ''}
                            </p>
                          </div>
                        </div>
                        <Badge
                          className={`${STATUS_COLORS[order.status] ?? ''} shrink-0`}
                          variant="secondary"
                        >
                          {order.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span>
                          Qty: <span className="font-medium">{order.quantity}</span>
                        </span>
                        <span className="font-semibold text-gray-900">
                          ${order.totalAmount.toFixed(2)}
                        </span>
                      </div>

                      {order.scheduledDate && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          {new Date(order.scheduledDate).toLocaleString([], {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </div>
                      )}

                      {isRental && (
                        <div
                          className={`text-xs rounded-md px-2 py-1.5 border ${
                            isOverdue
                              ? 'bg-red-50 border-red-200 text-red-700'
                              : order.rentalReturnedAt
                                ? 'bg-green-50 border-green-200 text-green-700'
                                : 'bg-purple-50 border-purple-200 text-purple-700'
                          }`}
                        >
                          {order.rentalItem && (
                            <div className="font-medium">{order.rentalItem}</div>
                          )}
                          {order.rentalReturnedAt ? (
                            <div>
                              Returned:{' '}
                              {new Date(order.rentalReturnedAt).toLocaleString([], {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })}
                            </div>
                          ) : order.rentalDueAt ? (
                            <div>
                              {isOverdue ? 'Overdue since: ' : 'Due: '}
                              {new Date(order.rentalDueAt).toLocaleString([], {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })}
                            </div>
                          ) : null}
                        </div>
                      )}

                      {order.notes && (
                        <p className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1 line-clamp-2">
                          📝 {order.notes}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {(order.status === 'PENDING' || order.status === 'CONFIRMED') && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            disabled={busyId === order.id}
                            onClick={() => patchOrder(order.id, { status: 'IN_PROGRESS' })}
                          >
                            {busyId === order.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              'Start'
                            )}
                          </Button>
                        )}
                        {order.status === 'IN_PROGRESS' && (
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-green-600 hover:bg-green-700"
                            disabled={busyId === order.id}
                            onClick={() => patchOrder(order.id, { status: 'COMPLETED' })}
                          >
                            {busyId === order.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Complete
                              </>
                            )}
                          </Button>
                        )}
                        {isRental && !order.rentalReturnedAt && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            disabled={busyId === order.id}
                            onClick={() =>
                              patchOrder(order.id, {
                                rentalReturnedAt: new Date().toISOString(),
                                status: 'COMPLETED',
                              })
                            }
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Mark Returned
                          </Button>
                        )}
                        {order.status !== 'COMPLETED' &&
                          order.status !== 'CANCELLED' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-gray-500 hover:text-red-600"
                              disabled={busyId === order.id}
                              onClick={() => patchOrder(order.id, { status: 'CANCELLED' })}
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Cancel
                            </Button>
                          )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="services" className="mt-4">
          {visibleServices.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <p className="text-sm mb-3">No services in this category yet.</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingService(null);
                    setServiceDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Service
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleServices.map((s) => {
                const meta = CATEGORY_META[s.category as ExtraCategory];
                const Icon = meta?.icon ?? Calendar;
                return (
                  <Card key={s.id} className={!s.isActive ? 'opacity-60' : ''}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-md border ${
                              meta?.color ?? 'bg-gray-50 border-gray-200'
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <CardTitle className="text-base truncate">{s.name}</CardTitle>
                            <p className="text-xs text-gray-500">
                              {meta?.emoji} {meta?.label ?? s.category}
                            </p>
                          </div>
                        </div>
                        {!s.isActive && (
                          <Badge variant="secondary" className="bg-gray-200">
                            Inactive
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {s.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {s.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-gray-900">
                          ${s.price.toFixed(2)}
                        </span>
                        {s.duration ? (
                          <span className="text-xs text-gray-500">
                            {s.duration} min
                          </span>
                        ) : null}
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 flex-1"
                          onClick={() => {
                            setEditingService(s);
                            setServiceDialogOpen(true);
                          }}
                        >
                          <Edit2 className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        {s.isActive && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-red-600 hover:text-red-700"
                            disabled={busyId === s.id}
                            onClick={() => deleteService(s.id)}
                          >
                            {busyId === s.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ServiceFormDialog
        open={serviceDialogOpen}
        onOpenChange={(o) => {
          setServiceDialogOpen(o);
          if (!o) setEditingService(null);
        }}
        initial={editingService}
        defaultCategory={
          activeCategory !== 'ALL' ? (activeCategory as ExtraCategory) : undefined
        }
        onSaved={() => router.refresh()}
      />

      <NewOrderDialog
        open={orderDialogOpen}
        onOpenChange={setOrderDialogOpen}
        services={services}
        rooms={rooms}
        defaultCategory={
          activeCategory !== 'ALL' ? (activeCategory as ExtraCategory) : undefined
        }
        onCreated={() => router.refresh()}
      />
    </div>
  );
}
