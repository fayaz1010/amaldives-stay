#!/usr/bin/env bash
# One-shot production wiring for Vayves on Vercel.
# Uses Stripe keys from amaldives.com env + util-ai admin to mint stay token.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

AMALDIVES_ENV="${AMALDIVES_ENV:-/tmp/amaldives-prod.env}"
UTIL_AI_ENV="${UTIL_AI_ENV:-/Users/sundirectpower/dev/util-ai/.env.local}"

if [[ ! -f "$AMALDIVES_ENV" ]]; then
  echo "Missing $AMALDIVES_ENV — run: cd ../amaldives && vercel env pull $AMALDIVES_ENV --environment=production --yes"
  exit 1
fi

# shellcheck disable=SC1090
source "$AMALDIVES_ENV"
# shellcheck disable=SC1090
[[ -f "$UTIL_AI_ENV" ]] && source "$UTIL_AI_ENV"

STRIPE_KEY="${STRIPE_SECRET_KEY:?STRIPE_SECRET_KEY missing}"
STRIPE_PK="${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:?publishable key missing}"
UTIL_AI_URL="${UTIL_AI_URL:-https://util-ai-lake.vercel.app}"
ADMIN="${ADMIN_BEARER:-${UTIL_AI_ADMIN:-}}"

echo "→ Creating Vayves Stripe products (OZ Systems account)…"

