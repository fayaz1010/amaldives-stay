# Vayves migration runbook (stay.amaldives.com → vayves.com)

Rebranding the PMS from **amaldives STAY / stay.amaldives.com** to **Vayves / vayves.com**,
while keeping amaldives.com as the traveller-facing distribution channel.

Branch: `rebrand/vayves` (this repo) + `rebrand/vayves` in `fayaz1010/amaldives`.

## What the code change already does (no infra needed)
- `lib/domain.ts` is the single source of truth: `ROOT_DOMAIN` (default `vayves.com`,
  override with env `NEXT_PUBLIC_ROOT_DOMAIN`), `LEGACY_ROOT_DOMAIN`, `BRAND='Vayves'`,
  `PMS_BASE`, `tenantUrl()`, `tenantHost()`.
- `middleware.ts` **301-redirects** `stay.amaldives.com` and every
  `{slug}.stay.amaldives.com` to the same path on `{slug}.vayves.com`. This only works
  while the legacy domain stays attached to the Vercel project (see below).
- All ~50 hardcoded `stay.amaldives.com` links + ~35 "amaldives STAY" brand strings → Vayves.
- amaldives.com side (`src/lib/stay.ts`) now points at `vayves.com`; the
  `source=amaldives.com` booking attribution is deliberately kept (it drives the 4%
  direct-booking commission).

## Gated cutover steps (outward-facing — do in this order)

### 1. DNS — GoDaddy `vayves.com`
- Apex `@` A records → `216.150.1.1` and `216.150.16.1` (current Vercel anycast; NOT the
  legacy `76.76.21.21`).
- Wildcard `*` CNAME → `cname.vercel-dns.com`  (serves every `{slug}.vayves.com` tenant site).
- `www` CNAME → `cname.vercel-dns.com` (optional).

### 2. Vercel — `amaldives-stay` project
- Add domains: `vayves.com` **and** `*.vayves.com`.
- **Keep** `stay.amaldives.com` + `*.stay.amaldives.com` attached — the middleware 301
  needs them. Do not remove until analytics show legacy traffic ≈ 0.
- Env (Production):
  - `NEXT_PUBLIC_ROOT_DOMAIN=vayves.com`
  - `NEXTAUTH_URL=https://vayves.com`  ← **critical**, auth breaks if left on the old host.
- Optionally pre-register the 2 live tenants' `{slug}.vayves.com` via Super Admin (the
  `addDomain` provisioning now targets vayves.com automatically for new tenants).

### 3. External services that are pinned to the old host
- **Stripe** — add webhook endpoint `https://vayves.com/api/webhooks/stripe`. amaldives.com
  now forwards subscription/booking events to vayves.com, and
  `scripts/setup-stripe-billing.ts` is updated. Re-run it or update the dashboard; a new
  endpoint may issue a new `STRIPE_WEBHOOK_SECRET`.
- **Google Maps / Places API key** — referrer-locked to `stay.amaldives.com`
  (see `lib/places-search.ts`). Add `https://vayves.com/*` and `https://*.vayves.com/*` to
  the key's allowed referrers in Google Cloud Console, or Places search 403s on the new domain.
- **Resend** — to send FROM `@vayves.com`, verify the domain (SPF/DKIM) and update
  `RESEND_FROM_EMAIL`. Short-term you can keep the existing verified from-address with the
  "Vayves" display name (already applied) — works with no DNS change.
- **GA4** — add a `vayves.com` data stream (or new property) for continuity.
- **GSC** — add `vayves.com`, submit sitemap; keep the `stay.amaldives.com` property to
  watch the 301 migration land.

### 4. amaldives.com project env (optional overrides — defaults already = vayves.com)
- `NEXT_PUBLIC_STAY_BASE=https://vayves.com`
- `NEXT_PUBLIC_STAY_ROOT_DOMAIN=vayves.com`

## Deploy order (zero-downtime)
1. DNS + Vercel domains live, TLS issued, `vayves.com` resolves.
2. Google Maps referrers + (optional) Resend domain + Stripe endpoint.
3. Set `NEXTAUTH_URL` + `NEXT_PUBLIC_ROOT_DOMAIN` in prod env.
4. Merge + deploy `rebrand/vayves` on both repos.
5. Legacy `stay.amaldives.com` stays attached → 301s to Vayves. Monitor logs.
6. Update social bios / GBP / business cards at leisure.

**Rollback:** revert the branch; `stay.amaldives.com` is still attached so it serves
directly again once the middleware redirect is reverted. Low risk.

## Second pass — closing out the "STAY" name (done)
The cutover above is live: `vayves.com` serves tenants, `NEXTAUTH_URL` and
`NEXT_PUBLIC_ROOT_DOMAIN` are set in prod, and `stay.amaldives.com` 301s correctly.
This pass removed the remaining places the retired name still reached a customer:

- **Stripe webhook was still pointed at `https://stay.amaldives.com/api/webhooks/stripe`.**
  Stripe does not follow redirects, so every `checkout.session.completed` and
  subscription event had been failing since the cutover. The endpoint URL was updated
  **in place** (`we_1TmVLNA60fgaQbWoIwfWdniM`), which preserves the signing secret, so
  `STRIPE_WEBHOOK_SECRET` is unchanged. Anything machine-to-machine that posts here must
  be repointed rather than left to the 301.
- **Stripe product names** (`STAY Growth` / `amaldives STAY Business` / …) renamed to
  `Vayves …`. These show on checkout and invoices.
- **Booking reference prefix** `STAY-` → `VYV-` (`lib/booking-ref.ts`, previously
  duplicated in two routes). Old references still resolve: every lookup is an exact
  `confirmationNumber` match and nothing parses the prefix.
- **`public/embed.js`** defaulted third-party embeds to the old host. It now derives the
  base from its own script URL, so a rehost cannot strand published embeds; `data-base`
  still overrides. `window.amaldivesStay` is aliased to `window.vayves` so embeds already
  on guesthouse sites keep working.
- **`public/help/stay-backend.html`** → `vayves-backend.html` (+ screenshots), with the
  ~50 in-page "Stay" product references rebranded. Ordinary English ("Stay completed",
  "their stay portal") deliberately left alone.
- URL builders consolidated on `tenantUrl()`: removed `staySubdomainUrl()` and the dead
  `getTenantUrl()`, and `checkin-out-config.ts` QR payloads no longer hardcode the host.
- `.env.example` (`NEXTAUTH_URL`, and `NEXT_PUBLIC_ROOT_DOMAIN` documented), setup
  scripts, OTA worker docs, and the WhatsApp/check-in docs.

## Still open
- **Retiring `stay.amaldives.com` entirely** is a judgement call. It must stay attached
  to the Vercel project for the 301s to work; removing it breaks every published link and
  forfeits the redirect's SEO transfer. Check GSC coverage before detaching.
- **Cross-subdomain admin sessions.** `components/admin/tenant-switcher.tsx` implies a
  `.vayves.com` cookie exists, but nothing sets `Domain=.vayves.com` — so switching
  property by hard navigation can force a re-login. Pre-existing, not caused by the port.
- **Google Places key referrers** and **GA4 / GSC** properties, per the list above.
- Email from-domain migration to `@vayves.com` (Resend) is optional polish.
