'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Plus, Minus, ShoppingCart, UtensilsCrossed } from 'lucide-react';
import { MENU_CATEGORIES } from './menu-manager';

interface Room {
  id: string;
  number: string;
}

interface MenuItem {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  price: number;
  isActive: boolean;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

interface AddServiceOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rooms: Room[];
  onCreated: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  food: 'bg-orange-50',
  beverage: 'bg-blue-50',
  alcohol: 'bg-purple-50',
  dessert: 'bg-pink-50',
  snack: 'bg-yellow-50',
  breakfast: 'bg-amber-50',
  other: 'bg-gray-50',
};

export function AddServiceOrderModal({
  open,
  onOpenChange,
  rooms,
  onCreated,
}: AddServiceOrderModalProps) {
  const [step, setStep] = useState<'menu' | 'confirm'>('menu');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [roomId, setRoomId] = useState('');
  const [special, setSpecial] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  useEffect(() => {
    if (!open) return;
    setStep('menu');
    setCart([]);
    setRoomId('');
    setSpecial('');
    setScheduledDate('');
    setActiveCategory('all');
    fetchMenu();
  }, [open]);

  async function fetchMenu() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/menu');
      const data = await res.json();
      setMenuItems((data.items ?? []).filter((i: MenuItem) => i.isActive));
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  function addToCart(item: MenuItem) {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) {
        return prev.map((c) => (c.id === item.id ? { ...c, qty: c.qty + 1 } : c));
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, qty: 1 }];
    });
  }

  function setQty(id: string, qty: number) {
    if (qty <= 0) {
      setCart((prev) => prev.filter((c) => c.id !== id));
    } else {
      setCart((prev) => prev.map((c) => (c.id === id ? { ...c, qty } : c)));
    }
  }

  const total = cart.reduce((sum, c) => sum + c.price * c.qty, 0);

  async function onSubmit() {
    if (!roomId) { alert('Please select a room'); return; }
    if (cart.length === 0) { alert('Please add at least one item'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/room-service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          items: cart.map((c) => ({ id: c.id, name: c.name, price: c.price, qty: c.qty })),
          special,
          scheduledDate: scheduledDate || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Create failed');
      }
      onOpenChange(false);
      onCreated();
    } catch (err: any) {
      alert(err?.message || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  }

  // Categories that have active menu items
  const presentCategories = MENU_CATEGORIES.filter((cat) =>
    menuItems.some((i) => i.category === cat.value)
  );

  const displayedItems =
    activeCategory === 'all'
      ? menuItems
      : menuItems.filter((i) => i.category === activeCategory);

  const cartQty = (id: string) => cart.find((c) => c.id === id)?.qty ?? 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5 text-cyan-600" />
            New Room Service Order
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Room + time row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rs-room">Room *</Label>
              <select
                id="rs-room"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select room…</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    Room {r.number}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rs-time">Requested Time</Label>
              <Input
                id="rs-time"
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            </div>
          </div>

          {/* Menu */}
          {loading ? (
            <div className="flex items-center justify-center py-10 text-gray-400">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading menu…
            </div>
          ) : menuItems.length === 0 ? (
            <div className="text-center py-8 text-gray-400 border-2 border-dashed rounded-lg">
              <UtensilsCrossed className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="font-medium">Menu is empty</p>
              <p className="text-sm">Go to Room Service → Menu to add items first.</p>
            </div>
          ) : (
            <div>
              {/* Category tabs */}
              <div className="flex gap-1.5 flex-wrap mb-3">
                <button
                  onClick={() => setActiveCategory('all')}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    activeCategory === 'all'
                      ? 'bg-cyan-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                {presentCategories.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setActiveCategory(cat.value)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      activeCategory === cat.value
                        ? 'bg-cyan-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {cat.emoji} {cat.label}
                  </button>
                ))}
              </div>

              {/* Item grid */}
              <div className="grid grid-cols-2 gap-2">
                {displayedItems.map((item) => {
                  const qty = cartQty(item.id);
                  return (
                    <div
                      key={item.id}
                      className={`rounded-lg border p-3 ${
                        CATEGORY_COLORS[item.category] || 'bg-gray-50'
                      } ${qty > 0 ? 'border-cyan-400 ring-1 ring-cyan-300' : 'border-gray-200'}`}
                    >
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <span className="font-medium text-sm leading-tight">{item.name}</span>
                        <span className="text-sm font-bold text-cyan-700 shrink-0">
                          ${item.price.toFixed(2)}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-[11px] text-gray-500 line-clamp-1 mb-2">
                          {item.description}
                        </p>
                      )}
                      {qty === 0 ? (
                        <button
                          onClick={() => addToCart(item)}
                          className="w-full flex items-center justify-center gap-1 text-xs font-medium bg-white hover:bg-cyan-50 border border-gray-200 hover:border-cyan-400 rounded-md py-1.5 transition-colors"
                        >
                          <Plus className="h-3 w-3" /> Add
                        </button>
                      ) : (
                        <div className="flex items-center justify-between bg-white rounded-md border border-cyan-400">
                          <button
                            onClick={() => setQty(item.id, qty - 1)}
                            className="px-2.5 py-1 text-cyan-600 hover:text-red-500 font-bold"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-sm font-bold text-gray-800">{qty}</span>
                          <button
                            onClick={() => setQty(item.id, qty + 1)}
                            className="px-2.5 py-1 text-cyan-600 font-bold"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Cart summary */}
          {cart.length > 0 && (
            <div className="border-t pt-3">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingCart className="h-4 w-4 text-cyan-600" />
                <span className="text-sm font-semibold text-gray-700">
                  Order Summary ({cart.length} item{cart.length > 1 ? 's' : ''})
                </span>
                <span className="ml-auto text-sm font-bold text-cyan-700">
                  Total: ${total.toFixed(2)}
                </span>
              </div>
              <div className="space-y-1">
                {cart.map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-xs text-gray-600">
                    <span>
                      {c.qty}× {c.name}
                    </span>
                    <span>${(c.price * c.qty).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {cart.length > 0 && roomId && (
            <div className="flex items-center gap-2 bg-cyan-50 border border-cyan-200 rounded-lg px-3 py-2 text-xs text-cyan-800">
              <span className="text-base">🧾</span>
              <span>This order will be <strong>added to the bill</strong> for Room {rooms.find(r => r.id === roomId)?.number} and collected at checkout (or paid separately).</span>
            </div>
          )}
          {/* Special requests */}
          <div className="space-y-1.5">
            <Label htmlFor="rs-special">Special Requests / Notes</Label>
            <Textarea
              id="rs-special"
              value={special}
              onChange={(e) => setSpecial(e.target.value)}
              placeholder="Allergies, dietary needs, no onions…"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="border-t pt-3 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={submitting || cart.length === 0 || !roomId}
            className="bg-cyan-600 hover:bg-cyan-700"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <ShoppingCart className="h-4 w-4 mr-2" />
                {roomId
                  ? `Charge to Room ${rooms.find(r => r.id === roomId)?.number ?? ''}${cart.length > 0 ? ` · $${total.toFixed(2)}` : ''}`
                  : `Place Order${cart.length > 0 ? ` · $${total.toFixed(2)}` : ''}`}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
