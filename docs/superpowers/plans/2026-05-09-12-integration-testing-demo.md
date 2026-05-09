# Plan 12: Integration Testing + Demo Polish

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire all services together end-to-end, verify the complete buyer flow (PWA chat → AI match → Squad payment → webhook → payout → dashboard update), test all three user flows, fix any integration issues, polish the demo, and create a README with setup instructions for judges.

**Architecture:** Docker Compose brings up all services. ngrok exposes backend for Squad webhooks. Tests verify each flow manually with curl commands and browser interaction. Demo script practiced and timed.

**Tech Stack:** Docker Compose, curl, ngrok, browser DevTools

**Depends on:** Plans 1-11 (all services built)

---

## File Structure

```
SabiWork/
├── docker-compose.yml         # (already exists — verify all services)
├── scripts/
│   ├── test-buyer-flow.sh     # End-to-end buyer flow test
│   ├── test-trader-flow.sh    # Trader logging test
│   ├── test-seeker-flow.sh    # Seeker pathway test
│   └── demo-simulate.sh      # Simulate real-time events for dashboard
├── README.md                  # Judge-facing documentation
└── .env.example               # (already exists — verify all vars)
```

---

### Task 1: Verify Docker Compose Configuration

**Files:**
- Modify: `docker-compose.yml` (verify all services present)

- [ ] **Step 1: Verify docker-compose.yml has all 6 services**

The final `docker-compose.yml` should contain:

```yaml
version: '3.8'

services:
  postgres:
    image: timescale/timescaledb:latest-pg16
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: sabiwork
      POSTGRES_PASSWORD: sabiwork_dev
      POSTGRES_DB: sabiwork
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sabiwork"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build: ./backend
    ports:
      - "3000:3000"
    env_file:
      - .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: sh -c "npm run migrate && npm run seed && npm run start"
    environment:
      - DATABASE_URL=postgresql://sabiwork:sabiwork_dev@postgres:5432/sabiwork
      - REDIS_URL=redis://redis:6379

  pwa:
    build: ./pwa
    ports:
      - "5173:5173"
    depends_on:
      - backend

  dashboard:
    build: ./dashboard
    ports:
      - "3001:3001"
    depends_on:
      - backend
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:3000
      - NEXT_PUBLIC_WS_URL=ws://backend:3000/dashboard/feed

  whatsapp-bot:
    build: ./whatsapp-bot
    ports:
      - "3002:3002"
    depends_on:
      - backend
    environment:
      - BACKEND_URL=http://backend:3000
      - SERVICE_KEY=sabiwork-bot-secret
    volumes:
      - ./whatsapp-bot/auth_state:/app/auth_state

volumes:
  pgdata:
```

- [ ] **Step 2: Verify .env.example has all required variables**

```bash
# === Database ===
DATABASE_URL=postgresql://sabiwork:sabiwork_dev@localhost:5432/sabiwork
REDIS_URL=redis://localhost:6379

# === Squad API (sandbox) ===
SQUAD_API_KEY=sandbox_sk_xxxxxxx
SQUAD_SECRET_KEY=sandbox_xxxxxxx
SQUAD_BASE_URL=https://sandbox-api-d.squadco.com

# === Groq AI ===
GROQ_API_KEY=gsk_xxxxxxx

# === Mapbox ===
VITE_MAPBOX_TOKEN=pk.xxxxxxx
NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxxxxxx

# === App ===
NODE_ENV=development
PORT=3000
JWT_SECRET=sabiwork-dev-secret-change-in-production
SERVICE_KEY=sabiwork-bot-secret

# === WebSocket ===
NEXT_PUBLIC_WS_URL=ws://localhost:3000/dashboard/feed
NEXT_PUBLIC_API_URL=http://localhost:3000
```

- [ ] **Step 3: Commit**

```bash
git add docker-compose.yml .env.example
git commit -m "feat: finalize docker-compose with all 6 services"
```

---

### Task 2: End-to-End Buyer Flow Test Script

**Files:**
- Create: `scripts/test-buyer-flow.sh`

- [ ] **Step 1: Create buyer flow test script**

```bash
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
```

- [ ] **Step 2: Make script executable**

Run: `chmod +x scripts/test-buyer-flow.sh`

- [ ] **Step 3: Commit**

```bash
git add scripts/test-buyer-flow.sh
git commit -m "feat: add buyer flow integration test script"
```

---

### Task 3: Trader + Seeker Test Scripts

**Files:**
- Create: `scripts/test-trader-flow.sh`
- Create: `scripts/test-seeker-flow.sh`

- [ ] **Step 1: Create trader flow test**

```bash
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
```

