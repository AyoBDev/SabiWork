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
