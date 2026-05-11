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

interface AddTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rooms: Room[];
  onCreated: () => void;
}

const TASK_TYPES = [
  { value: 'CLEANING',   label: 'Daily Cleaning' },
  { value: 'TURNOVER',   label: 'Room Ready / Turnover' },
  { value: 'DEEP_CLEAN', label: 'Deep Clean' },
  { value: 'LAUNDRY',    label: 'Laundry' },
  { value: 'MAINTENANCE',label: 'Maintenance' },
  { value: 'INSPECTION', label: 'Inspection' },
  { value: 'SETUP',      label: 'Setup' },
];

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export function AddTaskModal({ open, onOpenChange, rooms, onCreated }: AddTaskModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [taskType, setTaskType] = useState('CLEANING');
  const [priority, setPriority] = useState('MEDIUM');
  const [scheduledDate, setScheduledDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState('');

  function reset() {
    setRoomId('');
    setTaskType('CLEANING');
    setPriority('MEDIUM');
    setScheduledDate(new Date().toISOString().slice(0, 10));
    setNotes('');
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!roomId) {
      alert('Please select a room');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/housekeeping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          taskType,
          priority,
          scheduledDate,
          notes: notes || null,
        }),
      });
      if (!res.ok) throw new Error('Create failed');
      reset();
      onOpenChange(false);
      onCreated();
    } catch (err) {
      console.error(err);
      alert('Failed to create task');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Housekeeping Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="room">Room</Label>
            <select
              id="room"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Select a room…</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  Room {r.number}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="taskType">Task Type</Label>
            <select
              id="taskType"
              value={taskType}
              onChange={(e) => setTaskType(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {TASK_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <select
              id="priority"
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
            <Label htmlFor="scheduledDate">Scheduled Date</Label>
            <Input
              id="scheduledDate"
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes…"
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
            <Button type="submit" disabled={submitting} className="bg-teal-600 hover:bg-teal-700">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
