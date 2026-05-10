# REPORT-2: Availability Calendar System

## Summary

Built a 21-day availability calendar grid for the admin panel, backed by a tenant-scoped API that derives booked nights from active reservations.

## Files created

### 1. `app/api/admin/availability/route.ts`
- `GET` endpoint, `force-dynamic`.
- Auth: `getServerSession(authOptions)` + tenantId guard.
- Query params: `startDate`, `endDate` (strict `YYYY-MM-DD`); validates format and ordering.
- Fetches all rooms for the session's tenant ordered by `number`.
- For each room, includes overlapping bookings with `status in (CONFIRMED, CHECKED_IN)` using a half-open overlap test:
  - `checkInDate < endDate + 1day` AND `checkOutDate > startDate`.
- Expands each booking's range into individual UTC date keys (check-in inclusive, check-out exclusive — standard hotel night model), clamped to the requested window.
- Returns:
  ```json
  {
    "rooms": [
      { "id", "number", "name", "type", "basePrice", "status", "bookedDates": ["YYYY-MM-DD", ...] }
    ],
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD"
  }
  ```

### 2. `app/admin/availability/page.tsx`
- Server component, `force-dynamic`.
- Redirects to `/auth/signin` if no tenantId.
- Renders `<AvailabilityCalendar />` inside a padded container — all interactivity lives in the client component.

### 3. `components/admin/availability-calendar.tsx`
- Client component (`'use client'`).
- Renders 21 days starting from an `anchor` date (defaults to today).
- Header controls: Prev week / Today / Next week (each shifts anchor by ±7 days), and a teal **New Booking** button linking to `/admin/reservations/new`.
- Legend bar shows the five status colors plus a "today" indicator.
- Grid:
  - Left column (256px): room number, type badge (cyan), name, `$basePrice/night`.
  - Top row: sticky header showing day-of-month + 3-letter weekday abbreviation; weekend columns get a gray background; today's column is bolded cyan.
  - Cells: ~32×32px squares (`h-8 w-7` with `m-0.5`) colored by status:
    - Green = available, Red = booked, Yellow = cleaning, Orange = maintenance, Gray = out of order.
    - Today's column gets a `ring-2 ring-cyan-400 ring-offset-1` outline on every cell.
  - Tooltip via `title` attribute: `Room {number} • {long date} — {status}`.
- Status derivation per cell:
  - If the date is in the room's `bookedDates`, it's BOOKED.
  - Otherwise, on today's column we mirror the room's own status (CLEANING / MAINTENANCE / OUT_OF_ORDER / OCCUPIED→BOOKED).
  - Future dates default to AVAILABLE (the API doesn't yet model future cleaning/maintenance windows).
- Data fetching:
  - `useEffect` fires `/api/admin/availability?startDate=…&endDate=…` on mount and whenever the visible window changes; uses `cache: 'no-store'` and a cancellation flag to avoid stale state.
  - Renders a 6-row `<Skeleton>` grid while loading; shows an inline error message on failure.

### 4. `components/admin/admin-layout.tsx` (modified)
- Added `CalendarDays` to the `lucide-react` import.
- Inserted `{ name: 'Availability', href: '/admin/availability', icon: CalendarDays }` in the nav array, immediately after Rooms and before Guests. Active-route highlighting and the top-bar page-title lookup work automatically because they key off the same `navigation` array.

## Design notes

- **Date keys** are computed from UTC on the API side and from local time on the client side. Both produce the same `YYYY-MM-DD` strings as long as the date-only API params are interpreted as UTC midnight, which they are (`new Date('YYYY-MM-DDT00:00:00.000Z')`). Booking iteration uses `setUTCDate` to avoid DST drift.
- **Overlap semantics** treat `checkOutDate` as exclusive (the standard "night of" model), so a booking from Mar 5 → Mar 7 occupies Mar 5 and Mar 6 only.
- **Multi-tenant safety**: room query is scoped by `session.user.tenantId`; bookings are reached through the room relation so they inherit that scope.
- **Performance**: the calendar fetches rooms+bookings in a single Prisma query with a relation filter, so it's one round-trip per window change.

## Verification

- `npx tsc --noEmit` reports zero errors in the new/modified files (one pre-existing error in `app/api/public/[subdomain]/book/route.ts` is unrelated to this work).
- Auth, tenant isolation, and the existing nav-highlight logic all reuse patterns already established in `app/api/admin/rooms/route.ts` and `components/admin/admin-layout.tsx`.

## Not done (intentionally out of scope)

- Click-to-create-booking from a cell (the New Booking button is a static link).
- Per-day room-status overrides (cleaning/maintenance windows beyond today). Would need a new schema concept (e.g., `RoomStatusEvent`) — flagged for a follow-up.
- Server-side rendering of the initial calendar payload — currently hydrates client-side for simplicity. Could be added by reading `searchParams` on the page and passing initial data as a prop.
