# SabiWork — AI-Powered Economic Intelligence for Nigeria's Informal Economy

**Squad Hackathon 3.0 — Challenge 02: Intelligent Economic System**

SabiWork connects Nigeria's 60M+ informal workers, traders, and job seekers to financial services through AI-powered matching, natural language transaction tracking, and Squad payment infrastructure. Every gig completed and every sale logged builds a verifiable financial identity (SabiScore) that unlocks access to savings, microloans, and the formal economy. *"Sabi dey pay."*

---

## Architecture

```
SabiWork/
├── backend/        Express.js API — AI matching, Squad payments, trust engine
├── pwa/            React PWA — consumer app for buyers and job seekers
├── dashboard/      Next.js — real-time economic intelligence dashboard
├── whatsapp-bot/   Baileys — WhatsApp interface for traders
├── shared/         Constants shared across services
├── scripts/        Test and demo scripts
└── docker-compose.yml
```

```
┌─────────────┐   ┌──────────────┐   ┌───────────────┐
│   PWA       │   │  Dashboard   │   │ WhatsApp Bot  │
│ React+Vite  │   │  Next.js     │   │   Baileys     │
└──────┬──────┘   └──────┬───────┘   └──────┬────────┘
       └──────────────────┼───────────────────┘
                          │
              ┌───────────▼───────────┐
              │    Express Backend    │
              │  Groq AI + Squad API  │
              │  Trust + SabiScore    │
              └───┬──────────────┬────┘
                  │              │
         ┌────────▼──┐    ┌─────▼────┐
         │TimescaleDB │    │  Redis   │
         │ PostgreSQL │    │  Cache   │
         └────────────┘    └──────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Express.js 5, Knex ORM, Node 22 |
| Database | PostgreSQL 16 + TimescaleDB |
| Cache | Redis 7 |
| AI | Groq (Llama 3.1-8b + Llama 3.3-70b) |
| PWA | React 19, Vite 6, Tailwind 4, Mapbox GL v3, Zustand |
| Dashboard | Next.js 15, Tailwind 4, WebSocket |
| WhatsApp | Baileys 6.7 (headless client) |
| Payments | Squad API (sandbox) |
| Deploy | Docker Compose |

---

## Squad API Integrations

| Squad Product | Where It's Used |
|---------------|----------------|
| **Payment Initiation** | Buyer pays for a job via card, transfer, or USSD at booking time |
| **Transaction Verification** | Backend confirms payment status before releasing worker payout |
| **Bank Transfer / Payout** | Instant disbursement to worker's bank account after job completion |
| **Virtual Account Creation** | Each worker/trader gets a dedicated virtual account on onboarding |
| **Account Lookup** | Validates bank details during worker registration (name resolution) |
| **Webhook Processing** | Real-time payment events trigger trust score updates and notifications |

**End-to-end flow:** Worker onboards (virtual account created) -> Buyer books and pays (payment initiation) -> Webhook confirms (verification) -> Job completed -> Payout sent (bank transfer) -> SabiScore updated.

---

## Quick Start

### Prerequisites

- Node.js 22+
- Docker & Docker Compose (recommended) OR PostgreSQL 16 + Redis 7 locally
- Squad sandbox API keys ([get them here](https://sandbox.squadco.com))
- Groq API key ([get one here](https://console.groq.com))
- Mapbox token ([get one here](https://mapbox.com))

### Option A: Docker (recommended)

```bash
# 1. Clone the repo
git clone https://github.com/AyoBDev/SabiWork.git
cd SabiWork

# 2. Copy env file and add your keys
cp .env.example .env
# Edit .env with your SQUAD_API_KEY, SQUAD_SECRET_KEY, GROQ_API_KEY, VITE_MAPBOX_TOKEN

# 3. Start everything
docker-compose up --build

# 4. Access the apps
# PWA:        http://localhost:5173
# Dashboard:  http://localhost:3001
# API:        http://localhost:3000
```

Migrations run automatically. Demo data (3 months of transactions) is seeded on first boot.

### Option B: Run services individually

```bash
# Terminal 1 — Backend
cd backend
npm install
npm run migrate
npm run seed
npm run dev          # http://localhost:3000

# Terminal 2 — PWA
cd pwa
npm install
npm run dev          # http://localhost:5173

# Terminal 3 — Dashboard
cd dashboard
npm install
npm run dev          # http://localhost:3001

# Terminal 4 — WhatsApp Bot (optional)
cd whatsapp-bot
npm install
npm run dev          # Scan QR code on first run
```

---

## Environment Variables

Copy `.env.example` to `.env` at the project root:

```env
# Database
DATABASE_URL=postgresql://sabiwork:sabiwork_dev@localhost:5432/sabiwork
REDIS_URL=redis://localhost:6379

