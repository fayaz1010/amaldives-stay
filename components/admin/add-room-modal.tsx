'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import imageCompression from 'browser-image-compression';
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
import { ImageIcon, X, Upload, Loader2 } from 'lucide-react';
import type { GroupedRoomType } from '@/components/admin/rooms-manager';

const ENUM_ROOM_TYPES = ['STANDARD', 'DELUXE', 'SUITE', 'FAMILY', 'DORMITORY'] as const;

/** Pretty label for a stored enum value, e.g. "DELUXE" -> "Deluxe". */
function prettifyType(t: string): string {
  if (!t) return '';
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

/** Map a free-text category label back to a valid RoomType enum for the DB.
 *  Falls back to STANDARD for custom labels (e.g. "Sea View", "Twin"). */
function labelToEnum(label: string): string {
  const up = (label || '').trim().toUpperCase();
  return (ENUM_ROOM_TYPES as readonly string[]).includes(up) ? up : 'STANDARD';
}

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
  /** Per-tenant room-type category suggestions for the combobox. */
  roomTypeOptions?: string[];
}

type FormState = {
  typeName: string;
  type: string;
  typeLabel: string;
  description: string;
  basePrice: string;
  capacity: string;
  bedType: string;
  size: string;
  amenities: string[];
  roomNumbers: string;
  images: string[];
};

const emptyForm: FormState = {
  typeName: '',
  type: 'STANDARD',
  typeLabel: '',
  description: '',
  basePrice: '',
  capacity: '2',
  bedType: '',
  size: '',
  amenities: [],
  roomNumbers: '',
  images: [],
};


