# SabiWork — Product Requirements Document

**Squad Hackathon Submission**
**Version:** 2.0
**Date:** May 2026

---

## 1. The Problem We're Solving

A mid-sized African nation is experiencing high youth unemployment and a fragmented informal economy. Nigeria's informal sector employs over 80% of the workforce — an estimated 60 million people — but operates almost entirely without data. No transaction records. No reputation systems. No credit history. No demand signals.

This isn't just a marketplace problem. It's an economic intelligence problem. The informal economy generates massive value but produces almost no usable data, which means:

- A skilled plumber in Yaba has no way to prove he's skilled
- A tomato trader in Mile 12 can't get a loan because she has no financial history
- A 22-year-old graduate in Surulere doesn't know which trades are in demand near him
- Banks and MFIs can't lend to any of them because the data doesn't exist
- Government can't plan workforce development because they can't see the economy

The missing piece isn't a marketplace or a payment app. It's a **data layer for the informal economy** — one that turns everyday transactions into economic intelligence.

---

## 2. What SabiWork Is

SabiWork is an AI-powered economic intelligence platform that connects three groups — **service workers**, **informal traders**, and **job seekers** — with each other and with financial services, through a single data-generating ecosystem.

Every interaction on SabiWork produces data. Every transaction builds a financial identity. Every completed job trains the AI to make better economic decisions. The more people use SabiWork, the smarter the entire system becomes.

**SabiWork is three products in one platform:**

| Layer | What It Does | Who It Serves |
|---|---|---|
| **SabiWork Match** | AI-powered matching between buyers and skilled workers, with trust scoring and instant payment via Squad | Service workers (plumbers, electricians, tailors, mechanics) and the buyers who need them |
| **SabiWork Trade** | Transaction logging, inventory tracking, and sales analytics for informal traders via WhatsApp | Market traders, roadside vendors, small shop owners |
| **SabiWork Pathway** | Skills demand mapping, apprenticeship matching, and upskilling recommendations for unemployed youth | Job seekers, school leavers, career switchers |

All three layers feed into a shared **Economic Intelligence Engine** that generates insights for users, financial institutions, and policymakers.

**Tagline:** "Sabi dey pay." (Pidgin — "Skill gets paid here.")

---

## 3. The Data Flywheel

This is the core of SabiWork's design. Every user action feeds the system, and the system gets smarter with every cycle.

```
                    ┌──────────────────────────┐
                    │   MORE USERS TRANSACT     │
                    │   (workers, traders,       │
                    │    job seekers)            │
                    └────────────┬───────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │   MORE TRANSACTION DATA   │
                    │   (payments, sales logs,   │
                    │    job completions,         │
                    │    ratings, location data)  │
                    └────────────┬───────────────┘
                                 │
                    ┌────────────┴───────────────┐
                    │                            │
                    ▼                            ▼
       ┌─────────────────────┐     ┌─────────────────────────┐
       │  BETTER AI DECISIONS │     │  STRONGER FINANCIAL      │
       │                     │     │  IDENTITIES              │
       │  • Smarter matching │     │                          │
       │  • Demand forecasts │     │  • Trust scores          │
       │  • Skills gap maps  │     │  • Credit signals        │
       │  • Dynamic pricing  │     │  • Transaction histories │
       │  • Workforce recs   │     │  • Revenue patterns      │
       └──────────┬──────────┘     └──────────┬──────────────┘
                  │                            │
                  ▼                            ▼
       ┌─────────────────────┐     ┌─────────────────────────┐
       │  BETTER USER         │     │  ACCESS TO FINANCIAL     │
       │  OUTCOMES            │     │  SERVICES                │
       │                     │     │                          │
       │  • Faster matches   │     │  • Microloans            │
       │  • Higher earnings  │     │  • Savings products      │
       │  • Career guidance  │     │  • Insurance             │
       └──────────┬──────────┘     └──────────┬──────────────┘
                  │                            │
                  └────────────┬───────────────┘
                               │
                               ▼
                  ┌──────────────────────────┐
                  │   MORE USERS JOIN         │
                  │   (word of mouth,         │
                  │    financial incentives,   │
                  │    better outcomes)        │
                  └──────────────────────────┘
```

Each turn of the flywheel makes SabiWork harder to replicate. A competitor can copy the UI. They can't copy 18 months of transaction data, trust scores, demand maps, and credit signals.

---

## 4. The Three User Personas

### Persona 1: The Service Worker (Emeka)

