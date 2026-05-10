'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
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
import { Plus, Pencil, Trash2, Loader2, UtensilsCrossed, ToggleLeft, ToggleRight } from 'lucide-react';

export const MENU_CATEGORIES = [
  { value: 'food', label: 'Food', emoji: '🍽️' },
  { value: 'beverage', label: 'Beverage', emoji: '🥤' },
  { value: 'alcohol', label: 'Alcohol', emoji: '🍺' },
  { value: 'dessert', label: 'Dessert', emoji: '🍰' },
  { value: 'snack', label: 'Snack', emoji: '🍿' },
  { value: 'breakfast', label: 'Breakfast', emoji: '🥐' },
  { value: 'other', label: 'Other', emoji: '📦' },
];

const CATEGORY_COLORS: Record<string, string> = {
  food: 'bg-orange-50 border-orange-200 text-orange-700',
  beverage: 'bg-blue-50 border-blue-200 text-blue-700',
  alcohol: 'bg-purple-50 border-purple-200 text-purple-700',
  dessert: 'bg-pink-50 border-pink-200 text-pink-700',
  snack: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  breakfast: 'bg-amber-50 border-amber-200 text-amber-700',
  other: 'bg-gray-50 border-gray-200 text-gray-600',
};

interface MenuItem {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  price: number;
  isActive: boolean;
}

interface MenuManagerProps {
  items: MenuItem[];
}

function ItemModal({
  open,
  onOpenChange,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: MenuItem | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [category, setCategory] = useState(initial?.category ?? 'food');
  const [price, setPrice] = useState(initial?.price?.toString() ?? '');
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [saving, setSaving] = useState(false);

  // Reset when modal opens
  const handleOpen = (o: boolean) => {
    if (o) {
      setName(initial?.name ?? '');
      setDescription(initial?.description ?? '');
      setCategory(initial?.category ?? 'food');
      setPrice(initial?.price?.toString() ?? '');
      setIsActive(initial?.isActive ?? true);
    }
    onOpenChange(o);
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !price) return;
    setSaving(true);
    try {
      const url = initial ? `/api/admin/menu/${initial.id}` : '/api/admin/menu';
      const res = await fetch(url, {
        method: initial ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, category, price: Number(price), isActive }),
      });
      if (!res.ok) throw new Error('Save failed');
      onOpenChange(false);
      onSaved();
    } catch (err) {
      alert('Failed to save menu item');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit Menu Item' : 'Add Menu Item'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mi-name">Item Name *</Label>
            <Input
              id="mi-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cheeseburger"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="mi-cat">Category *</Label>
              <select
                id="mi-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {MENU_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.emoji} {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mi-price">Price (USD) *</Label>
              <Input
                id="mi-price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
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
              placeholder="Ingredients, allergens, portion size…"
              rows={2}
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className="text-gray-500 hover:text-gray-700"
            >
              {isActive ? (
                <ToggleRight className="h-6 w-6 text-green-600" />
              ) : (
                <ToggleLeft className="h-6 w-6 text-gray-400" />
              )}
            </button>
            <span className="text-sm text-gray-600">
              {isActive ? 'Available on menu' : 'Hidden from menu'}
            </span>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-cyan-600 hover:bg-cyan-700">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : initial ? 'Save Changes' : 'Add Item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function MenuManager({ items }: MenuManagerProps) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function deleteItem(id: string) {
    if (!confirm('Delete this menu item?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/menu/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      router.refresh();
    } catch {
      alert('Failed to delete item');
    } finally {
      setDeletingId(null);
    }
  }

  async function toggleActive(item: MenuItem) {
    setTogglingId(item.id);
    try {
      const res = await fetch(`/api/admin/menu/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      alert('Failed to update item');
    } finally {
      setTogglingId(null);
    }
  }

  // Group items by category
  const grouped = MENU_CATEGORIES.reduce((acc, cat) => {
    const catItems = items.filter((i) => i.category === cat.value);
    if (catItems.length > 0) acc.push({ ...cat, items: catItems });
    return acc;
  }, [] as Array<(typeof MENU_CATEGORIES)[0] & { items: MenuItem[] }>);

  const uncategorised = items.filter(
    (i) => !MENU_CATEGORIES.find((c) => c.value === i.category)
  );
  if (uncategorised.length > 0) {
    grouped.push({ value: 'other', label: 'Other', emoji: '📦', items: uncategorised });
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Room Service Menu</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {items.filter((i) => i.isActive).length} active items ·{' '}
            {items.length} total
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="bg-cyan-600 hover:bg-cyan-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <UtensilsCrossed className="h-10 w-10 mx-auto text-gray-300 mb-3" />
            <p className="text-lg font-medium mb-1">Menu is empty</p>
            <p className="text-sm">Add your first item — burgers, coke, anything guests can order.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map((cat) => (
            <div key={cat.value}>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
                <span className="text-gray-300 font-normal">({cat.items.length})</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {cat.items.map((item) => (
                  <Card
                    key={item.id}
                    className={`transition-opacity ${item.isActive ? '' : 'opacity-50'}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm truncate">{item.name}</span>
                            <span
                              className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${
                                CATEGORY_COLORS[item.category] || CATEGORY_COLORS.other
                              }`}
                            >
                              {cat.emoji}
                            </span>
                          </div>
                          {item.description && (
                            <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                              {item.description}
                            </p>
                          )}
                          <p className="text-base font-bold text-cyan-700">
                            ${item.price.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3 pt-2 border-t">
                        <button
                          onClick={() => toggleActive(item)}
                          disabled={togglingId === item.id}
                          className="text-gray-400 hover:text-gray-600"
                          title={item.isActive ? 'Hide from menu' : 'Show on menu'}
                        >
                          {togglingId === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : item.isActive ? (
                            <ToggleRight className="h-5 w-5 text-green-500" />
                          ) : (
                            <ToggleLeft className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                        <span className="text-xs text-gray-400 flex-1">
                          {item.isActive ? 'Available' : 'Hidden'}
                        </span>
                        <button
                          onClick={() => setEditItem(item)}
                          className="text-gray-400 hover:text-blue-600 p-1"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteItem(item.id)}
                          disabled={deletingId === item.id}
                          className="text-gray-400 hover:text-red-600 p-1"
                          title="Delete"
                        >
                          {deletingId === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <ItemModal
        open={addOpen}
        onOpenChange={setAddOpen}
        initial={null}
        onSaved={() => router.refresh()}
      />
      <ItemModal
        open={!!editItem}
        onOpenChange={(o) => !o && setEditItem(null)}
        initial={editItem}
        onSaved={() => {
          setEditItem(null);
          router.refresh();
        }}
      />
    </div>
  );
}
