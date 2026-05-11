# Agent 4 — Reporting Dashboard

## Files created / modified

1. **CREATED** `app/api/admin/reports/summary/route.ts`
   - `GET` handler, `export const dynamic = 'force-dynamic'`
   - Auth via `getServerSession(authOptions)`, requires `session.user.tenantId`
   - Query params: `?year=YYYY&month=M` (defaults to current UTC month)
   - Queries `prisma.booking.findMany` filtered by `tenantId`, `checkInDate` in period, status in `['CONFIRMED','CHECKED_IN','CHECKED_OUT']`, including `room { type, basePrice }`, `serviceOrders { totalAmount }`, `payments { amount, status }`
   - Computes: `totalRevenue`, `serviceRevenue`, `paidAmount` (only COMPLETED payments), `occupiedNights` (clipped to period), `occupancy`, `ADR`, `RevPAR`
   - Groups by `source` (normalized to `DIRECT | BOOKING_COM | AGODA | AIRBNB | OTHER`)
   - Builds `dailyRevenue` array (one entry per day of month)
   - Groups by `room.type` for top room types breakdown
   - Calls `prisma.room.count({ where: { tenantId } })` for capacity
   - Pulls previous month and returns `comparison` with percent deltas

2. **REPLACED** `app/admin/reports/page.tsx`
   - Server component, `export const dynamic = 'force-dynamic'`
   - Auth check redirects to `/auth/signin` when no `tenantId`
   - Runs the same aggregation logic as the API directly against `prisma` for current month
   - Passes hydrated `initialData` to `<ReportsDashboard />` so the page renders without a client fetch on first paint

3. **CREATED** `components/admin/reports-dashboard.tsx`
   - `'use client'` component using recharts (`BarChart`, `Bar`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `ResponsiveContainer`, `PieChart`, `Pie`, `Cell`, `Legend`)
   - Header with month label `‹ May 2026 ›` and prev/next buttons that call `/api/admin/reports/summary?year=…&month=…`
   - 4 KPI stat cards (Revenue, Occupancy, ADR, RevPAR) on `grid-cols-2 md:grid-cols-4`, each with a teal icon and a `ChangeChip` (TrendingUp/TrendingDown, green/red) showing percent change vs previous month
   - Daily Revenue `BarChart` (height 250, teal `#14B8A6`, rounded top corners, inside `ResponsiveContainer width="100%"`)
   - Booking Sources `PieChart` with colors `['#14B8A6','#0EA5E9','#8B5CF6','#F59E0B','#6B7280']` and legend with percentages
   - Top Room Types table (columns: Room Type | Nights | Revenue | Occ %, sorted by revenue desc)
   - Export CSV button (builds CSV from `dailyRevenue` + a summary block, triggers blob download)
   - Skeleton loading state on period change; numbers formatted with `toLocaleString`
   - Mobile-first: 2-col on small screens, 4-col on `md`, full-width charts
   - Uses lucide-react icons: `TrendingUp`, `TrendingDown`, `BarChart3`, `Download`, `ChevronLeft`, `ChevronRight`, `DollarSign`, `Hotel`, `Percent`

4. **NAVIGATION** — `components/admin/admin-layout.tsx` already contained `{ name: 'Reports', href: '/admin/reports', icon: BarChart3 }` in the `overview` group, and `BarChart3` was already imported from `lucide-react`. No change required.

## Stack notes

- `recharts@2.15.3` was already in `package.json` — no install needed.
- Source normalization is forgiving: incoming `booking.source` strings ("direct", "Booking.com", "booking_com", etc.) are bucketed into the 5 canonical categories.
- Nights are clipped to the queried period so an overlapping multi-month stay doesn't inflate `occupiedNights`.
- Previous period for comparison is the **previous calendar month** (with year roll-over for January → December prior year). This is the more common dashboard pattern; the task allowed "same month previous year or previous month".
- Paid amount counts only payments with `status === 'COMPLETED'` to avoid double-counting pending/refunded rows.

## Verification

- `npx tsc --noEmit` reports **no new TypeScript errors** in any of the three new files. Errors that surface in `payments/route.ts`, `calendar.ics/route.ts`, `book/route.ts`, and `room-service-board.tsx` are pre-existing and unrelated to this task.
- All three files compile against the current Prisma schema (`Booking`, `Room`, `ServiceOrder`, `Payment` fields all match).

## Issues / follow-ups

- The page does the same aggregation twice on first load (once server-side for SSR, then it stays in state until the user changes period). Considered moving to a shared helper in `lib/`, but each task agent is meant to be self-contained, so logic is duplicated between `page.tsx` and `api/.../route.ts`. Worth extracting later if other reports endpoints need the same math.
- `bySource` only includes categories that have at least one booking in the period — the legend therefore reflects what actually appeared, which matches typical PMS dashboards.
- Tooltip rendering uses recharts v2 callbacks; nothing v3-specific used.