- **Who:** Plumber in Yaba, 31, has a Kuda MFB account, no formal work history
- **Problem:** Gets jobs only through word of mouth. No way to prove reliability to new customers. Can't get a loan because no bank recognises his income.
- **SabiWork gives him:** A trust score built from verified payments, a virtual bank account (Squad), a public professional profile, and eventually a credit score that unlocks microloans.
- **Channel:** WhatsApp for job alerts, app for profile and payments

### Persona 2: The Informal Trader (Mama Ngozi)

- **Who:** Sells provisions and household goods from a shop in Mushin, 45, uses OPay for personal transfers, no financial records
- **Problem:** No sales tracking. No inventory management. No way to prove monthly revenue to a lender. Cash-in, cash-out, no data trail.
- **SabiWork gives her:** A WhatsApp-based sales logger ("sold 3 bags of rice ₦75,000" → logged with timestamp and category), weekly/monthly revenue reports, and a transaction-backed financial identity she can use to apply for inventory loans.
- **Channel:** WhatsApp only (no app needed)

### Persona 3: The Job Seeker (Tunde)

- **Who:** 22, graduated with a diploma, lives in Surulere, no clear career path, no connections to the informal trades economy
- **Problem:** Doesn't know which skills are in demand. Doesn't know how to find an apprenticeship. Traditional job boards don't list informal work.
- **SabiWork gives him:** A demand heat map showing which trades have the most unmet buyer requests in his area, apprenticeship listings with trusted workers, and a skills pathway: "Electricians in Surulere earn ₦180k/month average. 3 master electricians are accepting apprentices. Tap to apply."
- **Channel:** App (map-first) and WhatsApp

---