create_product_price() {
  local name="$1" amount="$2" interval="$3"
  local product_id price_id
  product_id=$(curl -s -u "${STRIPE_KEY}:" \
    -d "name=${name}" \
    -d "metadata[app]=amaldives-stay" \
    -d "metadata[site]=vayves.com" \
    "https://api.stripe.com/v1/products" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
  price_id=$(curl -s -u "${STRIPE_KEY}:" \
    -d "product=${product_id}" \
    -d "unit_amount=${amount}" \
    -d "currency=usd" \
    -d "recurring[interval]=${interval}" \
    "https://api.stripe.com/v1/prices" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
  echo "${price_id}"
}

# Reuse existing prices if products already exist
existing=$(curl -s -u "${STRIPE_KEY}:" "https://api.stripe.com/v1/products?limit=100&active=true")
GROWTH_PRICE=$(echo "$existing" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for p in d.get('data',[]):
  if p.get('name')=='Vayves Growth':
    print(p['id']); break
")
if [[ -n "${GROWTH_PRICE:-}" ]]; then
  echo "  Found existing Growth product, fetching price…"
  GROWTH_PRICE=$(curl -s -u "${STRIPE_KEY}:" "https://api.stripe.com/v1/prices?product=${GROWTH_PRICE}&active=true&limit=1" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data'][0]['id'] if d.get('data') else '')")
else
  GROWTH_PRICE=$(create_product_price "Vayves Growth" 1900 month)
fi

existing=$(curl -s -u "${STRIPE_KEY}:" "https://api.stripe.com/v1/products?limit=100&active=true")
BUSINESS_PRICE=$(echo "$existing" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for p in d.get('data',[]):
  if p.get('name')=='Vayves Business':
    print(p['id']); break
")
if [[ -n "${BUSINESS_PRICE:-}" ]]; then
  BUSINESS_PRICE=$(curl -s -u "${STRIPE_KEY}:" "https://api.stripe.com/v1/prices?product=${BUSINESS_PRICE}&active=true&limit=1" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data'][0]['id'] if d.get('data') else '')")
else
  BUSINESS_PRICE=$(create_product_price "Vayves Business" 4900 month)
fi

existing=$(curl -s -u "${STRIPE_KEY}:" "https://api.stripe.com/v1/products?limit=100&active=true")
CHANNEL_PRICE=$(echo "$existing" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for p in d.get('data',[]):
  if p.get('name')=='Vayves Channel Plus':
    print(p['id']); break
")
if [[ -n "${CHANNEL_PRICE:-}" ]]; then
  CHANNEL_PRICE=$(curl -s -u "${STRIPE_KEY}:" "https://api.stripe.com/v1/prices?product=${CHANNEL_PRICE}&active=true&limit=1" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data'][0]['id'] if d.get('data') else '')")
else
  CHANNEL_PRICE=$(create_product_price "Vayves Channel Plus" 7900 month)
fi

echo "  Growth price:  ${GROWTH_PRICE}"
echo "  Business price: ${BUSINESS_PRICE}"
echo "  Channel price:  ${CHANNEL_PRICE}"

echo "→ Creating Stripe webhook for vayves.com…"
WEBHOOK_URL="https://vayves.com/api/webhooks/stripe"
existing_wh=$(curl -s -u "${STRIPE_KEY}:" "https://api.stripe.com/v1/webhook_endpoints?limit=100" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for w in d.get('data',[]):
  if w.get('url')=='${WEBHOOK_URL}':
    print(w['id']); break
")

if [[ -n "${existing_wh:-}" ]]; then
  echo "  Webhook already exists: ${existing_wh}"
  STRIPE_WH_SECRET=$(curl -s -u "${STRIPE_KEY}:" "https://api.stripe.com/v1/webhook_endpoints/${existing_wh}/secret" | python3 -c "import sys,json; print(json.load(sys.stdin).get('secret',''))")
else
  wh_resp=$(curl -s -u "${STRIPE_KEY}:" \
    -d "url=${WEBHOOK_URL}" \
    -d "enabled_events[]=checkout.session.completed" \
    -d "enabled_events[]=customer.subscription.created" \
    -d "enabled_events[]=customer.subscription.updated" \
    -d "enabled_events[]=customer.subscription.deleted" \
    "https://api.stripe.com/v1/webhook_endpoints")
  STRIPE_WH_SECRET=$(echo "$wh_resp" | python3 -c "import sys,json; print(json.load(sys.stdin).get('secret',''))")
  echo "  Created webhook"
fi

if [[ -z "${STRIPE_WH_SECRET:-}" ]]; then
  echo "ERROR: Could not obtain webhook signing secret"
  exit 1
fi

echo "→ Minting util-ai token for amaldives-stay…"
if [[ -n "${ADMIN:-}" ]]; then
  MINT=$(curl -s -X POST "${UTIL_AI_URL}/v1/admin/tokens" \
    -H "Authorization: Bearer ${ADMIN}" \
    -H "Content-Type: application/json" \
    -d '{"site":"amaldives-stay","allow_provider":["gemini"],"allow_names":["gemini"],"note":"vayves.com production"}')
  VAYVES_UTIL_TOKEN=$(echo "$MINT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('token',''))" 2>/dev/null || true)
  if [[ -z "${VAYVES_UTIL_TOKEN:-}" ]]; then
    echo "  Mint returned existing scope — reusing amaldives token"
    VAYVES_UTIL_TOKEN="${UTIL_AI_TOKEN:-}"
  else
    echo "  Minted new amaldives-stay token"
  fi
else
  echo "  No ADMIN_BEARER — reusing amaldives UTIL_AI_TOKEN"
  VAYVES_UTIL_TOKEN="${UTIL_AI_TOKEN:-}"
fi

CRON_SECRET="${CRON_SECRET:-$(openssl rand -base64 32)}"
RESEND_API_KEY="${RESEND_API_KEY:-}"
RESEND_FROM="${RESEND_FROM_EMAIL:-hello@amaldives.com}"

vercel link --project amaldives-stay --yes >/dev/null 2>&1

set_env() {
  local name="$1" value="$2"
  printf '%s' "$value" | vercel env add "$name" production --force --yes 2>/dev/null || true
}

echo "→ Pushing env vars to Vercel (amaldives-stay production)…"
set_env STRIPE_SECRET_KEY "$STRIPE_KEY"
set_env NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY "$STRIPE_PK"
set_env STRIPE_WEBHOOK_SECRET "$STRIPE_WH_SECRET"
set_env STRIPE_PRICE_GROWTH "$GROWTH_PRICE"
set_env STRIPE_PRICE_BUSINESS "$BUSINESS_PRICE"
set_env STRIPE_PRICE_CHANNEL "$CHANNEL_PRICE"
set_env CRON_SECRET "$CRON_SECRET"
set_env UTIL_AI_URL "$UTIL_AI_URL"
set_env UTIL_AI_TOKEN "$VAYVES_UTIL_TOKEN"
[[ -n "$RESEND_API_KEY" ]] && set_env RESEND_API_KEY "$RESEND_API_KEY"
set_env RESEND_FROM_EMAIL "$RESEND_FROM"

echo ""
echo "✓ Stripe products + webhook configured"
echo "✓ Vercel env updated for amaldives-stay"
echo ""
echo "Price IDs:"
echo "  STRIPE_PRICE_GROWTH=${GROWTH_PRICE}"
echo "  STRIPE_PRICE_BUSINESS=${BUSINESS_PRICE}"
echo "  STRIPE_PRICE_CHANNEL=${CHANNEL_PRICE}"
echo ""
echo "Redeploy to apply: vercel --prod --yes"
