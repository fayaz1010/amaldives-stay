'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { GroupedRoomType } from '@/components/admin/rooms-manager';

const ROOM_TYPES = [
  { value: 'STANDARD', label: 'Standard' },
  { value: 'DELUXE', label: 'Deluxe' },
  { value: 'SUITE', label: 'Suite' },
  { value: 'FAMILY', label: 'Family' },
  { value: 'DORMITORY', label: 'Dormitory' },
];

const AMENITY_OPTIONS = [
  'Air Conditioning',
  'Free WiFi',
  'Sea View',
  'Private Balcony',
  'Flat Screen TV',
  'Minibar',
  'Coffee Machine',
  'En-suite Bathroom',
  'Private Terrace',
  'Jacuzzi',
  'Room Service',
  'Safe',
];

interface AddRoomModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  prefillType?: GroupedRoomType | null;
  /** When set the modal is in edit-type mode — updates all rooms in the group */
  editGroup?: GroupedRoomType | null;
}

type FormState = {
  typeName: string;
  type: string;
  description: string;
  basePrice: string;
  capacity: string;
  bedType: string;
  size: string;
  amenities: string[];
  roomNumbers: string;
  photoUrl: string;
};

const emptyForm: FormState = {
  typeName: '',
  type: 'STANDARD',
  description: '',
  basePrice: '',
  capacity: '2',
  bedType: '',
  size: '',
  amenities: [],
  roomNumbers: '',
  photoUrl: '',
};

