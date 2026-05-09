#!/bin/bash
# scripts/test-seeker-flow.sh
# Tests seeker pathway and apprenticeship flow

BASE_URL=${1:-http://localhost:3000}
echo "🧪 Testing Seeker Flow against $BASE_URL"
echo "============================================"

# 1. Ask for pathway recommendation
echo -e "\n📨 Step 1: Ask for pathway"
curl -s -X POST "$BASE_URL/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "I want to learn tiling in Surulere", "phone": "08031400001", "context": "seeker"}' \
  | python3 -m json.tool 2>/dev/null

# 2. Get skills gaps
echo -e "\n📊 Step 2: Get skills gaps"
curl -s "$BASE_URL/api/intelligence/gaps" | python3 -m json.tool 2>/dev/null

# 3. Get apprenticeships
echo -e "\n📚 Step 3: Get available apprenticeships"
curl -s "$BASE_URL/api/seekers/apprenticeships?area=surulere" | python3 -m json.tool 2>/dev/null

echo -e "\n============================================"
echo "🎉 Seeker flow test complete!"
