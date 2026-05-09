# SabiWork — Technical Design Specification

**Squad Hackathon 3.0 — Challenge 02: Intelligent Economic System**
**Date:** 2026-05-09
**Timeline:** 1-3 days (hackathon build)

---

## 1. Overview

SabiWork is an AI-powered economic intelligence platform that connects informal workers, traders, and job seekers to financial services through a data-generating ecosystem. Every transaction builds a financial identity, trains the AI to make better decisions, and generates economic intelligence.

**Tagline:** "Sabi dey pay."

**Three product layers, one data flywheel:**

| Layer | What It Does | Who It Serves |
|---|---|---|
| SabiWork Match | AI matching between buyers and workers, trust scoring, Squad payments | Service workers + buyers |
| SabiWork Trade | Sales logging and analytics via WhatsApp | Market traders, vendors |
| SabiWork Pathway | Skills demand mapping, apprenticeship matching | Unemployed youth |

---

## 2. Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Backend | Express.js 5, Knex, Node 22 | Team expertise, code reuse from existing project |
| Database | PostgreSQL 16 + TimescaleDB | Time-series demand data + relational core |
| Cache | Redis 7 | Trust scores, idempotency, demand caches |
| AI | Groq SDK (Llama 3.1-8b-instant, 3.3-70b-versatile) | Fast inference, free tier, sufficient for classification/matching |
| PWA | React 19, Vite 6, Mapbox GL JS v3, Zustand, Tailwind v4 | Lightweight, PWA-native, map performance |
| Dashboard | Next.js 16, shadcn/ui, Tailwind v4, WebSocket | Adapted from existing iroyinayo-admin codebase |
| WhatsApp | Baileys (headless WhatsApp client) | Adapted from existing iroyinayo codebase, no API key needed |
| Payments | Squad API (sandbox for demo, all 4 product categories) | Hackathon requirement — 25% of score |
| Maps | Mapbox GL JS v3 (custom styled) | Custom markers, heat maps, clustering, performant |
| Deploy | Docker Compose (local) + ngrok (webhooks) | One-command setup, judge-reproducible |

---

## 3. Project Structure

```
SabiWork/
├── backend/                        # Express.js API
│   ├── src/
│   │   ├── index.js               # Server entry, middleware, route mounting
│   │   ├── config.js              # Env vars
│   │   ├── database/
│   │   │   ├── knex.js            # Knex instance
│   │   │   ├── knexfile.js        # Migration config
│   │   │   └── migrations/        # Schema migrations (11 files)
│   │   ├── routes/
│   │   │   ├── jobs.js            # Job creation, matching, status
│   │   │   ├── workers.js         # Worker CRUD, onboarding
│   │   │   ├── traders.js         # Trader profiles, sales logging
│   │   │   ├── seekers.js         # Job seeker profiles + pathway
│   │   │   ├── payments.js        # Squad payment initiation + verify
│   │   │   ├── webhooks.js        # Squad webhook handler
│   │   │   ├── chat.js            # AI chat endpoint (Groq)
│   │   │   └── intelligence.js    # EI Engine queries
│   │   ├── services/
│   │   │   ├── squad.js           # Squad API client (all flows)
│   │   │   ├── matching.js        # AI matching via Groq
│   │   │   ├── trust.js           # Trust score calculation
│   │   │   ├── sabiScore.js       # Credit scoring
│   │   │   ├── demand.js          # Demand signal aggregation
│   │   │   └── nlp.js             # Trade classification
│   │   ├── middleware/
│   │   │   ├── auth.js            # JWT verification
│   │   │   └── webhookVerify.js   # Squad HMAC-SHA512
│   │   └── utils/
│   │       ├── redis.js           # Redis client
│   │       └── websocket.js       # WS for dashboard live feed
│   ├── seed.js                    # Demo data seeder
│   ├── package.json
│   └── Dockerfile
│
├── pwa/                            # React + Vite PWA
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx               # Router + layout
│   │   ├── pages/
│   │   │   ├── MapPage.jsx       # Default — full-bleed map
│   │   │   ├── PulsePage.jsx     # Personal economic dashboard
│   │   │   └── ProfilePage.jsx   # Account, bank, scores
│   │   ├── components/
│   │   │   ├── map/              # MapCanvas, WorkerMarker, layers
│   │   │   ├── chat/            # ChatSheet, AIButton, ChatBubble
│   │   │   ├── cards/           # WorkerCard, PaymentCard, DemandCard
│   │   │   └── ui/             # Shared components
│   │   ├── hooks/               # useChat, useMap, useAuth
│   │   ├── stores/appStore.js   # Zustand
│   │   ├── services/            # API client, WebSocket
│   │   └── sw.js               # Service worker
│   ├── public/manifest.json
│   ├── vite.config.js
│   └── Dockerfile
│
├── dashboard/                      # Next.js (restyled from iroyinayo-admin)
│   ├── src/
│   │   ├── app/page.js           # Single-page EI command centre
│   │   ├── components/
│   │   │   ├── LiveMap.jsx       # Embedded Mapbox
│   │   │   ├── LiveFeed.jsx      # WebSocket event stream
│   │   │   ├── DemandPanel.jsx   # Skills gaps + forecasts
│   │   │   ├── StatsRow.jsx      # Top metric cards
│   │   │   └── ChannelChart.jsx  # Payment channel breakdown
│   │   └── lib/                  # API client, WebSocket
│   ├── package.json
│   └── Dockerfile
│
├── whatsapp-bot/                   # Node.js + Baileys
│   ├── src/
│   │   ├── index.js
│   │   ├── bot/                  # connection, authState, messageHandler
│   │   ├── handlers/            # buyer, trader, worker, seeker
│   │   └── services/api.js     # Calls backend API
│   ├── package.json
│   └── Dockerfile
│
├── shared/constants.js             # Trade categories, areas, thresholds
├── docker-compose.yml
├── .env.example
├── seed-data/                      # JSON fixtures
└── README.md
```