# Squad API (sandbox)
SQUAD_API_KEY=sandbox_sk_xxxxxxx
SQUAD_SECRET_KEY=sandbox_xxxxxxx
SQUAD_BASE_URL=https://sandbox-api-d.squadco.com

# Groq AI
GROQ_API_KEY=gsk_xxxxxxx

# Mapbox
VITE_MAPBOX_TOKEN=pk.xxxxxxx
NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxxxxxx

# App
NODE_ENV=development
PORT=3000
JWT_SECRET=sabiwork-dev-secret-change-in-production
SERVICE_KEY=sabiwork-bot-secret

# WebSocket
NEXT_PUBLIC_WS_URL=ws://localhost:3000/dashboard/feed
NEXT_PUBLIC_API_URL=http://localhost:3000
```

---

## Four Pillars Addressed

| Pillar | How SabiWork Delivers |
|--------|----------------------|
| **AI Automation** | Groq-powered intent classification, worker-buyer matching (Llama 3.3-70b ranking), NLP trade parsing from WhatsApp messages, demand-driven career pathway recommendations |
| **Squad APIs** | 6 products integrated end-to-end: payment initiation, verification, webhooks, bank transfer payouts, virtual accounts, account lookup |
| **Use of Data** | TimescaleDB time-series analytics, real-time economic dashboards, transaction pattern analysis, demand heatmaps via Mapbox |
| **Financial Innovation** | SabiScore (0–100) as alternative credit identity built from informal transactions; progressive financial access (savings → microloans → full suite); crowd-invest micro-funding for traders; auto-split repayment engine; trust-based pricing tiers — replaces traditional credit bureaus for the unbanked |

---

## Demo & Testing

### Test Scripts

```bash
# Run end-to-end flow tests (requires services running)
./scripts/test-buyer-flow.sh
./scripts/test-trader-flow.sh
./scripts/test-seeker-flow.sh

# Simulate live economic events for dashboard demo
./scripts/demo-simulate.sh
```

### Squad Webhook Testing

```bash
ngrok http 3000
# Set webhook URL in Squad sandbox dashboard:
# https://your-id.ngrok.io/api/webhooks/squad
```

### Demo Credentials

The seed script creates test users automatically. Check the backend logs on first boot for demo login credentials, or use the seeded accounts:

- **Buyer:** Log in via PWA with phone number `08012345678`
- **Worker:** Seeded plumber, electrician, tailor profiles with transaction history
- **Trader:** Send WhatsApp messages like `"sold 5 bags cement 120000"` to test NLP parsing

---

## User Flows

All users can access SabiWork through the **PWA** or **WhatsApp**. A **USSD gateway** (`*347*777#`) serves users on feature phones with no internet. A dedicated **mobile app** (React Native) is planned for future release.

| # | User | Flow |
|---|------|------|
| 1 | **Buyer** | Chat with AI → get matched to worker → pay via Squad → worker notified → job completed → rating → payout sent |
| 2 | **Worker** | Onboard (self-serve or via field agent) → virtual account created → receive jobs → complete & get paid → SabiScore grows → unlock microloans |
| 3 | **Trader** | Send natural language sale messages → NLP parses transaction → SabiScore updates → weekly financial reports → unlock crowd-invest funding |
| 4 | **Investor** | Browse open investment rounds → fund a trader (micro-invest) → auto-repayment split from trader sales → track returns in portfolio |
| 5 | **Seeker** | View demand heatmap → identify skills gaps → find apprenticeships → apply → learn → graduate to worker |
| 6 | **Field Agent** | GPS-verified onboarding of workers/traders in markets → earn commission per onboard → trust_score boost for verified users |

### Channel Coverage

| Channel | Users Served |
|---------|-------------|
| PWA | Buyers, Workers, Investors, Seekers |
| WhatsApp | Traders, Workers, Seekers, Investors |
| USSD (`*347*777#`) | All users on feature phones (no data required) |
| Mobile App *(roadmap)* | All users (React Native, planned) |

---

## Financial Innovation — SabiScore as Credit Identity

SabiScore (0–100) is an alternative credit scoring system built entirely from informal economic activity. Every completed gig, every logged sale, every on-time investor repayment, and every positive rating contributes to a verifiable financial identity — replacing the traditional credit bureau model that excludes 60M+ informal workers.

**Progressive financial access:** SabiScore 30+ → savings products | SabiScore 50+ → microloans | SabiScore 70+ → full financial suite + crowd-invest eligibility

This turns everyday hustle into bankable trust — *"Sabi dey pay"* becomes a provable statement.

---

## Team

Built for Squad Hackathon 3.0 — Challenge 02: Intelligent Economic System

| Name | Role |
|------|------|
| TBD | Backend / AI |
| TBD | Frontend / PWA |
| TBD | Design / UX |
| TBD | Product / Demo |

---

## License

Hackathon submission. All rights reserved.
