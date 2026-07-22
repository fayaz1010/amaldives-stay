# Vayves ↔ amaldives.com featuring — deploy runbook

Properties on the Vayves PMS can opt into being **featured on amaldives.com**.
Opted-in tenants appear in a "Book Direct — Verified" grid on
`amaldives.com/guesthouses` and get a badge + top-of-grid placement, sending
commission-free direct bookings (attributed `source=amaldives.com` → 4%).

Built on branch `feat/amaldives-featuring` in **both** repos. Typechecks clean
(amaldives 0 errors; Vayves only 1 pre-existing unrelated error in
`lib/stripe-booking.ts`). **Not yet deployed** — steps below.

## What changed

**Vayves (`~/dev/amaldives-stay`)**
- `prisma/schema.prisma` — `Tenant.amaldivesFeatured Boolean @default(false)` + index.
- `prisma/migrations/2026-07-23-amaldives-featured.sql` — additive, idempotent.
- `app/api/public/amaldives/listings/route.ts` — public discovery feed (cached 30 min).
- `app/api/admin/web/profile/route.ts` — GET/PATCH now expose/set the opt-in + slug.
- `components/admin/web-manager.tsx` — "Feature on amaldives.com" toggle in Profile tab.

**amaldives (`~/dev/amaldives`)**
- `src/lib/stay.ts` — `getStayListings()`.
- `src/components/guesthouses/FeaturedDirectStrip.tsx` — the featured grid.
- `src/app/guesthouses/page.tsx` — renders the strip + badges/sorts the main grid.

## Deploy order (do NOT `vercel --prod` — git push only; prod-clobber landmine)

1. **Apply the migration to the Vayves prod DB FIRST** (before the app deploy, so
   the new column exists when code that reads it goes live). It's additive +
   defaulted + `IF NOT EXISTS`, safe on a live multi-tenant DB.
   ```bash
   cd ~/dev/amaldives-stay
   # DATABASE_URL is in Vercel prod env / .env.local
   psql "$DATABASE_URL" -f prisma/migrations/2026-07-23-amaldives-featured.sql
   # verify:
   psql "$DATABASE_URL" -c '\d "Tenant"' | grep amaldivesFeatured
   ```

2. **Ship Vayves** — merge `feat/amaldives-featuring` → `main`, push. GitHub
   integration auto-deploys. (Never `vercel --prod` from this repo.)
   Smoke test: `curl -s https://vayves.com/api/public/amaldives/listings` → `{"listings":[...],"count":N}`.
   With no tenants opted in yet, expect `count: 0` (endpoint 200, empty).

3. **Opt in the launch tenants.** Either from each tenant's Web admin
   (Profile tab → "Feature on amaldives.com" toggle) or directly:
   ```sql
   UPDATE "Tenant" SET "amaldivesFeatured" = true
   WHERE "amaldivesSlug" IS NOT NULL AND subdomain IN ('rivethi-beach', ...);
   ```
   (Rivethi Beach is the known live tenant. Confirm `amaldivesSlug` is set — the
   admin toggle auto-derives it from the subdomain if blank.)

4. **Ship amaldives** — merge `feat/amaldives-featuring` → `main`, push to
   `fayaz1010/amaldives` (git push only — see feedback_amaldives_deploy).
   Verify: `amaldives.com/guesthouses` shows the "Book Direct — Verified" strip
   and badged cards. The strip hides gracefully if the feed is empty/unreachable.

## Notes / follow-ups
- `NEXT_PUBLIC_STAY_BASE` on amaldives defaults to `https://vayves.com` — fine in prod.
- Feed is edge-cached 30 min + amaldives revalidates 30 min → an opt-in takes up
  to ~30 min to appear. Fine for launch; add on-opt-in revalidation later if needed.
- Featured cards for a property **without** an amaldives guide link straight to the
  Vayves booking site. Consider auto-generating a stub guide per featured property
  so every card lands on an on-site page (better SEO + the live availability widget).
