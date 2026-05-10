'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Clock, CalendarCheck, UtensilsCrossed } from 'lucide-react';
import { AddServiceOrderModal } from './add-service-order-modal';

type DateRange = 'today' | 'week' | 'month' | 'all';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-purple-100 text-purple-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-700',
};

interface ServiceOrder {
  id: string;
  status: string;
  quantity: number;
  totalAmount: number;
  notes?: string | null;
  scheduledDate?: string | Date | null;
  completedAt?: string | Date | null;
  createdAt: string | Date;
  service?: { name: string; category: string } | null;
  booking?: { id: string; room?: { number: string } | null } | null;
  guest?: { name: string | null } | null;
}

interface Room {
  id: string;
  number: string;
}

interface RoomServiceBoardProps {
  orders: ServiceOrder[];
  rooms: Room[];
}

const COLUMNS = [
  {
    key: 'PENDING',
    title: 'New Orders',
    color: 'bg-yellow-50 border-yellow-200',
    statuses: ['PENDING', 'CONFIRMED'],
  },
  {
    key: 'IN_PROGRESS',
    title: 'In Preparation',
    color: 'bg-blue-50 border-blue-200',
    statuses: ['IN_PROGRESS'],
  },
  {
    key: 'COMPLETED',
    title: 'Delivered',
    color: 'bg-green-50 border-green-200',
    statuses: ['COMPLETED'],
  },
];

const DATE_FILTERS: { label: string; value: DateRange }[] = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'All Time', value: 'all' },
];

