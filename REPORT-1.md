# REPORT-1 — Rooms Admin Rewrite

OTA-quality rebuild of the admin Rooms area for **amaldives STAY**.

## Files

| Path | Kind | Purpose |
|---|---|---|
| `app/admin/rooms/page.tsx` | Server component | Fetches rooms + active property, groups rooms by `name` (room type), passes data to client manager. |
| `components/admin/rooms-manager.tsx` | Client component | Page shell, summary bar, room-type grid, add/edit modal wiring. Exports `GroupedRoomType`. |
| `components/admin/add-room-modal.tsx` | Client component | Dialog for creating a room type and its initial units (or adding more units to an existing type). Iterates POST `/api/admin/rooms` per room number with progress UI. |
| `app/api/admin/rooms/[id]/route.ts` | Route handler | `PATCH` to update a single room, scoped to `session.user.tenantId`. |

## `app/admin/rooms/page.tsx` (server)

- `getServerSession(authOptions)` → redirect to `/auth/signin` if no `tenantId`.
- Parallel `prisma.room.findMany` + `prisma.property.findFirst` (first active property — used as default for new rooms).
- Rooms grouped by `room.name`. Each group carries shared specs (`type`, `basePrice`, `capacity`, `bedType`, `size`, `amenities`, `description`, `images`) plus the list of unit `{ id, number, status }`.
- Renders `<RoomsManager groupedRoomTypes={...} propertyId={...} />`.
- `export const dynamic = 'force-dynamic'` because session-bound.

## `components/admin/rooms-manager.tsx`

- **Header**: "Room Management" title + subtitle, cyan **Add Room Type** button (`bg-cyan-500 hover:bg-cyan-600`).
- **Summary bar**: 3-cell card — `X room types | Y total units | Z available today` (computed from the AVAILABLE rooms in each group).
- **Empty state**: dashed card with primary CTA when no room types exist.
- **Grid**: `grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6` of `RoomTypeCard`s.
- **Card**:
  - Gradient header `bg-gradient-to-br from-cyan-400 to-teal-500` `h-40` with optional cover image overlay, type chip (uppercase), price badge (`$X /night`), and the type name overlay.
  - Body: bold large room name, 2-line clamped description, specs row with bed / capacity / size icons (`lucide-react`), price callout in cyan, amenities chips (first 5 + "+N more"), availability strip — colored squares per unit (`green=AVAILABLE red=OCCUPIED yellow=CLEANING orange=MAINTENANCE gray=OUT_OF_ORDER`) labelled with the room number and a status legend.
  - Footer: outline **Edit Type** + cyan **Add Unit** (opens the modal pre-filled with the type).

## `components/admin/add-room-modal.tsx`

shadcn `Dialog` with full form:

- **Type Name** (locked when adding units to an existing type)
- **Room Type** select — `STANDARD / DELUXE / SUITE / FAMILY / DORMITORY`
- **Description** textarea
- **Base Price / Night** number
- **Capacity / Max Guests** number
- **Bed Type** text
- **Room Size (m²)** number
- **Amenities** checkbox list of all 12 specified options
- **Room Numbers** comma-separated text (e.g. `101, 102, 103`) — live count shown
- **Photo URL** (optional)

Submit flow:
1. Client-side validation (type name, base price ≥ 0, capacity ≥ 1, ≥1 room number, propertyId present).
2. For each parsed room number, `POST /api/admin/rooms` with `{ propertyId, number, name, type, description, capacity, basePrice, bedType, size, amenities, images }`.
3. Live progress bar (`done / total`).
4. On success: `window.location.reload()` — server component re-fetches and re-groups.
5. On failure: error banner, modal stays open, user can retry.

Cancel/close blocked while a submission is in flight.

## `app/api/admin/rooms/[id]/route.ts`

`PATCH` handler exactly as specified — auth check via `session.user.tenantId`, update where `{ id, tenantId }` (so cross-tenant edits are impossible), returns `{ room }`.

## Integration notes

- Reuses existing `POST /api/admin/rooms` (already auth+role-gated to `TENANT_ADMIN` / `MANAGER`); the modal does not need a new bulk endpoint.
- `propertyId` defaults to the first active property for the tenant; surfaced into the modal so each created room is correctly attached.
- Type-checked: `npx tsc --noEmit` reports zero errors in any of the four new files. (Two pre-existing errors elsewhere — `app/admin/reservations/new/page.tsx` missing `new-booking-form`, and a Prisma `GuestProfile` create-input narrowing issue in `app/api/public/[subdomain]/book/route.ts` — are unrelated to this task.)

## Follow-ups (not done)

- "Edit Type" currently shows a placeholder alert — wiring it to a real edit modal that PATCHes every unit of a type via the new `[id]` route is the natural next step.
- Photo upload (instead of pasted URL) and per-unit overrides (price / status) would be the next OTA-grade feature.
