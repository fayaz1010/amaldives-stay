# Agent 6 Report — Guest Portal (magic-link)

A token-gated, unauthenticated guest portal so checked-in guests can view their
running bill, order room services, and report issues directly to staff.
Admins generate the link from the Reservations board with a single click.

## Files modified

| File | Change |
|---|---|
| `prisma/schema.prisma` | Added `guestToken String? @unique` to `Booking` (line ~210). Ran `npx prisma db push --accept-data-loss` — schema is in sync, Prisma Client regenerated. |
| `components/admin/reservations-board.tsx` | Added `Share2` icon import, `sharingId`/`shareToast` state, `shareGuestPortal()` handler, Share button on every CHECKED_IN card (between Receipt and Quick Pay), and a bottom-right toast renderer. Clipboard fallback uses `window.prompt` if `navigator.clipboard` is blocked. |

## Files created

### Admin API
- `app/api/admin/bookings/[id]/guest-token/route.ts`
  - `POST` — requires `getServerSession(authOptions)` with `tenantId`.
  - Verifies booking belongs to the session tenant.
  - Returns the existing `guestToken` if present, otherwise generates one with `crypto.randomUUID().replace(/-/g, '')` and persists it.
  - Response: `{ token, url: "/guest/<token>" }`.
  - Note: route is mounted under `[id]` (not `[bookingId]`) to avoid Next.js's "different dynamic segment name at same level" conflict with the existing `app/api/admin/bookings/[id]/route.ts`.

### Guest API (no auth — token validates)
- `app/api/guest/[token]/route.ts`
  - `GET` — `prisma.booking.findUnique({ where: { guestToken } })` with `room`, `property`, `guest.guestProfile`, `payments`, and last 10 `serviceOrders` (with `service` info). 404 on miss. Response is fully serialised through `JSON.parse(JSON.stringify(...))`.
- `app/api/guest/[token]/services/route.ts`
  - `GET` — resolves `tenantId` from booking token, returns all active services for that tenant (`id, name, description, price, category`). All active services are returned; the frontend handles display.
- `app/api/guest/[token]/order/route.ts`
  - `POST` `{ items: [{serviceId, quantity}], notes? }`. Requires `booking.status === 'CHECKED_IN'`. Validates all `serviceId`s exist and are active for the tenant. Creates one `ServiceOrder` per item (`tenantId`, `bookingId`, `roomId`, `guestId` — required by schema —, `serviceId`, `quantity`, `totalAmount = price × qty`, `status: 'PENDING'`, `scheduledDate: now`). Returns `{ success, orders }`.
- `app/api/guest/[token]/report/route.ts`
  - `POST` `{ category, description }`. Creates a `StaffTask` with `source: 'GUEST_PORTAL'`, `category: 'MAINTENANCE'`, `priority: 'HIGH'`, `status: 'PENDING'`, `title: "Guest Report: <category> - Room <n>"`, and the guest's description. (The `StaffTask` model in the schema has no `roomId` column, so the room number is folded into the title for visibility.)

### Guest UI
- `app/guest/[token]/page.tsx` — `'use client'`, fully client-side fetch.
  - Mobile-first, max-w-2xl, sticky top bar with "**amaldives** STAY" wordmark in teal `#14B8A6` plus Room number badge.
  - Greeting from `guest.guestProfile.firstName || guest.name`.
  - Three large tabs (h-12, teal active state) with lucide icons:
    1. **My Bill** — Room charge (`basePrice × nights`), Services list (name, qty, status, amount), platform fee, grand total. Separate Payments card with method/date/status badge and balance-due line (red if owing, green if settled).
    2. **Room Service** — Lazy-loads services on tab click. Grid of cards with +/− stepper. Cart summary card (teal border) shows line items, optional notes textarea, total, and an Order Now button (min-h-12). Disabled with explanatory text when not CHECKED_IN. Refreshes booking after success so the new orders show on the Bill tab.
    3. **Get Help** — Category select (Maintenance / Housekeeping / Noise Complaint / Lost Item / Other), description textarea, big Send-to-staff button. Inline success / error feedback.
  - Inline toast (centered bottom, 3s) for order/report feedback.
  - Loading skeleton and "Link expired or invalid" error state.

## Manual verification

- TypeScript: `npx tsc --noEmit` shows only the four pre-existing errors in `payments/route.ts`, `public/[subdomain]/book/route.ts`, `public/[subdomain]/calendar.ics/route.ts`, and `room-service-board.tsx`. **No errors in any file I created or modified.**
- Prisma: `prisma db push` succeeded with the new `@unique` constraint; client regenerated.

## Notes / deviations from the spec

1. **Admin route mounted at `[id]/guest-token`, not `[bookingId]/guest-token`** — Next.js disallows two different dynamic segment names at the same path level, and `app/api/admin/bookings/[id]/route.ts` already exists.
2. **`StaffTask.roomId` not in schema** — spec mentioned it, but the model has no such column. Room number is included in the task title so staff still see it on their board. `bookingId` is set, so the staff board can still join to the room via the booking.
3. **`ServiceOrder.guestId` is required** in the schema — set to `booking.guestId` from the token lookup.
4. **Token is reused if one already exists** for a booking so re-sharing yields the same URL instead of invalidating prior links.
