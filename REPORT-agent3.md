# Agent 3 — Onboarding Wizard

## Goal
Build a 5-step onboarding wizard that auto-appears for new properties with zero rooms and no `onboardingComplete` flag in tenant settings.

## Files created

### `components/admin/onboarding-wizard.tsx` (new)
Client component, full-screen overlay (`fixed inset-0 bg-white z-50`), `max-w-lg mx-auto` content. 5 steps with a progress bar (`w-full bg-gray-200 rounded-full h-2`, inner div width `= step/5*100%`). Smooth step transitions via a `@keyframes onbStepIn` opacity/translateY animation defined in an inline `<style>` block.

- **Step 1 — Welcome:** Building2 icon in teal pill, `text-3xl font-bold text-teal-600` heading "Welcome to amaldives STAY!", subtext, full-width teal "Get Started →" button.
- **Step 2 — Property Details:** Display Name (pre-filled from `propertyName` prop), Short tagline, Island/City, Phone, Email. "Next" calls `PATCH /api/admin/settings` with `{ name, tagline, city, phone, email }` then advances; "Back" available.
- **Step 3 — Add Rooms:** Repeatable room-type card (max 3) with Room Type Name, Category select (STANDARD/DELUXE/SUITE/FAMILY), Price per night, Max guests, Room numbers textarea (split on newline or comma — accepts the `101\n102` format). "Next" loops the room-numbers and `POST /api/admin/rooms` for each with `{ propertyId, name, type, basePrice, capacity, number, amenities: [], images: [] }`. Validates ≥ 1 room before advancing. Errors surface inline.
- **Step 4 — Booking Page Ready:** Displays `https://stay.amaldives.com/book/{subdomain}`, embedded QR image via `api.qrserver.com`, "Copy Link" (writes to clipboard, "Copied!" feedback), "Share on WhatsApp" green button linking to `https://wa.me/?text=…` with prefilled message, info box.
- **Step 5 — Complete:** 20 randomized CSS confetti squares (teal / yellow / pink / purple / orange) animated via a `@keyframes onbConfetti` block in the inline `<style>` tag, green check circle, `text-3xl font-bold text-teal-600` "You are all set!" heading, 3 next-step cards (`grid grid-cols-3 gap-3`) — "Create Booking" → `/admin/reservations/new`, "Set Up Arrivals" → `/admin/arrivals`, "Edit Web Page" → `/admin/web`. "Go to Dashboard" button calls `PATCH /api/admin/settings { onboardingComplete: true }` then `onComplete()`.

Props:
```ts
interface Props {
  propertyName: string;
  subdomain: string;
  propertyId?: string; // added — POST /api/admin/rooms requires it
  onComplete: () => void;
}
```

State: `step (1–5)`, `loading`, `error`, `copied`, `name`, `tagline`, `city`, `phone`, `email`, `roomTypes[]`. All buttons `min-h-12`.

## Files modified

### `app/api/admin/settings/route.ts`
The PATCH handler already updated tenant name/description and property city/phone/email. Extended it so the body can also include:
- `onboardingComplete: boolean` — merged into `tenant.settings` JSON.
- `tagline: string` — merged into `tenant.settings.webProfile.tagline` (matches the shape that `/api/public/[subdomain]/info` already reads).

Existing settings are read first, merged, and written back — no clobbering of unrelated keys.

### `app/admin/page.tsx`
Now also queries in parallel:
- `prisma.room.count({ where: { tenantId } })`
- `prisma.tenant.findUnique({ where: { id: tenantId }, select: { subdomain, settings } })`
- `prisma.property.findFirst({ where: { tenantId }, select: { id, name } })`

Computes `showOnboarding = roomCount === 0 && !settings?.onboardingComplete` and passes `showOnboarding`, `propertySubdomain`, `propertyName`, `propertyId` to `DashboardOverview`.

### `components/admin/dashboard-overview.tsx`
- Added `useState` import and `OnboardingWizard` import.
- Added optional props `showOnboarding`, `propertySubdomain`, `propertyName`, `propertyId`.
- Added local `showWizard` state initialized from `showOnboarding`, rendered conditionally at the top of the returned tree. `onComplete` closes the wizard without a page reload.

## Notes / decisions
- The brief said "POST with roomNumber field" but Prisma's `Room` model uses `number` (not `roomNumber`) — confirmed against `prisma/schema.prisma` and the existing `components/admin/add-room-modal.tsx` which posts `number`. I stuck with `number` to avoid Prisma `Unknown field` errors.
- `propertyId` is passed through because `prisma.room.create` requires it. Falls back to omitting if no property exists yet (defensive — shouldn't happen in practice).
- Tagline goes into `tenant.settings.webProfile.tagline` so the existing public info API already picks it up without further changes.
- The `.next/types/app/admin/page.ts` "not a module" TS errors that appear before a rebuild are stale Next.js generated stubs and clear after `next dev` recompiles; unrelated to these changes.

## Testing checklist (manual)
- Sign in as a fresh tenant with zero rooms → wizard auto-opens.
- Step 2: fields pre-fill with property name; saving persists tenant name / property city/phone/email and tagline to `tenant.settings.webProfile.tagline`.
- Step 3: create 1–3 room types with multiple room numbers; verify rooms appear in `/admin/rooms`.
- Step 4: QR renders, Copy Link writes the URL to clipboard, WhatsApp link opens with prefilled text.
- Step 5: confetti animates, next-step cards link correctly, "Go to Dashboard" sets `onboardingComplete = true` and the wizard does not return on reload.