function UnitEditor({ rooms }: { rooms: { id: string; number: string; status: string }[] }) {
  const [editing, setEditing] = useState<{ id: string; number: string } | null>(null);
  const [number, setNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [localRooms, setLocalRooms] = useState(rooms);

  const openEdit = (r: { id: string; number: string }) => {
    setEditing(r);
    setNumber(r.number);
    setConfirmDelete(false);
  };

  const handleSave = async () => {
    if (!editing || !number.trim()) return;
    setSaving(true);
    await fetch(`/api/admin/rooms/${editing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: number.trim() }),
    });
    setLocalRooms((rs) => rs.map((r) => r.id === editing.id ? { ...r, number: number.trim() } : r));
    setSaving(false);
    setEditing(null);
  };

  const handleDelete = async () => {
    if (!editing) return;
    setDeleting(true);
    await fetch(`/api/admin/rooms/${editing.id}`, { method: 'DELETE' });
    setLocalRooms((rs) => rs.filter((r) => r.id !== editing.id));
    setDeleting(false);
    setEditing(null);
  };

  return (
    <div className="space-y-2">
      <Label>Current Units ({localRooms.length})</Label>
      <div className="flex flex-wrap gap-1.5 rounded-md border p-3 bg-gray-50">
        {localRooms.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => openEdit(r)}
            className={`inline-flex items-center rounded px-2 py-1 text-xs font-semibold border cursor-pointer hover:opacity-80 transition-opacity ${
              editing?.id === r.id
                ? 'bg-cyan-500 text-white border-cyan-600'
                : 'bg-cyan-100 text-cyan-800 border-cyan-200'
            }`}
          >
            {r.number}
          </button>
        ))}
      </div>

      {editing && (
        <div className="rounded-md border border-cyan-200 bg-cyan-50 p-3 space-y-2">
          <p className="text-xs font-medium text-cyan-800">Editing unit: <strong>{editing.number}</strong></p>
          <input
            className="w-full border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save'}
            </Button>
            {!confirmDelete ? (
              <Button type="button" size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            ) : (
              <Button type="button" size="sm" variant="outline" className="text-red-600 border-red-300 bg-red-50" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Confirm delete'}
              </Button>
            )}
            <Button type="button" size="sm" variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      <p className="text-xs text-gray-400">Click a unit number to edit or delete it. Saving type details below updates price, capacity, etc. for all units.</p>
    </div>
  );
}

export function AddRoomModal({
  open,
  onOpenChange,
  propertyId,
  prefillType,
  editGroup,
  roomTypeOptions = [],
}: AddRoomModalProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        typeLabel: source.typeLabel || prettifyType(source.type),
        description: source.description,
        basePrice: String(source.basePrice ?? ''),
        capacity: String(source.capacity ?? 2),
        bedType: source.bedType,
        size: source.size != null ? String(source.size) : '',
        amenities: [...source.amenities],
        roomNumbers: '',
        images: source.images ?? [],
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
    if (!form.typeLabel.trim()) return 'Room Type is required.';
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    setError(null);

    const newUrls: string[] = [];

    for (const file of files) {
      try {
        // Compress to max 0.5 MB / 1920 px before sending — stays well under Vercel's 4.5 MB limit
        const compressed = await imageCompression(file, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          fileType: 'image/jpeg',
        });

        const fd = new FormData();
        fd.append('files', compressed, `photo-${Date.now()}.jpg`);

        const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
        const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        if (!res.ok) throw new Error(data.error ?? 'Upload failed');
        newUrls.push(...(data.urls as string[]));
      } catch (err: any) {
        setError(err.message ?? 'Upload failed');
        break;
      }
    }

    if (newUrls.length) setForm((f) => ({ ...f, images: [...f.images, ...newUrls] }));
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (url: string) => {
    setForm((f) => ({ ...f, images: f.images.filter((u) => u !== url) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate();
    if (v) { setError(v); return; }
    setError(null);
    setSubmitting(true);

    const sizeVal = form.size ? Number(form.size) : null;
    const typePayload = {
      name: form.typeName.trim(),
      type: labelToEnum(form.typeLabel),
      typeLabel: form.typeLabel.trim(),
      description: form.description.trim() || null,
      capacity: Number(form.capacity),
      basePrice: Number(form.basePrice),
      bedType: form.bedType.trim() || null,
      size: sizeVal,
      amenities: form.amenities,
      images: form.images,
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
              <Label htmlFor="typeLabel">Room Type</Label>
              <Input
                id="typeLabel"
                list="room-type-options"
                placeholder="e.g. Sea View, Twin, Suite…"
                value={form.typeLabel}
                onChange={(e) => update('typeLabel', e.target.value)}
                disabled={isAddUnit}
                autoComplete="off"
                required
              />
              <datalist id="room-type-options">
                {roomTypeOptions.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
              <p className="text-xs text-gray-400">
                Pick an existing category or type a new one — it&apos;s saved for your property.
              </p>
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

            <div className="space-y-2 md:col-span-2">
              <Label>Room Photos</Label>

              {/* Photo grid */}
              {form.images.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-2">
                  {form.images.map((url, i) => (
                    <div key={url} className="relative group rounded-lg overflow-hidden border bg-gray-100 aspect-video">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(url)}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                      {i === 0 && (
                        <span className="absolute bottom-1 left-1 text-[9px] bg-cyan-600 text-white px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide">
                          Cover
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Upload zone */}
              <div
                onClick={() => !uploading && fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl py-5 cursor-pointer transition-colors ${
                  uploading
                    ? 'border-cyan-300 bg-cyan-50'
                    : 'border-gray-300 hover:border-cyan-400 hover:bg-cyan-50/50'
                }`}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-6 w-6 text-cyan-500 animate-spin" />
                    <p className="text-sm text-cyan-600 font-medium">Compressing &amp; uploading…</p>
                  </>
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-gray-400" />
                    <p className="text-sm text-gray-500">
                      <span className="text-cyan-600 font-medium">Click to upload</span> photos
                    </p>
                    <p className="text-xs text-gray-400">JPEG, PNG or WebP · auto-compressed · multiple OK</p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileSelect}
              />
              {form.images.length === 0 && (
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <ImageIcon className="h-3.5 w-3.5" /> First uploaded photo becomes the cover image.
                </p>
              )}
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

          {isEditMode && editGroup && editGroup.rooms.length > 0 ? (
            <UnitEditor rooms={editGroup.rooms} />
          ) : !isEditMode ? (
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
          ) : null}

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