## 5. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                        SABIWORK PLATFORM                             │
│                                                                      │
│   ┌─────────────┐  ┌───────────────┐  ┌───────────────────────┐     │
│   │  WhatsApp    │  │  USSD Gateway │  │  Mobile App           │     │
│   │  Bot         │  │  (*737*99#)   │  │  (Map + AI Chat)      │     │
│   └──────┬──────┘  └───────┬───────┘  └──────────┬────────────┘     │
│          └─────────────────┼─────────────────────┘                   │
│                            │                                         │
│                   ┌────────▼────────┐                                │
│                   │  FastAPI Backend │                                │
│                   └───┬────┬────┬───┘                                │
│                       │    │    │                                     │
│          ┌────────────┘    │    └───────────────┐                    │
│          ▼                 ▼                    ▼                    │
│  ┌───────────────┐ ┌──────────────┐  ┌──────────────────┐          │
│  │ SQUAD SERVICE │ │ AI ENGINE    │  │ ECONOMIC          │          │
│  │ LAYER         │ │              │  │ INTELLIGENCE      │          │
│  │               │ │ • Matching   │  │ ENGINE            │          │
│  │ • Payments    │ │ • NLP intent │  │                   │          │
│  │ • Transfers   │ │ • Demand     │  │ • Demand maps     │          │
│  │ • Virtual     │ │   forecasts  │  │ • Skills gaps     │          │
│  │   Accounts    │ │ • Skills gap │  │ • Credit signals  │          │
│  │ • Webhooks    │ │   analysis   │  │ • Price indices   │          │
│  │               │ │ • Credit     │  │ • Workforce recs  │          │
│  │               │ │   scoring    │  │ • Growth trends   │          │
│  └───────┬───────┘ └──────┬───────┘  └────────┬─────────┘          │
│          │                │                    │                     │
│          └────────────────┼────────────────────┘                    │
│                           │                                          │
│                  ┌────────▼────────┐                                 │
│                  │   DATA LAKE     │                                 │
│                  │                 │                                 │
│                  │  PostgreSQL +   │                                 │
│                  │  Redis +        │                                 │
│                  │  TimescaleDB    │                                 │
│                  └─────────────────┘                                 │
└───────────────────────┬──────────────────┬───────────────────────────┘
                        │                  │
              ┌─────────▼──────┐  ┌────────▼──────────┐
              │  SQUAD APIs    │  │  PARTNER APIs      │
              │  (Payments)    │  │  (MFIs, insurers,  │
              │                │  │   training orgs)   │
              └────────────────┘  └───────────────────┘
```

### Stack

| Layer | Technology |
|---|---|
| Backend | Python / FastAPI |
| AI/ML | Claude API (matching, NLP, demand analysis), scikit-learn (trust scoring, credit signals) |
| Database | PostgreSQL (core data), TimescaleDB (time-series: transactions, demand signals) |
| Cache | Redis (trust scores, demand caches, idempotency) |
| Task Queue | Celery + Redis (requery scheduling, report generation) |
| Payments | Squad API (sandbox for hackathon, production for launch) |
| WhatsApp | WhatsApp Business API (Cloud API) |
| USSD | Africa's Talking USSD Gateway |
| Maps | Mapbox GL (custom styled) |
| Hosting | Railway / Render |

---

## 6. The Economic Intelligence Engine

This is what separates SabiWork from a payment-enabled job board. The EI Engine runs on top of every transaction and produces four categories of intelligence:

### 6.1 Demand Forecasting

Every buyer request is a demand signal. The AI aggregates and analyses these in real time.

**Input data:** Buyer requests (service type, location, time), completed jobs, seasonal patterns, weather data, event calendars.

**Output examples:**

- "Plumbing requests in Yaba spike 40% during rainy season (June–September). Currently 14 registered plumbers serve this area. Recommended: recruit 8 more before June."
- "Generator repair demand in Lekki Phase 1 has grown 23% month-over-month. Only 3 registered technicians. Price pressure: buyers are willing to pay 30% above average. Opportunity alert sent to 12 electricians within 5km."
- "Tailoring demand peaks 3 weeks before Christmas and Easter. Current capacity can handle 60% of projected demand in Ikeja."

**How it works technically:**

```python
async def generate_demand_forecast(area: str, trade: str, period_months: int = 3) -> dict:
    """
    Uses historical request data + seasonal patterns to forecast
    demand for a specific trade in a specific area.

    Fed by: every buyer request (matched or unmatched), job completions,
    search queries in the AI chat.
    """
    # Pull historical demand from TimescaleDB
    historical = await db.fetch_all("""
        SELECT
            time_bucket('1 week', requested_at) AS week,
            COUNT(*) AS request_count,
            COUNT(*) FILTER (WHERE status = 'matched') AS matched_count,
            COUNT(*) FILTER (WHERE status = 'unmatched') AS unmatched_count,
            AVG(agreed_amount) AS avg_price
        FROM job_requests
        WHERE area = :area AND trade_category = :trade
          AND requested_at >= NOW() - INTERVAL ':months months'
        GROUP BY week ORDER BY week
    """, {"area": area, "trade": trade, "months": period_months})

    # Count active supply
    active_workers = await db.fetch_one("""
        SELECT COUNT(*) AS count
        FROM workers
        WHERE primary_trade = :trade
          AND service_areas @> ARRAY[:area]
          AND last_active_at >= NOW() - INTERVAL '7 days'
    """, {"trade": trade, "area": area})

    # Calculate supply gap
    avg_weekly_demand = sum(r["request_count"] for r in historical) / len(historical)
    unmatched_rate = sum(r["unmatched_count"] for r in historical) / max(sum(r["request_count"] for r in historical), 1)
    supply_count = active_workers["count"]

    # Simple forecast: trend + seasonal adjustment
    trend = calculate_trend(historical)  # Linear regression on weekly counts
    seasonal_factor = get_seasonal_factor(trade, area)  # From historical patterns

    forecast_weekly = avg_weekly_demand * (1 + trend) * seasonal_factor
    supply_gap = max(0, forecast_weekly - (supply_count * 3))  # Assume 3 jobs/worker/week capacity

    return {
        "area": area,
        "trade": trade,
        "current_weekly_demand": round(avg_weekly_demand),
        "forecast_weekly_demand": round(forecast_weekly),
        "active_workers": supply_count,
        "unmatched_rate": round(unmatched_rate * 100, 1),
        "supply_gap": round(supply_gap),
        "avg_price": round(sum(r["avg_price"] for r in historical if r["avg_price"]) / len(historical)),
        "trend_direction": "growing" if trend > 0.02 else "declining" if trend < -0.02 else "stable",
        "recommendation": generate_recommendation(supply_gap, unmatched_rate, trend)
    }
```

### 6.2 Skills Gap Analysis

The AI compares demand signals (what buyers are asking for) against supply data (what workers are available) to identify skills gaps — and then routes unemployed youth toward those gaps.

**Input data:** Unmatched buyer requests (demand with no supply), worker registrations by trade and area, job seeker profiles, training provider catalogues.

**Output examples:**

- "Surulere has 47 unmatched tiling requests this month but only 2 registered tilers. This is the #1 skills gap in your area."
- "Solar panel installation requests have grown 340% in 6 months across Lagos. Only 8 workers on SabiWork offer this skill. High-value opportunity: average job ₦45,000."
- "Tunde, based on your location (Surulere) and the current demand map, the top 3 trades to learn are: 1) Tiling (47 unmet requests/month, avg ₦15k/job), 2) AC repair (31 unmet, avg ₦12k/job), 3) POP ceiling (28 unmet, avg ₦20k/job)."

**This is how SabiWork addresses youth unemployment directly.** Not by listing jobs, but by showing young people *where the demand is* and connecting them to apprenticeships with trusted workers who can train them.

### 6.3 Credit Scoring from Transaction Data

Every Squad payment through SabiWork builds a financial identity. After 3 months of consistent transactions, the system generates a **SabiScore** — a creditworthiness signal that partner MFIs and digital lenders can use to underwrite microloans.

**SabiScore components:**

| Signal | Weight | Source |
|---|---|---|
| Transaction consistency (regular income over time) | 25% | Squad payment history |
| Income growth trend | 15% | Month-over-month revenue change |
| Trust score (job completion, ratings, disputes) | 20% | SabiWork trust engine |
| Customer diversity (not dependent on 1 buyer) | 15% | Unique buyer count |
| Digital engagement (logs sales, updates profile) | 10% | App/WhatsApp activity |
| Repayment history (if prior loan exists) | 15% | Partner MFI data |

**How it unlocks financial services:**

```
SabiScore 0–29:  No financial products available yet.
                 "Keep logging transactions. 2 more months to unlock savings."

SabiScore 30–49: Savings product unlocked.
                 "You qualify for SabiSave — automated daily/weekly savings via Squad."

SabiScore 50–69: Microloan eligible.
                 "Based on your ₦180k/month income and 4.6 trust score,
                  you qualify for a ₦50,000 inventory loan from [MFI Partner].
                  Tap to apply — approval in 24 hours."

SabiScore 70+:   Full financial suite.
                 "Insurance, larger loans, and business growth products available."
```

**For traders (Mama Ngozi):** Her SabiScore is built from sales logs — every "sold 3 bags rice ₦75k" she sends via WhatsApp. After 3 months, she has a revenue history that says "consistent ₦400k/month in provisions sales." That's enough for an MFI to underwrite a ₦200k inventory loan.

**For workers (Emeka):** His SabiScore is built from Squad payouts — every completed job, every on-time payment, every repeat customer. After 6 months, his profile says "₦180k/month income, 4.7 rating, 68% repeat rate, zero disputes." That's a lending profile.

### 6.4 Economic Dashboard (Intelligence for Policymakers)

SabiWork aggregates anonymised economic data into a public-facing dashboard that policymakers, NGOs, and researchers can use for workforce planning.

**Dashboard outputs:**

- Real-time informal economy activity map (job density, trade distribution, transaction volume by area)
- Skills demand/supply gap by LGA (local government area)
- Income distribution across trades and areas
- Youth employment pipeline metrics (how many job seekers entered apprenticeships, how many graduated to independent workers)
- Financial inclusion metrics (how many users unlocked savings, loans, insurance)
- Seasonal demand patterns for workforce planning

This dashboard is also the "wow" screen for the hackathon demo.

---

## 7. Squad-Powered Payment Flows

Squad is the financial rail underneath all three user types. Every naira that moves through SabiWork moves through Squad.

### 7.1 Flow 1: Buyer Pays for a Job (SabiWork Match)

**Trigger:** Buyer confirms a worker match via the app AI chat or WhatsApp.

**Steps:**

1. SabiWork creates a job record with status `payment_pending`
2. Calls Squad `POST /transaction/initiate` with amount (kobo), buyer email, metadata (`job_id`, `worker_id`, `service_category`, `area`)
3. Squad returns `checkout_url`
4. Buyer receives link via WhatsApp or in-app; pays via card, bank transfer, USSD, or mobile money
5. Squad fires `charge_successful` webhook
6. SabiWork verifies via `GET /transaction/verify/{ref}`
7. Job status → `paid`; worker and buyer notified; demand signal logged; trust signals updated

**Key details:**

- Transaction ref format: `{MERCHANT_ID}_{job_id}_{timestamp}`
- Amount always in kobo (₦5,000 = 500,000 kobo)
- `pass_charge: false` — SabiWork absorbs fees in MVP
- Metadata carries `job_id`, `worker_id`, `service_category`, `area` for the EI Engine
- Every payment — even failed ones — is a data point for demand forecasting

**USSD variant:** For feature phone buyers, payment channels restricted to `["ussd"]`. Buyer receives SMS with GTBank USSD string: `*737*50*{amount}*{ref}#`.

### 7.2 Flow 2: Instant Worker Payout

**Trigger:** Buyer confirms job completion.

**Steps:**

1. Verify original payment via Squad `GET /transaction/verify/{ref}`
2. Calculate net payout: job amount minus 5% platform fee
3. Call Squad `POST /payout/transfer` with worker's verified bank details
4. On `200`: payout confirmed, worker notified, trust score recalculated, income logged to SabiScore
5. On `424` (timeout): schedule requery via `POST /payout/requery` after 2 minutes. Never re-initiate.
6. Record payout with `nip_transaction_reference` as settlement proof

**Fee structure:**

```
Job amount:         ₦10,000
Platform fee (5%):  ₦500
Worker receives:    ₦9,500
Squad transfer fee: Absorbed by SabiWork
```

**Supported banks:** All 200+ banks on Squad's Transfer API, including MFBs where informal workers actually bank: Kuda (`090267`), OPay (`100004`), PalmPay (`100033`), FairMoney (`090551`).

**Pre-requisite:** Worker bank account verified via Squad `POST /payout/account/lookup` during onboarding. Account name stored in DB.

### 7.3 Flow 3: Virtual Account per Worker

**Trigger:** Worker completes onboarding.

**Steps:**

1. Call Squad `POST /virtual-account/create` with worker's name, phone, `customer_identifier`
2. Squad returns a GTBank virtual account number
3. Stored on worker profile; shared via WhatsApp
4. Any buyer can pay directly to this account (bank transfer, ATM deposit)
5. Squad fires `charge_successful` webhook on payment → income logged, trust signals updated

**Why this matters beyond payments:** The virtual account is a portable financial identity. It persists across jobs and clients. It generates the transaction history that feeds the SabiScore. For a worker who has never had a formal bank relationship, this is their entry point into the financial system.

### 7.4 Flow 4: Trader Sales Logging (SabiWork Trade)

**Trigger:** Trader sends a sales log via WhatsApp.

**How it works:**

```
TRADER: "sold 3 bags of rice 75000"

SABIWORK AI: "Logged! 📦

  3 × Bags of Rice — ₦75,000
  Today's total: ₦142,000 (4 sales)
  This week: ₦583,000

  Your SabiScore: 42 → 43 📈
  8 more weeks of logging to unlock microloan eligibility.

  Reply REPORT for your weekly summary."
```

**When the trader receives payment via Squad (QR, transfer, or virtual account), it's auto-logged.** When payment is cash, the trader logs manually via WhatsApp. Both count toward SabiScore.

**Data captured per sale:** Amount, category (inferred by AI from message), timestamp, location (from WhatsApp if shared), payment method (Squad or cash).

### 7.5 Flow 5: Webhooks Drive Everything

Squad sends a `POST` to `/webhooks/squad` on every payment event. SabiWork's webhook handler:

1. Verifies `x-squad-encrypted-body` via HMAC-SHA512
2. Checks Redis for idempotency (7-day TTL)
3. Routes by event type and metadata
4. For `charge_successful`:
   - Updates job/transaction status
   - Notifies relevant parties (WhatsApp)
   - Logs demand signal to TimescaleDB (trade, area, amount, channel, timestamp)
   - Updates trust score in real time
   - Updates SabiScore transaction history
   - Pushes live event to Economic Intelligence Dashboard via WebSocket

**Security:**

- Signature verification on every webhook (HMAC-SHA512)
- Redis idempotency prevents double processing/payouts
- Amount verified via Squad verify endpoint before any payout
- Secret keys in environment variables only
- Squad webhook IP optionally whitelisted: `18.133.63.109`

---

## 8. Trust Score System

The trust score is the reputation layer. It's what makes SabiWork more than a directory.

### Signals

| Signal | Impact | Source |
|---|---|---|
| Payment received within 2 hours of match | +0.02 | Webhook timestamp vs job creation |
| Payment received (any timing) | +0.005 | Webhook `charge_successful` |
| Same buyer re-books same worker | +0.03 | Repeat buyer-worker pair in payment history |
| Payment disputed or charged back | −0.08 | Squad dispute event |
| Digital payment channel (card/transfer) | +0.01 | Webhook `transaction_type` |
| 3+ consecutive jobs with no dispute | +0.015 | Streak calculation |
| Buyer rating (per star above 3) | +0.01 | In-app/WhatsApp rating |
| Buyer rating (per star below 3) | −0.02 | In-app/WhatsApp rating |
| Apprentice successfully trained | +0.05 | Apprentice completes pathway |

### Trust Tiers

| Score | Badge | Unlocks |
|---|---|---|
| 0.00–0.29 | 🌱 Emerging | Basic matching, standard payout |
| 0.30–0.59 | ✅ Trusted | Priority matching, profile visible on map by default |
| 0.60–0.79 | 🔵 Verified | Can accept apprentices, SabiScore eligible, featured in area |
| 0.80–1.00 | ⭐ Elite | Premium pricing, loan eligibility, mentor status |

Score is capped at 1.0, floored at 0.0, updated in real time (Redis for reads, PostgreSQL for persistence), and dampened by a 0.7 factor to prevent gaming.

---

## 9. SabiWork Pathway — The Youth Unemployment Solution

This is how SabiWork directly addresses "high youth unemployment" from the problem statement.

### How It Works

1. **Demand Map:** The EI Engine identifies skills gaps in each area — trades with high buyer demand but low worker supply.

2. **Pathway Recommendations:** Job seekers see personalised recommendations: "Based on your location and the current market, here are the top trades to learn, ranked by earning potential and unmet demand."

3. **Apprenticeship Matching:** Verified and Elite workers (trust score 0.6+) can list apprenticeship slots. Job seekers apply directly through the app. The AI matches based on location, stated interests, and demand data.

4. **Progress Tracking:** Apprentices log their training milestones. The master worker confirms skills acquired. After completing the pathway, the apprentice gets their own SabiWork profile, trust score (starting at 0.15 with a "Trained by [Master Worker]" badge), and virtual account.

5. **Placement:** New workers immediately enter the matching pool, with the AI routing them lower-complexity jobs initially to build their score.

### Apprenticeship Flow (WhatsApp)

```
TUNDE: "I want to learn a trade"

SABIWORK AI: "Here are the top trades in demand near Surulere:

  1. 🧱 Tiling — 47 open requests/month · avg ₦15k/job
  2. ❄️ AC Repair — 31 open requests/month · avg ₦12k/job
  3. 🏗️ POP Ceiling — 28 open requests/month · avg ₦20k/job

  Reply with a number to see apprenticeship opportunities."

TUNDE: "1"

SABIWORK AI: "Tiling apprenticeships near you:

  👷 Master Chinedu Okafor — ⭐ Elite · 4.8 rating
  📍 Yaba (3.2km from you)
  ⏱️ 3-month programme · 2 slots open
  💰 Earn ₦3,000/week during training

  Reply APPLY to send your profile to Master Chinedu."
```

---

## 10. Data Models

### Job

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `buyer_id` | UUID | FK |
| `worker_id` | UUID | FK |
| `service_category` | String | AI-classified trade |
| `area` | String | Neighbourhood |
| `location_point` | PostGIS Point | GPS coordinates for map/demand analysis |
| `agreed_amount` | Integer | Naira |
| `status` | Enum | `created`, `payment_pending`, `paid`, `in_progress`, `completed`, `payout_sent` |
| `transaction_ref` | String | Squad payment ref |
| `payment_channel` | String | card, transfer, ussd, bank |
| `paid_at` | Timestamp | From Squad webhook |
| `payout_ref` | String | Squad transfer ref |
| `payout_status` | Enum | `pending`, `success`, `failed`, `requeried` |
| `buyer_rating` | Integer | 1–5 stars |
| `demand_logged` | Boolean | Whether this request was counted in demand analytics |

### Worker

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `name` | String | |
| `phone` | String | WhatsApp number |
| `primary_trade` | String | Main skill |
| `secondary_trades` | Array[String] | Additional skills |
| `service_areas` | Array[String] | Neighbourhoods served |
| `location_point` | PostGIS Point | Current/last known location |
| `bank_code` | String | Verified via Squad |
| `account_number` | String | Verified via Squad |
| `account_name` | String | From Squad lookup |
| `virtual_account_number` | String | Squad virtual account |
| `trust_score` | Float | 0.0–1.0 |
| `sabi_score` | Integer | 0–100 creditworthiness |
| `total_jobs` | Integer | |
| `total_income` | Integer | Cumulative naira earned |
| `accepts_apprentices` | Boolean | Eligible at trust score 0.6+ |
| `apprentice_slots` | Integer | Open training positions |

### Trader

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `name` | String | |
| `phone` | String | WhatsApp number |
| `business_type` | String | AI-classified category |
| `area` | String | Market/location |
| `virtual_account_number` | String | Squad virtual account |
| `sabi_score` | Integer | 0–100 creditworthiness |
| `total_logged_sales` | Integer | Transaction count |
| `total_logged_revenue` | Integer | Cumulative naira |

### SalesLog (Trader transactions)

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | |
| `trader_id` | UUID | FK |
| `amount` | Integer | Naira |
| `category` | String | AI-classified from message |
| `payment_method` | Enum | `squad`, `cash`, `transfer` |
| `logged_at` | Timestamp | |
| `squad_ref` | String | If paid via Squad |

### DemandSignal (Time-series, powers EI Engine)

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | |
| `trade_category` | String | |
| `area` | String | |
| `location_point` | PostGIS Point | |
| `request_type` | Enum | `buyer_request`, `search_query`, `unmatched_demand` |
| `amount` | Integer | Agreed or estimated price |
| `matched` | Boolean | Was a worker found? |
| `recorded_at` | TimescaleDB timestamp | Hypertable partition key |

### Apprenticeship

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | |
| `master_worker_id` | UUID | FK to workers (trust 0.6+) |
| `apprentice_id` | UUID | FK to job seekers |
| `trade` | String | |
| `started_at` | Timestamp | |
| `status` | Enum | `active`, `completed`, `dropped` |
| `milestones_completed` | Integer | |
| `total_milestones` | Integer | |

---

## 11. WhatsApp Conversation Flows

### Service Worker Flow (Existing — refined)

```
BUYER: "I need a plumber in Yaba"

AI: "Found the best match near you:

  👷 Emeka Adeyemi — Plumber
  ⭐ 4.7 · 🔵 Verified · 43 jobs
  📍 1.2km · ~18 min ETA
  💰 ₦4,000 – ₦8,000

  Reply BOOK to hire · NEXT for another"

BUYER: "BOOK"

AI: "Pay ₦5,000 to confirm Emeka:
  👉 [Squad Checkout Link]

  Card, bank transfer, USSD, or mobile money.
  Secured by Squad × GTBank."

  [Buyer pays → webhook → verified]

AI → BUYER: "Payment confirmed! Emeka is on his way. ~18 min."
AI → WORKER: "New paid job! Yaba, pipe repair. ₦4,750 on completion.
              Reply ACCEPT or DECLINE"

  [Job completed. Buyer rates 5 stars.]
  [Squad Transfer API → worker payout]

AI → WORKER: "₦4,750 sent to your Kuda account!
              Trust Score: 0.74 → 0.76 🔵
              SabiScore: 58 — microloan eligible! 📈"
```

### Trader Flow (New)

```
TRADER: "sold 2 cartons indomie 18500"

AI: "Logged! 📦
  2 × Cartons Indomie — ₦18,500
  Today: ₦94,500 (6 sales)
  This week: ₦412,000

  SabiScore: 43 📈
  Reply REPORT for weekly summary."

TRADER: "REPORT"

AI: "📊 Weekly Report — Mama Ngozi Provisions

  Revenue: ₦412,000 (↑12% vs last week)
  Transactions: 31
  Top item: Rice (₦165,000 · 40%)
  Busiest day: Saturday (₦98,000)

  SabiScore: 43 / 100
  7 more weeks of consistent logging
  to qualify for inventory loan.

  Reply LOAN to check eligibility."
```

### Job Seeker Flow (New)

```
TUNDE: "I want to find work"

AI: "Welcome to SabiWork Pathway!

  I can help you find the right trade based on
  what's actually in demand near you.

  📍 Where are you based?"

TUNDE: "Surulere"

AI: "Here's what Surulere needs right now:

  1. 🧱 Tiling — 47 requests/month · avg ₦15k/job
     Supply gap: HIGH (only 2 tilers registered)

  2. ❄️ AC Repair — 31 requests/month · avg ₦12k/job
     Supply gap: MEDIUM

  3. ⚡ Electrical — 28 requests/month · avg ₦10k/job
     Supply gap: LOW (but high volume)

  Reply with a number to explore apprenticeships."
```

---

## 12. Hackathon Demo Scope

### What's Live

| Component | Status | Notes |
|---|---|---|
| Map-first app with AI chat button | Live | Mapbox + Claude API |
| Worker markers with trust tier colours | Live | 15–20 demo workers seeded |
| AI matching via natural language | Live | "I need a plumber in Yaba" → match |
| Squad Payment Initiation | Live (sandbox) | Returns checkout URL |
| Squad Webhook processing | Live | Signature verified, idempotent |
| Squad Transaction Verification | Live (sandbox) | Verify before payout |
| Squad Transfer to worker | Live (sandbox) | Payout to test bank account |
| Squad Virtual Account creation | Live (sandbox) | Worker onboarding |
| Trust score calculation + update | Live | Updates on webhook |
| Demand signal logging | Live | Every request logged to TimescaleDB |
| Economic Intelligence Dashboard | Live | Map + live feed + demand gaps |
| Trader sales logging (WhatsApp) | Live | Basic NLP → structured log |
| Skills gap display on dashboard | Live | Demand vs supply per area/trade |

### What's Prototyped (Clickable / Scripted Demo)

| Component | Status | Notes |
|---|---|---|
| SabiScore calculation | Prototype | Hardcoded thresholds, real logic described |
| Microloan eligibility flow | Prototype | Shows the offer, doesn't execute |
| Apprenticeship matching | Prototype | Scripted WhatsApp flow |
| Pathway recommendations for job seekers | Prototype | Derived from live demand data, UI mocked |

### What's Described (Architecture Only)

| Component | Status | Notes |
|---|---|---|
| MFI partner integration | Described | API spec ready, no partner signed |
| Insurance products | Described | Roadmap item |
| Full USSD flow | Described | Africa's Talking integration specced |

---

## 13. Scaling Strategy

SabiWork scales on three axes:

### Geographic Scaling

The platform is designed to expand city by city. The data models are area-aware (every transaction, worker, and demand signal has a location). Launching in a new city means:

1. Seed 50–100 workers in the new city (WhatsApp onboarding, takes 2 weeks)
2. The demand forecasting model works from day 1 — even 50 data points reveal demand patterns
3. Trust scores are local initially but become portable as workers serve multiple areas
4. The map, markers, and AI matching all work without code changes — just new data

**Expansion roadmap:** Lagos → Abuja → Port Harcourt → Ibadan → Accra (Ghana) → Nairobi (Kenya). The same Squad integration works for Nigerian cities; for Ghana and Kenya, we swap in local payment rails (Hubtel for Ghana, M-Pesa for Kenya) behind the same service layer abstraction.

### Vertical Scaling (New User Types and Trades)

Each new trade category plugs into the existing matching engine. Adding "solar panel installers" is a configuration change, not a code change. The AI classifies buyer intent into trades automatically — if buyers start asking for solar installation, the system detects the new demand signal before we formally add the category.

Traders are a new vertical that shares the same data infrastructure. The SabiScore model is trade-agnostic — it works for a plumber's payout history and a trader's sales logs identically.

### Financial Scaling (New Products on Top of Data)

The data layer enables progressively more sophisticated financial products:

```
MONTH 1–3:   Payments only (Squad)
MONTH 4–6:   Savings (automated daily/weekly saves via Squad)
MONTH 6–9:   Microloans (SabiScore → MFI partner underwriting)
MONTH 9–12:  Insurance (job-completion insurance, inventory insurance)
MONTH 12+:   Business growth products (bulk purchasing co-ops, supplier credit)
```

Each financial product strengthens the flywheel: loan repayment data feeds back into SabiScore, which improves matching, which increases transaction volume, which generates more data.

---

## 14. Success Metrics

| Metric | Target (3 months post-launch) | Why it matters |
|---|---|---|
| Monthly active workers | 500+ | Supply side health |
| Monthly active traders logging sales | 200+ | Trade vertical validation |
| Job seekers entering Pathway | 100+ | Youth unemployment pipeline |
| Apprenticeships started | 20+ | Direct unemployment impact |
| Average worker monthly income via SabiWork | ₦120,000+ | Economic value created |
| SabiScore-eligible users (score 30+) | 150+ | Financial inclusion readiness |
| Microloans disbursed (with MFI partner) | 50+ | Financial services connection |
| Unmatched demand rate | < 15% | Supply meeting demand |
| Payment success rate | > 95% | Squad reliability |
| Payout delivery time | < 60 seconds | Worker experience |
| Demand forecast accuracy (week-ahead) | > 70% | EI Engine validation |

---

## 15. Go-Live Checklist

### Hackathon Demo

```
[ ] Squad sandbox account active with test keys
[ ] Payment initiation returns checkout_url
[ ] Sandbox test payment completes (card 4242424242424242)
[ ] Webhook received and signature verified
[ ] Idempotency prevents double payout
[ ] Worker payout via Transfer API succeeds in sandbox
[ ] Virtual account created for demo worker
[ ] Requery endpoint tested for 424 scenario
[ ] Trust score updates live after payment event
[ ] Demand signal logged to TimescaleDB on every request
[ ] Skills gap calculation runs on seeded data
[ ] Economic Intelligence Dashboard renders with live data
[ ] Trader WhatsApp sales logging works end-to-end
[ ] Job seeker Pathway shows demand-based recommendations
[ ] ngrok tunnel stable (paid plan)
```

### Production (Post-Hackathon)

```
[ ] Squad live account with completed KYC
[ ] Live secret keys replace sandbox keys
[ ] BASE_URL → api-d.squadco.com
[ ] Webhook URL → production domain with SSL
[ ] Settlement bank account configured
[ ] Squad webhook IP whitelisted (18.133.63.109)
[ ] MFI partner signed for SabiScore-backed microloans
[ ] CBN compliance reviewed for payment facilitation
[ ] TimescaleDB scaled for production write volume
[ ] Redis cluster for trust score / idempotency at scale
```

---

*SabiWork — An intelligent economic system that turns informal transactions into financial identities, demand intelligence, and pathways out of unemployment. Built on Squad.*
