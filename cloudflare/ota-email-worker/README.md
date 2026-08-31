# OTA Email Ingest — Cloudflare Email Worker

Forwards OTA reservation notification emails into vayves.com so they
become Bookings. **It never touches any tenant's mailbox** — each OTA is told to
send a *copy* of its reservation emails to an address on a Cloudflare zone we
control; this worker parses it and POSTs to the app webhook.

## How tenant routing works
Recipient address encodes the tenant subdomain:
- `ota-<subdomain>@<our-zone>` e.g. `ota-rivethi-beach@ingest.amaldives.com`
- or sub-addressing: `ota+<subdomain>@<our-zone>`

The webhook (`/api/webhooks/ota-email`) strips the `ota-`/`ota+` prefix and
looks the tenant up by `subdomain`.

## One-time setup
1. **Pick the ingest zone.** Use a domain/subdomain that does NOT carry human
   email (so a catch-all is safe). Recommended: a dedicated zone like
   `ingest.amaldives.com` (add it as its own Cloudflare zone), or any spare
   domain on the account. Do **not** enable a catch-all on a zone that receives
   real mail.
2. **Enable Email Routing** on that zone (Cloudflare dashboard → Email →
   Email Routing → enable; it adds the required MX/TXT to *that zone only*).
3. **Deploy the worker:**
   ```bash
   cd cloudflare/ota-email-worker
   npm install
   npx wrangler secret put OTA_INGEST_SECRET   # paste the SAME value as Vercel's OTA_INGEST_SECRET
   npx wrangler deploy
   ```
4. **Route mail to the worker:** Cloudflare → Email Routing → Routes →
   **Catch-all** → Action: *Send to a Worker* → `ota-email-worker`. (Catch-all
   so any `ota-<subdomain>@` address works without per-tenant config.)

## Per OTA (per tenant)
Add the tenant's ingest address as an **additional reservation-notification
email** in each OTA extranet:
- **Booking.com:** Account → Contacts → Reservations → add `ota-<subdomain>@<zone>`
- **Airbnb / Agoda / Expedia / Vrbo:** add the same address under their
  reservation/notification email settings.

## Test without an OTA
`POST` a sample to the webhook with `dryRun: true` to see parsed output without
writing a booking:
```bash
curl -s https://vayves.com/api/webhooks/ota-email \
  -H 'content-type: application/json' \
  -H 'x-ota-ingest-secret: <secret>' \
  -d '{"dryRun":true,"to":"ota-rivethi-beach@ingest.amaldives.com","from":"reservations@booking.com","subject":"New reservation 1234567890","text":"Reservation number: 1234567890\nGuest name: John Smith\nCheck-in: 20 June 2026\nCheck-out: 23 June 2026\nRoom: Deluxe Double\n2 adults\nTotal: USD 240.00"}'
```
