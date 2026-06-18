# amaldives-stAY — Implementation Plan v2

> Updated 2026-06-18. All coding via Claude Code CLI; verify with `scripts/test-verification.ts` + build.

## Product goals (this sprint)

1. **Guest↔hotel chat** — active from check-in date through departure (booking-scoped).
2. **Rates management** — rack rate per room/season; engine used at booking search.
3. **B2B agents** — agency accounts, rack ±% agent rates, agent booking portal/API.
4. **Promotions** — admin-managed; stack with rack/agent pricing.
5. **Marketplace commission** — amaldives.com listings with **live STAY** book at **10%** platform fee (not 4%); OTAs ~18%+.

## Phase order

| Phase | Tasks | Depends on |
|-------|-------|------------|
| **A** | TASK-25 Marketplace 10% commission | — |
| **B** | TASK-04 Rates + rack engine | — |
| **C** | TASK-26 Promotions | TASK-04 |
| **D** | TASK-02 B2B agents + agent rates | TASK-04 |
| **E** | TASK-03 Stay chat (arrival→departure) | TASK-11 |
| **F** | TASK-05 Refunds (carry-over) | — |
| **G** | TASK-VERIFY Full build + tests | all |

## Task registry

| ID | Title | Status |
|----|-------|--------|
| TASK-25 | 10% commission for amaldives→stay live bookings | in_progress |
| TASK-04 | Rack rate engine + admin pricing | pending |
| TASK-26 | Promotions management | pending |
| TASK-02 | B2B agencies + agent rates (rack ±%) | pending |
| TASK-03 | Guest↔hotel chat (check-in→check-out) | pending |
| TASK-05 | Stripe refunds + deposits | pending |
| TASK-06–19 | (prior sprint) | done ✓ |
| TASK-VERIFY | Build + test-verification + smoke | pending |

### TASK-25 — Marketplace commission (10%)

- `lib/commission.ts`: `isStayLiveForMarketplace(tenant)`, `getPlatformCommissionRate(tenant, source)`
- **10%** when `source === 'amaldives.com'` (or `amaldives`) AND tenant is live: `status=ACTIVE`, `amaldivesSlug` set, ≥1 active room.
- **4%** default (`tenant.commissionRate`) for other direct stay bookings.
- Wire: `lib/public-booking.ts`, `lib/db.ts` createBooking, book API `source` param.
- Update marketing copy where it says flat 4% for marketplace path.

### TASK-04 — Rack rate engine

- `Room.rackRate` or `RackRate` seasonal rows; `lib/calculate-stay-rate.ts`
- Apply at `createPublicBooking`, rooms search API, booking-engine display.
- Admin: extend `pricing-manager.tsx`.

### TASK-26 — Promotions

- `Promotion` model: code, % off rack, date range, property scope, active flag.
- Admin CRUD; apply in rate calculator.

### TASK-02 — B2B agents

- `Agency`, `AgencyMembership`, `UserRole.AGENT`
- Agent portal `/agent/*`: login, search availability, book at `rack * (1 + markupPct/100)`
- Admin: agencies manager, per-agency markup %.

### TASK-03 — Stay chat

- `StayConversation` (bookingId), `StayMessage` (sender role GUEST|STAFF)
- Open only when `today >= checkInDate` and `status` not cancelled and before `checkOutDate + 1 day`
- Guest: `/guest/[token]/chat`; Admin: inbox on booking/arrivals
- Polling API (30s) or SSE; `queueNotification` on new message for staff.

## Verification

```bash
npm run build
npx tsx --env-file=.env.local scripts/test-verification.ts
npx tsx --env-file=.env.local scripts/smoke-runtime.ts
```

Add tests in `test-verification.ts` for commission, rates, promotions, chat date gates.