---

## 4. Squad API Integration (25% Criterion)

Squad is the transactional nervous system. All six API products are used:

### 4.1 Payment Initiation (Buyer Pays for Job)

- `POST /transaction/initiate`
- Amount in kobo, multi-channel (card, transfer, USSD, bank)
- Transaction ref format: `SABI_{job_id}_{timestamp}`
- Metadata carries job_id, worker_id, service_category, area
- Returns checkout_url sent to buyer (in-app or WhatsApp)

### 4.2 Webhook Processing (Real-Time Event Engine)

- `POST /api/webhooks/squad`
- HMAC-SHA512 signature verification against `x-squad-encrypted-body`
- Redis idempotency (7-day TTL) prevents double processing
- Routes by event type:
  - `charge_successful` → verify → update job → log demand → update trust → notify worker → broadcast to dashboard
  - `charge_failed` → log as failed demand signal → notify buyer
  - `virtual_account_credit` → log income → update SabiScore → broadcast

### 4.3 Transaction Verification

- `GET /transaction/verify/{ref}`
- Called after webhook to confirm amount before payout
- Called before any transfer to prevent manipulation

### 4.4 Transfer (Worker Payout)

- `POST /payout/transfer`
- Net amount = job amount - 5% platform fee
- On 200: payout confirmed, NIP reference stored, worker notified
- On 424 (timeout): schedule requery after 2 min, NEVER re-initiate

### 4.5 Payout Requery (Resilience)

- `POST /payout/requery`
- Handles timeout scenarios without double-paying
- Job payout_status tracks: pending → success | failed | requeried

### 4.6 Virtual Account Creation

- `POST /virtual-account/create` on worker/trader onboarding
- Returns GTBank virtual account number
- Persistent financial identity — any payment to VA auto-logged
- VA credit webhook feeds SabiScore passively

### 4.7 Account Lookup (Bank Verification)

- `POST /payout/account/lookup` during onboarding
- Validates bank details before any payout
- Account name stored on worker profile

### Demo Visibility

In the 5-minute demo, Squad appears at 5 distinct moments:
1. Worker onboarding → virtual account created
2. Buyer pays → checkout URL, payment completes
3. Webhook fires → dashboard live feed updates in real-time
4. Worker payout → instant transfer after job confirmed
5. Trust + SabiScore update → driven by Squad payment data

---

## 5. AI/Matching Layer (Groq)

### 5.1 Four AI Functions

