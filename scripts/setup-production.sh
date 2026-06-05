#!/usr/bin/env bash
# One-time production setup for amaldives STAY (run locally with DATABASE_URL set).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "→ Applying database migration…"
if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set"
  exit 1
fi

if command -v psql >/dev/null 2>&1; then
  psql "$DATABASE_URL" -f prisma/migrations/2026-05-28-platform-expansion.sql
else
  echo "psql not found — run the SQL file manually in your Neon/Vercel Postgres console:"
  echo "  prisma/migrations/2026-05-28-platform-expansion.sql"
fi

echo "→ Generating Prisma client…"
npx prisma generate

echo ""
echo "Done. Configure these in Vercel (stay.amaldives.com project):"
echo "  STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
echo "  STRIPE_PRICE_GROWTH, STRIPE_PRICE_BUSINESS, STRIPE_PRICE_CHANNEL"
echo "  GEMINI_API_KEY (or UTIL_AI_URL + UTIL_AI_TOKEN)"
echo "  CRON_SECRET"
echo ""
echo "Stripe webhook URL: https://stay.amaldives.com/api/webhooks/stripe"
echo "Then deploy: vercel --prod  (or push to main if CI deploys)"