export function AddRoomModal({
  open,
  onOpenChange,
  propertyId,
  prefillType,
  editGroup,
}: AddRoomModalProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  const isEditMode = Boolean(editGroup);
  const isAddUnit = Boolean(prefillType) && !editGroup;

  useEffect(() => {
    if (!open) return;
    setError(null);
    setProgress({ done: 0, total: 0 });
    const source = editGroup ?? prefillType;
    if (source) {
      setForm({
        typeName: source.typeName,
        type: source.type,
        description: source.description,
        basePrice: String(source.basePrice ?? ''),
        capacity: String(source.capacity ?? 2),
        bedType: source.bedType,
        size: source.size != null ? String(source.size) : '',
        amenities: [...source.amenities],
        roomNumbers: '',
        photoUrl: source.images?.[0] ?? '',
      });
    } else {
      setForm(emptyForm);
    }
  }, [open, prefillType, editGroup]);

  const numbers = useMemo(
    () =>
      form.roomNumbers
        .split(',')
        .map((n) => n.trim())
        .filter(Boolean),
    [form.roomNumbers]
  );

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleAmenity = (a: string) => {
    setForm((f) => ({
      ...f,
      amenities: f.amenities.includes(a)
        ? f.amenities.filter((x) => x !== a)
        : [...f.amenities, a],
    }));
  };

  const validate = (): string | null => {
    if (!propertyId) return 'No active property found. Set up a property first.';
    if (!form.typeName.trim()) return 'Room Type Name is required.';
    if (!form.type) return 'Room Type is required.';
    const basePrice = Number(form.basePrice);
    if (!form.basePrice || Number.isNaN(basePrice) || basePrice < 0)
      return 'Base Price must be a non-negative number.';
    const capacity = Number(form.capacity);
    if (!form.capacity || Number.isNaN(capacity) || capacity < 1)
      return 'Capacity must be at least 1.';
    if (!isEditMode && numbers.length === 0)
      return 'Enter at least one room number (comma-separated).';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate();
    if (v) { setError(v); return; }
    setError(null);
    setSubmitting(true);

    const sizeVal = form.size ? Number(form.size) : null;
    const photoUrl = form.photoUrl.trim();
    const typePayload = {
      name: form.typeName.trim(),
      type: form.type,
      description: form.description.trim() || null,
      capacity: Number(form.capacity),
      basePrice: Number(form.basePrice),
      bedType: form.bedType.trim() || null,
      size: sizeVal,
      amenities: form.amenities,
      images: photoUrl ? [photoUrl] : [],
    };

    try {
      if (isEditMode && editGroup) {
        // PATCH every room in the group with updated type data
        const rooms = editGroup.rooms;
        setProgress({ done: 0, total: rooms.length });
        let done = 0;
        for (const room of rooms) {
          const res = await fetch(`/api/admin/rooms/${room.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(typePayload),
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body?.error || `Failed to update room ${room.number} (HTTP ${res.status})`);
          }
          done += 1;
          setProgress({ done, total: rooms.length });
        }
      } else {
        // Create new rooms
        setProgress({ done: 0, total: numbers.length });
        let done = 0;
        for (const number of numbers) {
          const res = await fetch('/api/admin/rooms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ propertyId, number, ...typePayload }),
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body?.error || `Failed to create room ${number} (HTTP ${res.status})`);
          }
          done += 1;
          setProgress({ done, total: numbers.length });
        }
      }
      window.location.reload();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save rooms');
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode
              ? `Edit Room Type: "${editGroup?.typeName}"`
              : isAddUnit
              ? `Add Units to "${prefillType?.typeName}"`
              : 'Add Room Type'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? `Update details for all ${editGroup?.rooms.length} unit${(editGroup?.rooms.length ?? 0) !== 1 ? 's' : ''} in this type.`
              : isAddUnit
              ? 'Add additional room units that share the same type details.'
              : 'Create a new room type and its initial units. All fields apply to every unit you add.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="typeName">Room Type Name</Label>
              <Input
                id="typeName"
                placeholder="e.g. Ocean View Deluxe"
                value={form.typeName}
                onChange={(e) => update('typeName', e.target.value)}
                disabled={isAddUnit}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Room Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) => update('type', v)}
                disabled={isAddUnit}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {ROOM_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="basePrice">Base Price / Night (USD)</Label>
              <Input
                id="basePrice"
                type="number"
                min="0"
                step="0.01"
                placeholder="120"
                value={form.basePrice}
                onChange={(e) => update('basePrice', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Spacious room with private balcony and sea views..."
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity / Max Guests</Label>
              <Input
                id="capacity"
                type="number"
                min="1"
                value={form.capacity}
                onChange={(e) => update('capacity', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bedType">Bed Type</Label>
              <Input
                id="bedType"
                placeholder="e.g. 1 King Bed"
                value={form.bedType}
                onChange={(e) => update('bedType', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="size">Room Size (m²)</Label>
              <Input
                id="size"
                type="number"
                min="0"
                placeholder="32"
                value={form.size}
                onChange={(e) => update('size', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="photoUrl">Photo URL (optional)</Label>
              <Input
                id="photoUrl"
                placeholder="https://..."
                value={form.photoUrl}
                onChange={(e) => update('photoUrl', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Amenities</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-md border p-3">
              {AMENITY_OPTIONS.map((a) => {
                const id = `amenity-${a.replace(/\s+/g, '-')}`;
                const checked = form.amenities.includes(a);
                return (
                  <label
                    key={a}
                    htmlFor={id}
                    className="flex items-center gap-2 text-sm cursor-pointer select-none"
                  >
                    <Checkbox
                      id={id}
                      checked={checked}
                      onCheckedChange={() => toggleAmenity(a)}
                    />
                    <span>{a}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {!isEditMode && (
            <div className="space-y-2">
              <Label htmlFor="roomNumbers">Room Numbers</Label>
              <Input
                id="roomNumbers"
                placeholder="101, 102, 103"
                value={form.roomNumbers}
                onChange={(e) => update('roomNumbers', e.target.value)}
                required={!isEditMode}
              />
              <p className="text-xs text-gray-500">
                Comma-separated. One unit will be created per number.
                {numbers.length > 0 ? ` (${numbers.length} unit${numbers.length === 1 ? '' : 's'})` : ''}
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {submitting && progress.total > 0 && (
            <div className="rounded-md bg-cyan-50 border border-cyan-200 px-3 py-2">
              <div className="flex items-center justify-between text-sm text-cyan-800 mb-1">
                <span>{isEditMode ? 'Updating rooms...' : 'Creating rooms...'}</span>
                <span>
                  {progress.done} / {progress.total}
                </span>
              </div>
              <div className="h-1.5 w-full bg-cyan-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-500 transition-all"
                  style={{
                    width: `${(progress.done / progress.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

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
              className="bg-cyan-500 hover:bg-cyan-600 text-white"
              disabled={submitting}
            >
              {submitting
                ? 'Saving...'
                : isEditMode
                  ? `Save Changes (${editGroup?.rooms.length} unit${(editGroup?.rooms.length ?? 0) !== 1 ? 's' : ''})`
                  : isAddUnit
                    ? 'Add Units'
                    : 'Create Room Type'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