| Function | Model | Input → Output |
|---|---|---|
| Intent Classification | llama-3.1-8b-instant | Natural language → {trade, location, urgency} |
| Worker Matching | llama-3.3-70b-versatile | Intent + candidates → ranked list + reasoning |
| Trade Classification | llama-3.1-8b-instant | Trader message → {item, quantity, amount, category} |
| Pathway Recommendation | llama-3.3-70b-versatile | Demand + supply data → ranked career advice |

### 5.2 Hybrid Matching (SQL + AI)

1. **SQL filtering** (deterministic): workers by trade, distance (Haversine), availability, trust score
2. **AI ranking** (contextual): soft factors like speciality match, buyer context
3. **AI response generation**: warm, Pidgin-sprinkled conversational reply

### 5.3 Fallback Strategy

If Groq is down or slow (>3s):
- Intent → keyword matching
- Ranking → pure trust + distance sort
- Trade classification → regex patterns
- Demo never breaks.

### 5.4 "Learns Over Time" (Hackathon Criterion)

| Signal | What Improves |
|---|---|
| Completed jobs | Matching knows which combos succeed |
| Ratings | Low-rated workers deprioritised |
| Unmatched requests | Demand signals grow, pathway recs improve |
| Repeat bookings | Reliability weighted higher |
| Sales logs | Seasonal patterns, category forecasting |
| Price accumulation | Area-specific price suggestions |

Seed data simulates 3 months of accumulated intelligence.

---

## 6. Data Models

### Core Tables

**workers** — id, name, phone, primary_trade, secondary_trades[], service_areas[], location_lat/lng, bank_code, account_number, account_name, virtual_account_number, trust_score (0-1), sabi_score (0-100), total_jobs, total_income, accepts_apprentices, apprentice_slots, is_available, onboarding_channel, onboarded_by, photo_url, gps_verified, last_active_at, created_at

**buyers** — id, name, phone, email, area, location_lat/lng, created_at

**jobs** — id, buyer_id, worker_id, service_category, description, area, location_lat/lng, agreed_amount, status (created→payment_pending→paid→in_progress→completed→payout_sent), transaction_ref, payment_channel, paid_at, payout_ref, payout_amount, payout_status, payout_nip_ref, buyer_rating, created_at, completed_at

**traders** — id, name, phone, business_type, area, location_lat/lng, virtual_account_number, sabi_score, total_logged_sales, total_logged_revenue, created_at

**sales_logs** — id, trader_id, amount, item_name, quantity, category, payment_method, squad_ref, logged_at

**seekers** — id, name, phone, area, location_lat/lng, interests[], created_at

**apprenticeships** — id, master_worker_id, apprentice_id, trade, duration_weeks, weekly_stipend, status (active/completed/dropped), milestones_completed, total_milestones, started_at

**demand_signals** (TimescaleDB hypertable) — id, trade_category, area, location_lat/lng, request_type, amount, matched, payment_channel, recorded_at (partition key)

**trust_events** — id, worker_id, event_type, score_delta, score_after, job_id, created_at

**webhook_events** — id, transaction_ref, event_type, payload (JSONB), processed, received_at

**agents** — id, name, phone, area_assigned, workers_onboarded, is_active, created_at

### Key Indexes

- GIN index on workers.service_areas
- workers(primary_trade), workers(trust_score DESC)
- demand_signals(trade_category, area)
- UNIQUE on webhook_events(transaction_ref)
- sales_logs(trader_id, logged_at DESC)

### Redis Keys

- `trust:{worker_id}` — cached score (5min TTL)
- `idempotent:{transaction_ref}` — webhook dedup (7-day TTL)
- `demand_cache:{area}:{trade}` — aggregated demand (1hr TTL)
- `active_job:{job_id}` — current job state

---

## 7. Multi-Channel Onboarding + GIS

### Three Channels, One Worker Profile

