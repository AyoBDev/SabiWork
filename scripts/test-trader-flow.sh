#!/bin/bash
# scripts/test-trader-flow.sh
# Tests trader sale logging and reporting

BASE_URL=${1:-http://localhost:3000}
echo "🧪 Testing Trader Flow against $BASE_URL"
echo "============================================"

# 1. Log a sale via chat
echo -e "\n📨 Step 1: Log sale via chat"
curl -s -X POST "$BASE_URL/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "sold 3 bags rice 75000", "phone": "08031300001", "context": "trader"}' \
  | python3 -m json.tool 2>/dev/null

# 2. Log another sale via direct API
echo -e "\n📦 Step 2: Log sale via API"
curl -s -X POST "$BASE_URL/api/traders/sales" \
  -H "Content-Type: application/json" \
  -d '{"trader_id": 1, "item_name": "cement", "quantity": 5, "amount": 25000, "payment_method": "transfer"}' \
  | python3 -m json.tool 2>/dev/null

# 3. Get trader report
echo -e "\n📊 Step 3: Get trader report"
curl -s "$BASE_URL/api/traders/1/report" | python3 -m json.tool 2>/dev/null

echo -e "\n============================================"
echo "🎉 Trader flow test complete!"