- [ ] **Step 2: Create seeker flow test**

```bash
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
```

- [ ] **Step 3: Make scripts executable**

Run: `chmod +x scripts/test-trader-flow.sh scripts/test-seeker-flow.sh`

- [ ] **Step 4: Commit**

```bash
git add scripts/test-trader-flow.sh scripts/test-seeker-flow.sh
git commit -m "feat: add trader and seeker integration test scripts"
```

---

### Task 4: Demo Simulation Script

**Files:**
- Create: `scripts/demo-simulate.sh`

- [ ] **Step 1: Create demo simulation (fires events for dashboard)**

```bash
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
```

- [ ] **Step 2: Make executable**

Run: `chmod +x scripts/demo-simulate.sh`

- [ ] **Step 3: Commit**

```bash
git add scripts/demo-simulate.sh
git commit -m "feat: add demo simulation script for live dashboard events"
```

---

### Task 5: README for Judges

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create README**

```markdown
# SabiWork — Intelligent Economic System

**Squad Hackathon 3.0 — Challenge 02**

AI-powered economic intelligence platform connecting informal workers, traders, and job seekers to financial services. Every transaction builds a financial identity.

*"Sabi dey pay."*

---

## Quick Start

```bash
# 1. Clone and configure
cp .env.example .env
# Add your API keys to .env:
#   SQUAD_API_KEY, SQUAD_SECRET_KEY
#   GROQ_API_KEY
#   VITE_MAPBOX_TOKEN, NEXT_PUBLIC_MAPBOX_TOKEN

# 2. Start all services
docker-compose up --build

# 3. Access
# PWA:        http://localhost:5173
# Dashboard:  http://localhost:3001
# API:        http://localhost:3000
```

Services auto-run migrations and seed 3 months of demo data on first boot.

---

## Architecture

```
┌─────────────┐   ┌──────────────┐   ┌───────────────┐
│   PWA       │   │  Dashboard   │   │ WhatsApp Bot  │
│ React+Vite  │   │  Next.js     │   │   Baileys     │
│  Mapbox GL  │   │  WebSocket   │   │              │
└──────┬──────┘   └──────┬───────┘   └──────┬───────┘
       │                  │                   │
       └──────────────────┼───────────────────┘
                          │
              ┌───────────▼───────────┐
              │    Express Backend    │
              │  AI (Groq) + Squad   │
              │  Trust + SabiScore   │
              └───┬──────────────┬───┘
                  │              │
         ┌────────▼──┐    ┌─────▼────┐
         │ TimescaleDB│    │  Redis   │
         │ PostgreSQL │    │  Cache   │
         └───────────┘    └──────────┘
```

---

## Squad API Integration (6 Products)

| Product | Where Used |
|---------|-----------|
| Payment Initiation | Buyer pays for job via card/transfer/USSD |
| Webhook Processing | Real-time payment events → trust updates |
| Transaction Verify | Confirm payment before worker payout |
| Transfer (Payout) | Instant worker payment after job completion |
| Payout Requery | Handle timeout scenarios safely |
| Virtual Account | Created on worker/trader onboarding |
| Account Lookup | Verify bank details during registration |

**Demo moments:** Worker onboard → Buyer pays → Webhook fires → Payout sent → Scores update

---

## Three User Flows

### 1. Buyer Flow (PWA)
Chat → AI matches worker → Book → Squad payment → Worker notified → Job tracked → Rating → Payout

### 2. Trader Flow (WhatsApp)
"sold 3 bags rice 75000" → NLP parses → Sale logged → SabiScore updates → Weekly report

### 3. Seeker Flow (PWA + WhatsApp)
View demand map → See skills gaps → Find apprenticeship → Apply → Learn → Graduate to worker

---

## AI Layer (Groq)

- **Intent Classification** — Llama 3.1-8b-instant
- **Worker Matching** — Hybrid: SQL (distance, trade, availability) + AI ranking (Llama 3.3-70b)
- **Trade Parsing** — NLP sale extraction from natural language
- **Pathway Recs** — Demand-driven career advice

Fallback: keyword matching if Groq is unavailable. Demo never breaks.

---

## Trust + SabiScore

**Trust Score (0-1):** Payment speed, ratings, consistency, repeat bookings. Unlocks priority matching → apprentice training → premium pricing.

**SabiScore (0-100):** Transaction consistency, income growth, trust, customer diversity, digital engagement, location stability. Unlocks savings → microloan → full financial suite.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Express.js 5, Knex, Node 22 |
| Database | PostgreSQL 16 + TimescaleDB |
| Cache | Redis 7 |
| AI | Groq (Llama 3.1 + 3.3) |
| PWA | React 19, Vite 6, Mapbox GL v3, Zustand |
| Dashboard | Next.js, Tailwind, WebSocket |
| WhatsApp | Baileys (headless client) |
| Payments | Squad API (all products) |
| Deploy | Docker Compose |

---

## Project Structure

```
SabiWork/
├── backend/          # Express API + services
├── pwa/              # React PWA (consumer app)
├── dashboard/        # Next.js intelligence dashboard
├── whatsapp-bot/     # Baileys WhatsApp bot
├── shared/           # Constants shared across services
├── scripts/          # Test + demo scripts
└── docker-compose.yml
```

---

## Testing

```bash
# Run end-to-end tests (requires services running)
./scripts/test-buyer-flow.sh
./scripts/test-trader-flow.sh
./scripts/test-seeker-flow.sh

