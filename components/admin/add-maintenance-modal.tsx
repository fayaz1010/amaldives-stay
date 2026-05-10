'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

interface Room {
  id: string;
  number: string;
}

interface AddMaintenanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rooms: Room[];
  onCreated: () => void;
}

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const CATEGORIES = ['PLUMBING', 'ELECTRICAL', 'HVAC', 'FURNITURE', 'APPLIANCE', 'GENERAL'];

export function AddMaintenanceModal({
  open,
  onOpenChange,
  rooms,
  onCreated,
}: AddMaintenanceModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [roomId, setRoomId] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [category, setCategory] = useState('GENERAL');

  function reset() {
    setTitle('');
    setDescription('');
    setRoomId('');
    setPriority('MEDIUM');
    setCategory('GENERAL');
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      alert('Please fill in title and description');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          roomId: roomId || null,
          priority,
          category,
        }),
      });
      if (!res.ok) throw new Error('Create failed');
      reset();
      onOpenChange(false);
      onCreated();
    } catch (err) {
      console.error(err);
      alert('Failed to create maintenance request');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report Maintenance Issue</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Leaking faucet"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue…"
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="m-room">Room</Label>
            <select
              id="m-room"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">No specific room (general facility)</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  Room {r.number}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="m-priority">Priority</Label>
              <select
                id="m-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="m-category">Category</Label>
              <select
                id="m-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
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
            <Button type="submit" disabled={submitting} className="bg-teal-600 hover:bg-teal-700">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Report Issue'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
