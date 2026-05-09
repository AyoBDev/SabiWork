#!/bin/bash
# scripts/demo-simulate.sh
# Simulates real-time events for the dashboard live feed
# Run this during the demo to make the dashboard come alive

BASE_URL=${1:-http://localhost:3000}
echo "🎬 Starting demo simulation..."
echo "   Events will fire every 3-5 seconds."
echo "   Press Ctrl+C to stop."
echo ""

simulate_event() {
  local event_type=$1
  local payload=$2
  curl -s -X POST "$BASE_URL/api/webhooks/squad" \
    -H "Content-Type: application/json" \
    -H "x-squad-encrypted-body: demo-mode" \
    -d "$payload" > /dev/null 2>&1
  echo "  → $event_type"
}

COUNTER=0
while true; do
  COUNTER=$((COUNTER + 1))
  TIMESTAMP=$(date +%s)

  case $((COUNTER % 6)) in
    0)
      echo "💰 Payment received — plumbing job Surulere"
      curl -s -X POST "$BASE_URL/api/traders/sales" \
        -H "Content-Type: application/json" \
        -d "{\"trader_id\": 1, \"item_name\": \"rice\", \"quantity\": 2, \"amount\": 50000, \"payment_method\": \"transfer\"}" > /dev/null 2>&1
      ;;
    1)
      echo "👷 Worker onboarded — Demo Worker via field agent"
      ;;
    2)
      echo "🏪 Sale logged — Mama Ngozi, 5 bags garri"
      curl -s -X POST "$BASE_URL/api/traders/sales" \
        -H "Content-Type: application/json" \
        -d "{\"trader_id\": 1, \"item_name\": \"garri\", \"quantity\": 5, \"amount\": 25000, \"payment_method\": \"cash\"}" > /dev/null 2>&1
      ;;
    3)
      echo "📊 Demand signal — tiling in Surulere (unmatched)"
      ;;
    4)
      echo "✅ Payout sent — Emeka ₦14,250"
      ;;
    5)
      echo "📚 Apprenticeship started — David (tiling)"
      ;;
  esac

  # Random sleep 3-5 seconds
  sleep $((3 + RANDOM % 3))
done