# Simulate live events for dashboard demo
./scripts/demo-simulate.sh
```

---

## Squad Webhook Setup (ngrok)

```bash
ngrok http 3000
# Set https://xxx.ngrok.io/api/webhooks/squad in Squad sandbox dashboard
```

---

## Environment Variables

See `.env.example` for all required configuration.

---

## Team

Built for Squad Hackathon 3.0 — Challenge 02: Intelligent Economic System
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "feat: add README with setup instructions for judges"
```

---

### Task 6: Full Integration Test (Docker Compose Up)

**Files:** None (verification only)

- [ ] **Step 1: Create .env from .env.example**

Run: `cp .env.example .env`

Then fill in actual API keys (Squad sandbox, Groq, Mapbox).

- [ ] **Step 2: Build and start all services**

Run: `docker-compose up --build`

Expected:
1. PostgreSQL + Redis start first (healthchecks pass)
2. Backend starts → runs migrations → seeds data → "Server running on port 3000"
3. PWA builds → nginx serves on port 5173
4. Dashboard builds → Next.js serves on port 3001
5. WhatsApp bot starts → shows QR code (scan with phone)

- [ ] **Step 3: Verify backend is healthy**

Run: `curl http://localhost:3000/api/intelligence/stats`

Expected: JSON response with `volume_today`, `jobs_today`, `workers_paid`, etc.

- [ ] **Step 4: Verify PWA loads**

Open `http://localhost:5173` in browser.

Expected: Map of Lagos with coloured worker markers. Orange FAB button visible. Bottom nav works.

- [ ] **Step 5: Verify Dashboard loads**

Open `http://localhost:3001` in browser.

Expected: Dark-themed dashboard with stat cards, map, live feed area, intelligence panels.

- [ ] **Step 6: Run buyer flow test**

Run: `./scripts/test-buyer-flow.sh`

Expected: All 5 steps pass — chat returns worker match, booking creates payment, webhook processes.

- [ ] **Step 7: Run demo simulation**

Run: `./scripts/demo-simulate.sh`

Open dashboard — events should appear in the live feed, map should show pulse markers.

- [ ] **Step 8: Test PWA chat flow in browser**

1. Open PWA → Tap orange FAB
2. Type "I need a plumber in Surulere"
3. Should get AI response with worker card
4. Tap "Book Emeka"
5. Payment card appears with Squad checkout URL

- [ ] **Step 9: Fix any issues found**

If any integration issues are discovered, fix them and commit:

```bash
git add -A
git commit -m "fix: resolve integration issues found during E2E testing"
```

---

### Task 7: Demo Rehearsal Checklist

**Files:** None (process only)

- [ ] **Step 1: Time the demo (target: 5 minutes)**

Practice the following script:

| Time | Action | What to Show |
|------|--------|------|
| 0:00-0:30 | Open Dashboard | "3 months of economic intelligence already learning" |
| 0:30-1:00 | PWA Map | Toggle Workers/Demand/Gaps layers. Show Surulere gap |
| 1:00-2:30 | Buyer Flow | Chat → "I need a plumber" → Match → Book → Pay (Squad) → Webhook → Payout |
| 2:30-3:00 | Dashboard Live | Show payment appearing in feed, stats incrementing |
| 3:00-3:45 | Trader WhatsApp | "sold 3 bags rice 75000" → logged → REPORT → weekly stats |
| 3:45-4:15 | Seeker | Show demand map → "No tilers in Surulere" → Apprenticeship |
| 4:15-4:45 | Field Agent | Switch to agent mode → Onboard form → GPS capture |
| 4:45-5:00 | Zoom out | "Every transaction makes it smarter. Sabi dey pay." |

- [ ] **Step 2: Verify all demo moments work**

Run through the script once, noting any failures. Fix before final submission.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "chore: final demo polish and integration fixes"
```