| Channel | Target User | Requirements | Location Capture |
|---|---|---|---|
| WhatsApp | Smartphone workers | WhatsApp + data | Area name only (from selection) |
| USSD (*737*99#) | Feature-phone workers | Any phone, no data | None (field agent fills later) |
| Field Agent (PWA) | All workers, especially in markets | Agent with smartphone | Precise GPS (navigator.geolocation) |

### WhatsApp Onboarding (5 messages, <2 min)

1. Name → 2. Trade (numbered list) → 3. Areas (multi-select) → 4. Bank details → 5. Confirmation + virtual account

### USSD Onboarding (7 screens)

Dial *737*99# → Name → Trade → Area → Bank → Account number → Confirmation. Jobs sent via SMS.

### Field Agent Mode (PWA)

- Form with name, phone, trade, areas, bank
- GPS auto-captured at registration point (precise workshop location)
- Agent-verified workers start at trust 0.05 (physically confirmed)
- Enables bulk onboarding (20 workers in 2 hours)

### GIS Integration Across Platform

| System | GIS Application |
|---|---|
| **Matching** | Haversine distance calculation — "1.2km, ~18 min" precise ETA |
| **Demand Heat Maps** | Coordinates bucketed for Mapbox heatmap layer |
| **Skills Gap Detection** | Areas with demand but no worker within radius |
| **Pathway Recommendations** | "You'd be the only tiler within 2km of these 47 requests" |
| **Worker Location Updates** | Position updates on job accept/complete |
| **SabiScore** | Location consistency as creditworthiness signal |
| **Dashboard** | Live geographic intelligence — where money moves |
| **Field Agent Routing** | Priority zones: high demand + zero supply |
| **Demand Forecasting** | Spatial + temporal patterns (Saturday demand shifts residential) |

---

## 8. PWA Design (React + Vite)

### Architecture

- Map never unmounts (persists across tab switches)
- 3 routes: / (map), /pulse (personal dashboard), /profile
- Zustand store: user, workers, map state, chat, active job
- Chat messages typed by backend: text, worker_card, payment_card, tracking_card, rating_card, payout_card, demand_card, apprenticeship_card
- PWA manifest + service worker: installable, cached map tiles, offline profile

### Map Page (Default)

- Full-bleed Mapbox with custom warm light style
- Worker markers coloured by trust tier (emerging=green, trusted=dark-green, verified=blue, elite=gold)
- Layer toggle chips: Workers | Demand | Gaps
- Demand heat map at low zoom, individual markers at high zoom
- Skills gap: pulsing circles in underserved areas

### AI Button (FAB)

- Fixed bottom-right, 56px, orange (#E8630A), sparkle icon
- Breathing glow animation (subtle)
- Taps to open ChatSheet (bottom 65% of screen)
- Status dot when active job exists

### Chat Flow (Demo Journey)

1. User types need → 2. AI classifies + matches → 3. Worker card shown (map flies to marker) → 4. Book → 5. Squad checkout → 6. Payment confirmed → 7. Tracking card → 8. Job done → 9. Rating → 10. Payout card (trust + SabiScore update)

### Pulse Tab

- Worker: income chart, trust ring, SabiScore bar, insight, financial services unlocked
- Trader: weekly revenue, top items, SabiScore progress to loan
- Seeker: demand near you, apprenticeship progress, motivational insight

### Field Agent Mode

- Detected from user.role === 'agent'
- Bottom nav changes: Map | Onboard | Stats
- Onboard page: registration form + auto GPS capture

### Performance Budget

- < 300KB gzipped
- 48px minimum touch targets
- No heavy animations (transform + opacity only)
- Map tiles cached by service worker

---

## 9. Economic Intelligence Dashboard

### Single-Page Command Centre (Dark Theme)

Adapted from existing iroyinayo-admin Next.js app. No sidebar — everything on one screen.

### Layout

- **Top:** 5 stat cards (volume today, jobs, workers paid, traders active, SabiScore distribution)
- **Left:** Live map (same Mapbox style) + Live transaction feed (WebSocket)
- **Right:** Demand intelligence (skills gaps) + Payment channels chart + Financial inclusion metrics

### Real-Time Behaviour

- WebSocket connection to backend (/dashboard/feed)
- Events: payment received, payout sent, sale logged, worker onboarded, apprenticeship started, unmatched demand
- Map markers pulse on new transaction at that location
- Feed items slide in from right, newest at top
- Stat numbers count up from 0 on page load

### Design Tokens

- Background: #0A0A0A
- Surface: #1A1A1A, border: #2A2A2A
- Text: #F5F5F5 primary, #AAAAAA secondary
- Accents: sabi-green (#1B7A3D), work-orange (#E8630A), cash-gold (#F9A825), alert-red (#D32F2F)

### API Endpoints

- `GET /api/intelligence/stats`
- `GET /api/intelligence/gaps`
- `GET /api/intelligence/demand-heat?bounds=...`
- `GET /api/intelligence/channels`
- `GET /api/intelligence/forecast?trade=&area=`
- `GET /api/intelligence/financial-inclusion`
- `WS /dashboard/feed`

---

## 10. WhatsApp Bot (Baileys)

### Adapted from Iroyinayo

Reuses: connection.js, authState.js, message routing pattern, conversation state Map, cron scheduler. Replaces: all handlers and commands.

### Commands

| Command | Handler | Flow |
|---|---|---|
| register/join/start | onboard | 5-step worker registration |
| "I need a plumber" (AI-classified) | buyer | Match → book → pay |
| "sold 3 bags rice 75000" (pattern) | trader | Parse → log → stats |
| "I want to find work" (AI-classified) | seeker | Demand map → apprenticeships |
| READY/BUSY | worker | Toggle availability |
| REPORT | trader | Weekly sales summary |
| SCORE | score | Show SabiScore + trust |
| BOOK/NEXT | buyer | Continue matching flow |
| ACCEPT/DECLINE | worker | Respond to job alert |
| APPLY | seeker | Apply for apprenticeship |

### Worker Notifications (Backend → Bot)

- Job alert: new paid job, amount, distance, accept/decline
- Payout confirmation: amount, bank, trust update, SabiScore
- Morning demand digest (7am cron): requests near you today

### Bot → Backend Communication

Bot calls backend REST API with `x-service-key` header. No direct DB access from bot.

---

## 11. Trust Score System

### Signals

| Signal | Delta | Source |
|---|---|---|
| Payment within 2hrs of match | +0.02 | Webhook timestamp vs job creation |
| Any payment received | +0.005 | Webhook charge_successful |
| Repeat buyer re-books | +0.03 | Buyer-worker pair in history |
| Dispute/chargeback | -0.08 | Squad dispute event |
| Digital payment channel | +0.01 | Webhook transaction_type |
| 3+ consecutive no-dispute | +0.015 | Streak calculation |
| Rating per star above 3 | +0.01 | Post-job rating |
| Rating per star below 3 | -0.02 | Post-job rating |
| Apprentice trained | +0.05 | Apprentice completes pathway |
| Agent-verified onboarding | +0.05 (initial) | Field agent registration |

### Tiers

| Score | Badge | Unlocks |
|---|---|---|
| 0.00–0.29 | Emerging | Basic matching |
| 0.30–0.59 | Trusted | Priority matching, map visibility |
| 0.60–0.79 | Verified | Accept apprentices, SabiScore eligible |
| 0.80–1.00 | Elite | Premium pricing, loan eligibility |

Capped at 1.0, floored at 0.0. Real-time in Redis, persisted in PostgreSQL. 0.7 dampening factor.

---

## 12. SabiScore (Credit Scoring)

### Components

| Signal | Weight | Source |
|---|---|---|
| Transaction consistency | 25% | Squad payment history |
| Income growth trend | 15% | Month-over-month revenue |
| Trust score | 20% | SabiWork trust engine |
| Customer diversity | 15% | Unique buyer count |
| Digital engagement | 10% | App/WhatsApp activity |
| Location consistency | 10% | GIS — stable operating location |
| Repayment history | 5% | Partner MFI data (future) |

### Tiers

- 0–29: No products. "Keep logging."
- 30–49: Savings unlocked.
- 50–69: Microloan eligible.
- 70+: Full financial suite.

---

## 13. Seed Data Plan

| Entity | Count | Purpose |
|---|---|---|
| Workers | 20 | 5 areas, 6 trades, all trust tiers, real Lagos GPS |
| Buyers | 10 | Diverse areas |
| Traders | 5 | Different market types, 3 months history |
| Seekers | 5 | Different areas/interests |
| Completed Jobs | 50 | Generates trust scores, payment history |
| Sales Logs | 200 | 3 months trader data, powers SabiScore |
| Demand Signals | 500 | Powers heat maps, gap analysis, forecasts |
| Trust Events | 100+ | Auto-generated from jobs |
| Apprenticeships | 3 | 1 active, 1 completed, 1 new |
| Agents | 2 | Field agents with stats |

**Intentional patterns in seed data:**
- Surulere: almost no tilers, high tiling demand → CRITICAL gap on dashboard
- Emeka (worker): trust 0.76, poster child for buyer demo flow
- Mama Ngozi (trader): SabiScore 43, "7 weeks to loan" — shows progression
- Demand clustered around 3rd Mainland Bridge axis → visible heat map pattern

---

## 14. Docker Compose & Deployment

### Services

| Service | Port | Image/Build |
|---|---|---|
| postgres | 5432 | timescale/timescaledb:latest-pg16 |
| redis | 6379 | redis:7-alpine |
| backend | 3000 | ./backend |
| pwa | 5173 | ./pwa |
| dashboard | 3001 | ./dashboard |
| whatsapp-bot | 3002 | ./whatsapp-bot |

### Startup Order

1. postgres + redis (healthchecked)
2. backend (runs migrations → seeds → starts)
3. pwa, dashboard, whatsapp-bot (parallel, depend on backend)

### Judge Reproduction

```bash
git clone → cp .env.example .env → add API keys → docker-compose up
```

Everything starts. PWA at :5173, Dashboard at :3001, API at :3000.

### ngrok for Squad Webhooks

```bash
ngrok http 3000
# Set https://xxx.ngrok.io/api/webhooks/squad as webhook URL in Squad sandbox
```

---

## 15. Demo Script (5 Minutes)

| Time | Action | What Judges See |
|---|---|---|
| 0:00–0:30 | Dashboard with seeded data | "3 months of economic intelligence" |
| 0:30–1:00 | PWA map, tap markers, toggle layers | Map-first UX, trust tiers, demand heat |
| 1:00–2:30 | Buyer flow: AI chat → match → Squad pay → payout | Full E2E with live Squad sandbox |
| 2:30–3:00 | Dashboard updates live | Payment in feed, stats increment |
| 3:00–3:45 | Trader WhatsApp: log sale → report | NLP parsing, SabiScore update |
| 3:45–4:15 | Job seeker pathway | Demand map → apprenticeship → apply |
| 4:15–4:45 | Field agent onboarding (PWA) | GPS capture, bulk potential |
| 4:45–5:00 | Dashboard zoom-out | "Every transaction makes it smarter" |

---

## 16. Build Priority Order

### Day 1: Foundation + Squad

- Express backend scaffold (routes, middleware, config)
- Database migrations (all 11 tables)
- Squad service layer (all 6 API products)
- Webhook handler (HMAC verify, idempotent, routes events)
- Trust score service
- Seed script
- PWA scaffold (Vite + React + Mapbox + basic map rendering)

### Day 2: PWA + Dashboard + AI

- Groq integration (intent classification, matching, trade parsing)
- Chat endpoint (full buyer flow)
- PWA complete: AI button, chat sheet, worker cards, payment flow, tracking
- Dashboard: restyle iroyinayo-admin, add LiveMap, LiveFeed (WebSocket), DemandPanel
- Pulse tab (worker + trader + seeker variants)

### Day 3: WhatsApp + Polish + Ship

- WhatsApp bot: adapt handlers (onboard, buyer, trader, seeker, worker alerts)
- Connect bot to backend API
- End-to-end testing (buyer pays → webhook → payout → dashboard updates)
- GitHub README cleanup + documentation
- Demo rehearsal
- Deploy if needed (Railway/Render as backup to local)

---

## 17. Judging Criteria Alignment

| Criterion (Weight) | How We Score |
|---|---|---|
| **Squad API (25%)** | 6 API products, visible at 5 demo moments, drives trust + credit scoring |
| **Technical Architecture (20%)** | Clear data flow, AI/SQL hybrid matching, TimescaleDB for time-series, WebSocket for real-time, GIS throughout |
| **Problem Understanding (20%)** | Multi-channel onboarding (WhatsApp/USSD/field agent), location as credit signal, data flywheel, pidgin-first UX |
| **Economic Viability (20%)** | 5% platform fee, SabiScore → MFI partnerships, city-by-city scaling, financial products roadmap |
| **Presentation (15%)** | Live working demo, PWA + Dashboard side-by-side, Squad flow visible in real-time |
| **Impact Bonus (10%)** | 500 workers × ₦120k/month = ₦60M monthly income created, 150+ financial identities, 20+ apprenticeships |
