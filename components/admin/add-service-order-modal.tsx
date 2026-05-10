'use client';

import { useState } from 'react';
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
import { Loader2 } from 'lucide-react';

interface Room {
  id: string;
  number: string;
}

interface AddServiceOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rooms: Room[];
  onCreated: () => void;
}

const SERVICE_ITEMS = [
  'Breakfast',
  'Lunch',
  'Dinner',
  'Beverages',
  'Snacks',
  'Extra Towels / Linen',
  'Toiletries',
  'Iron & Ironing Board',
  'Extra Pillow / Blanket',
  'In-room Dining',
  'Late Checkout Request',
  'Airport Transfer',
  'Laundry',
  'Other',
];

export function AddServiceOrderModal({
  open,
  onOpenChange,
  rooms,
  onCreated,
}: AddServiceOrderModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [item, setItem] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');

  function reset() {
    setRoomId('');
    setItem('');
    setQuantity('1');
    setNotes('');
    setScheduledDate('');
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!roomId) {
      alert('Please select a room');
      return;
    }
    if (!item.trim()) {
      alert('Please describe the service request');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/room-service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          quantity: Number(quantity) || 1,
          notes: `[${item}]${notes ? ': ' + notes : ''}`,
          scheduledDate: scheduledDate || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Create failed');
      }
      reset();
      onOpenChange(false);
      onCreated();
    } catch (err: any) {
      console.error(err);
      alert(err?.message || 'Failed to create service order');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Room Service Request</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rs-room">Room *</Label>
            <select
              id="rs-room"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              required
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

          <div className="space-y-2">
            <Label htmlFor="rs-item">Service / Item *</Label>
            <select
              id="rs-item"
              value={item}
              onChange={(e) => setItem(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Select item…</option>
              {SERVICE_ITEMS.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="rs-qty">Quantity</Label>
              <Input
                id="rs-qty"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rs-time">Requested Time</Label>
              <Input
                id="rs-time"
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rs-notes">Notes / Special requests</Label>
            <Textarea
              id="rs-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Dietary requirements, preferences…"
              rows={3}
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
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Order'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