function startOf(range: DateRange): Date | null {
  const now = new Date();
  if (range === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (range === 'week') {
    const d = new Date(now);
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (range === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
  return null;
}

/** Parse notes field — supports both old "[Item]: detail" and new JSON cart format */
function parseOrderNotes(order: ServiceOrder): {
  items: Array<{ name: string; qty: number; price: number }>;
  special: string;
  legacy: string;
  isJson: boolean;
} {
  const notes = order.notes ?? '';
  try {
    const parsed = JSON.parse(notes);
    if (parsed && Array.isArray(parsed.items)) {
      return { items: parsed.items, special: parsed.special ?? '', legacy: '', isJson: true };
    }
  } catch {
    /* not JSON */
  }
  // Legacy "[Item]: detail" format
  const match = notes.match(/^\[([^\]]+)\](: ?(.*))?$/s);
  if (match) return { items: [], special: match[3] ?? '', legacy: match[1], isJson: false };
  return { items: [], special: '', legacy: notes, isJson: false };
}

export function RoomServiceBoard({ orders, rooms }: RoomServiceBoardProps) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('today');

  const filteredOrders = useMemo(() => {
    const cutoff = startOf(dateRange);
    if (!cutoff) return orders;
    return orders.filter((o) => {
      const dateField =
        o.status === 'COMPLETED' && o.completedAt
          ? new Date(o.completedAt)
          : new Date(o.createdAt);
      return dateField >= cutoff;
    });
  }, [orders, dateRange]);

  async function updateStatus(id: string, status: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/room-service/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
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

  const totalDelivered = orders.filter((o) => o.status === 'COMPLETED').length;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Room Service</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {totalDelivered} delivered · {orders.length} total orders on record
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="bg-cyan-600 hover:bg-cyan-700">
          <Plus className="h-4 w-4 mr-2" />
          New Order
        </Button>
      </div>

      {/* Date range filter */}
      <div className="flex items-center gap-2 mb-5 p-2 bg-gray-50 rounded-lg border">
        <span className="text-xs text-gray-500 font-medium mr-1">Show:</span>
        {DATE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setDateRange(f.value)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              dateRange === f.value
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-white hover:shadow-sm'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map((col) => {
          const colOrders = filteredOrders.filter((o) => col.statuses.includes(o.status));
          const totalForCol = orders.filter((o) => col.statuses.includes(o.status)).length;

          return (
            <div key={col.key} className={`rounded-lg border-2 ${col.color} p-3`}>
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="font-semibold text-gray-800">{col.title}</h2>
                <span className="text-xs font-medium bg-white px-2 py-0.5 rounded-full border">
                  {colOrders.length}
                  {dateRange !== 'all' && totalForCol !== colOrders.length && (
                    <span className="text-gray-400"> / {totalForCol}</span>
                  )}
                </span>
              </div>

              <div className="space-y-2">
                {colOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <UtensilsCrossed className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                    <p className="text-sm text-gray-400">No orders</p>
                  </div>
                ) : (
                  colOrders.map((order) => {
                    const { items, special, legacy, isJson } = parseOrderNotes(order);
                    const roomNumber = order.booking?.room?.number;

                    return (
                      <Card key={order.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-3 space-y-2">
                          {/* Room + order time */}
                          <div className="flex items-start justify-between gap-1">
                            <div className="flex items-center gap-1 text-[11px] text-gray-400">
                              <Clock className="h-3 w-3 shrink-0" />
                              <span>
                                {roomNumber ? `Room ${roomNumber} · ` : ''}
                                {order.scheduledDate
                                  ? `Req: ${new Date(order.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                  : new Date(order.createdAt).toLocaleString([], {
                                      dateStyle: 'short',
                                      timeStyle: 'short',
                                    })}
                              </span>
                            </div>
                            {/* Billing badge */}
                            {order.booking ? (
                              <span className="text-[9px] font-semibold bg-cyan-100 text-cyan-700 px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap">
                                🧾 On Bill
                              </span>
                            ) : (
                              <span className="text-[9px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap">
                                ⚠ Not on Bill
                              </span>
                            )}
                          </div>

                          {/* Items */}
                          {isJson ? (
                            <div className="space-y-0.5">
                              {items.map((itm, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs">
                                  <span className="text-gray-700">
                                    <span className="font-medium">{itm.qty}×</span> {itm.name}
                                  </span>
                                  <span className="text-gray-500">${(itm.price * itm.qty).toFixed(2)}</span>
                                </div>
                              ))}
                              {order.totalAmount > 0 && (
                                <div className="flex items-center justify-between text-xs font-bold border-t pt-0.5 mt-0.5 text-cyan-700">
                                  <span>Total</span>
                                  <span>${order.totalAmount.toFixed(2)}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="font-semibold text-sm">{legacy || order.service?.name || 'Room Service'}</p>
                          )}

                          {/* Special notes */}
                          {special && (
                            <p className="text-[11px] text-gray-500 bg-gray-50 rounded px-2 py-1 line-clamp-2">
                              📝 {special}
                            </p>
                          )}

                          {order.status === 'COMPLETED' && order.completedAt && (
                            <div className="flex items-center gap-1 text-[11px] text-green-600">
                              <CalendarCheck className="h-3 w-3 shrink-0" />
                              <span>
                                Delivered:{' '}
                                {new Date(order.completedAt).toLocaleString([], {
                                  dateStyle: 'short',
                                  timeStyle: 'short',
                                })}
                              </span>
                            </div>
                          )}

                          <div className="pt-1">
                            {(order.status === 'PENDING' || order.status === 'CONFIRMED') && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs w-full"
                                disabled={busyId === order.id}
                                onClick={() => updateStatus(order.id, 'IN_PROGRESS')}
                              >
                                {busyId === order.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  'Prepare'
                                )}
                              </Button>
                            )}
                            {order.status === 'IN_PROGRESS' && (
                              <Button
                                size="sm"
                                className="h-7 text-xs w-full bg-green-600 hover:bg-green-700"
                                disabled={busyId === order.id}
                                onClick={() => updateStatus(order.id, 'COMPLETED')}
                              >
                                {busyId === order.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  'Mark Delivered'
                                )}
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      <AddServiceOrderModal
        open={addOpen}
        onOpenChange={setAddOpen}
        rooms={rooms}
        onCreated={() => router.refresh()}
      />
    </div>
  );
}
