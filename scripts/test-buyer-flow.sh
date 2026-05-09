#!/bin/bash
# scripts/test-buyer-flow.sh
# Tests the complete buyer flow: chat → match → payment → webhook → payout

BASE_URL=${1:-http://localhost:3000}
echo "🧪 Testing Buyer Flow against $BASE_URL"
echo "============================================"

# 1. Send chat message to find a plumber
echo -e "\n📨 Step 1: Send chat message"
CHAT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "I need a plumber in Surulere", "location": [3.3569, 6.5010]}')
echo "$CHAT_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$CHAT_RESPONSE"

# Extract worker ID from response
WORKER_ID=$(echo "$CHAT_RESPONSE" | python3 -c "
import json, sys
data = json.load(sys.stdin)
msgs = data.get('messages', [data])
for m in msgs:
    if m.get('type') == 'worker_card':
        print(m['data']['id'])
        break
" 2>/dev/null)

if [ -z "$WORKER_ID" ]; then
  echo "⚠️ No worker matched. Check if seed data is loaded."
  echo "   Trying to get workers directly..."
  curl -s "$BASE_URL/api/workers?trade=plumbing&area=surulere" | python3 -m json.tool
  exit 1
fi

echo -e "\n✅ Matched worker ID: $WORKER_ID"

# 2. Book the worker (initiate payment)
echo -e "\n💳 Step 2: Book worker (initiate payment)"
BOOK_RESPONSE=$(curl -s -X POST "$BASE_URL/api/chat" \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"BOOK $WORKER_ID\", \"action\": \"book\", \"worker_id\": \"$WORKER_ID\"}")
echo "$BOOK_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$BOOK_RESPONSE"

# Extract transaction ref
TRANS_REF=$(echo "$BOOK_RESPONSE" | python3 -c "
import json, sys
data = json.load(sys.stdin)
msgs = data.get('messages', [data])
for m in msgs:
    if m.get('type') == 'payment_card':
        print(m['data'].get('transaction_ref', ''))
        break
" 2>/dev/null)

echo -e "\n📝 Transaction ref: ${TRANS_REF:-'N/A (payment initiation may have failed)'}"

# 3. Simulate webhook (charge_successful)
if [ -n "$TRANS_REF" ]; then
  echo -e "\n🔔 Step 3: Simulate Squad webhook (charge_successful)"
  curl -s -X POST "$BASE_URL/api/webhooks/squad" \
    -H "Content-Type: application/json" \
    -H "x-squad-encrypted-body: test-signature" \
    -d "{
      \"Event\": \"charge_successful\",
      \"TransactionRef\": \"$TRANS_REF\",
      \"Body\": {
        \"amount\": 1500000,
        \"transaction_ref\": \"$TRANS_REF\",
        \"transaction_type\": \"card\",
        \"merchant_amount\": 1500000
      }
    }" | python3 -m json.tool 2>/dev/null
fi

# 4. Verify payment
if [ -n "$TRANS_REF" ]; then
  echo -e "\n✔️ Step 4: Verify payment"
  curl -s "$BASE_URL/api/payments/verify/$TRANS_REF" | python3 -m json.tool 2>/dev/null
fi

# 5. Check dashboard stats
echo -e "\n📊 Step 5: Check dashboard stats"
curl -s "$BASE_URL/api/intelligence/stats" | python3 -m json.tool 2>/dev/null

echo -e "\n============================================"
echo "🎉 Buyer flow test complete!"
