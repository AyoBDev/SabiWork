# SabiWork — Design Brief

**For the Product Designer**
**Version:** 3.0
**Date:** May 2026

---

## 1. Context for the Designer

SabiWork is an AI-powered economic intelligence platform for Nigeria's informal economy. It connects three groups — **service workers**, **informal traders**, and **unemployed job seekers** — with each other and with financial services, through a single data-generating ecosystem.

The platform has three surfaces you'll design for:

| Surface | Users | Purpose |
|---|---|---|
| **Mobile App** (Map + AI Chat) | Buyers finding workers, job seekers exploring trades | The primary consumer experience |
| **WhatsApp Bot** | Workers receiving jobs, traders logging sales, job seekers exploring apprenticeships | The highest-reach channel — works on any phone |
| **Economic Intelligence Dashboard** (Web) | Hackathon judges, policymakers, SabiWork team | The "mission control" that proves the system is intelligent |

The app is map-first with a floating AI button. The WhatsApp bot is conversational. The dashboard is data-dense and real-time. Three different design problems, one unified brand.

---

## 2. Brand Identity

**Name:** SabiWork — "Sabi" (Pidgin: to know, to be skilled) + "Work"
**Tagline:** "Sabi dey pay."
**Voice:** Confident, warm, locally rooted. Speaks Pidgin where natural, English for financial clarity. Never corporate.

### Colour System

| Token | Hex | Role |
|---|---|---|
| `--sabi-green` | `#1B7A3D` | Primary brand. CTAs, trust indicators, worker markers, success states |
| `--work-orange` | `#E8630A` | AI button, urgency, notifications, active states |
| `--deep-black` | `#1A1A1A` | Primary text, dark mode surfaces |
| `--warm-white` | `#FAF7F2` | Card surfaces, light backgrounds |
| `--trust-blue` | `#1565C0` | Payment security elements, Verified badge |
| `--alert-red` | `#D32F2F` | Errors, failed payments, disputes |
| `--muted-sand` | `#D4C5A9` | Dividers, disabled states, map roads |
| `--cash-gold` | `#F9A825` | Payment confirmations, earnings, Elite badge, SabiScore highlights |

### Trust Tier Colours

| Tier | Badge | Hex | Map Marker |
|---|---|---|---|
| 0.0–0.29 | 🌱 Emerging | `#81C784` | Light green circle |
| 0.3–0.59 | ✅ Trusted | `#1B7A3D` | Green circle + check |
| 0.6–0.79 | 🔵 Verified | `#1565C0` | Blue circle + shield |
| 0.8–1.0 | ⭐ Elite | `#F9A825` | Gold circle + star |

### Typography

| Use | Font | Weight |
|---|---|---|
| Headings, buttons, dashboard headers | Plus Jakarta Sans | 600–800 |
| Body, descriptions, chat text | DM Sans | 400–500 |
| Naira amounts, refs, account numbers, scores | JetBrains Mono | 400 |

---

## 3. Design Principles

### 3.1 — The Map Is the App

The mobile app opens to a full-bleed map. All other UI — worker cards, AI chat, payment sheets, demand layers — floats on top as overlays and bottom sheets. The map is always underneath, always orienting the user spatially. No job board. No category grid. No feed.

### 3.2 — AI-First, Not Search-First

There is no search bar. The floating AI button is the primary input. Users describe their need in natural language — "my tap is leaking" not "select: Plumber" — and the AI handles classification, matching, and results. For job seekers, the AI also handles career guidance: "what trades are in demand near me?"

### 3.3 — Works on ₦15,000 Phones

Median device: Tecno/Itel, 6" 720p, 2–3GB RAM, Android 11, patchy 4G. Touch targets 48px minimum. Font sizes never below 14px. No heavy animations. Map tiles load progressively. Bottom sheets over full-page navigations.

### 3.4 — Money Feels Safe

Use `--trust-blue` for payment surfaces. Always show "Secured by Squad × GTBank." Naira in monospace with commas: `₦5,000`. Checkmarks for confirmations, shields for security. Transaction refs small and monospace.

### 3.5 — Trust Is Spatial, Scores Are Visible

Trust badges are on every marker, every card, every profile. The map itself communicates trust density — a buyer should glance and see quality at a distance. SabiScores (creditworthiness) are shown to the user who owns them, always with clear progress toward the next financial unlock.

### 3.6 — Data Tells a Story

Every screen should subtly communicate that SabiWork is generating intelligence, not just processing transactions. Income growth charts on worker profiles. Demand heat overlays on the map. "Your SabiScore went up" after every transaction. The dashboard is the most overt expression, but even in WhatsApp, the bot shares insights: "You earned 12% more this week."

---

## 4. Surface 1 — Mobile App (Map + AI Chat)

### 4.1 The Map Canvas

**Custom map style (Mapbox or Google Maps Styling Wizard):**

Light mode: Land `#FAF7F2`, roads `#E8E0D4` / `#D4C5A9`, water `#B8D4E8`, buildings `#EDE6DA`, labels `#555555` in DM Sans (reduced density), parks `#C8E6C9`, all default POI icons hidden.

Dark mode: Land `#1A1A1A`, roads `#2A2A2A` / `#333333`, water `#0D1B2A`, buildings `#222222`, labels `#777777`.

The map should feel calm and recessive — a canvas for SabiWork's own markers and overlays.

### 4.2 Map Layers

The map has switchable data layers that make the intelligence visible:

| Layer | What It Shows | Default |
|---|---|---|
| **Workers** | Live worker markers, coloured by trust tier | ON (always) |
| **Demand Heat** | Heat map overlay showing buyer request density by trade | OFF (toggle) |
| **Skills Gaps** | Pulsing zones where demand exceeds supply | OFF (toggle) |
| **My Area** | Highlighted service radius around user | OFF |

Layer toggles sit in a small floating chip bar at the top of the map, below the location bar. Chips: `Workers` `Demand` `Gaps`. Tapping a chip toggles the layer. Active chips use `--sabi-green` fill.

**Demand Heat Layer:** A translucent gradient overlay (green = met demand, orange = moderate gap, red = severe gap). Visible at zoom levels where individual markers would cluster anyway. As the user zooms in, the heat map fades and individual markers appear.

**Skills Gap Layer:** Pulsing translucent circles in areas with high unmatched demand. Each circle has a small label: "12 plumber requests unmatched this week." This layer is primarily for job seekers exploring where to build skills, but buyers see it too — it explains why wait times might be longer in certain areas.

### 4.3 Worker Markers

**Marker anatomy:**

```
    ┌─────────┐
    │  ┌───┐  │   ← Trade icon (wrench, bolt, scissors)
    │  │ 🔧│  │      inside trust-tier-coloured circle
    │  └───┘  │
    │  4.7 ⭐ │   ← Rating (visible at higher zoom)
    └────┬────┘
         ▼        ← Pin tail
```

**States:**

| State | Appearance |
|---|---|
| Default | 40px circle, trust tier colour, trade icon |
| Available (online) | Subtle pulse: `scale(1.0→1.08→1.0)` 2s loop |
| AI-recommended match | 56px, `--work-orange` ring, bounce-in animation |
| Selected (tapped) | 56px, elevated shadow, triggers bottom sheet |
| Busy | `opacity: 0.4`, no pulse |
| Cluster | Numbered circle: "5 plumbers" |

**Marker colours by trust tier:** Emerging `#81C784`, Trusted `#1B7A3D`, Verified `#1565C0`, Elite `#F9A825`. Each tier also has a distinct shape overlay (circle, circle+check, circle+shield, circle+star) for colour-blind accessibility.

### 4.4 Home Screen Layout

```
┌──────────────────────────────────┐
│  ┌──────────────────────────┐    │
│  │  📍 Yaba, Lagos      🔔  │    │  ← Top bar (translucent blur)
│  └──────────────────────────┘    │
│  ┌────────────────────────────┐  │
│  │ Workers  Demand  Gaps      │  │  ← Layer chips
│  └────────────────────────────┘  │
│                                  │
│         🟢        🔵             │
│              🟢                  │
│     🟡              🟢          │  ← Map with worker markers
│           🟢    🔵              │
│                      🟢         │
│        🟡       🟢              │
│                                  │
│                          ┌────┐  │
│                          │ AI │  │  ← Floating AI button
│                          └────┘  │
│                                  │
│  ┌──────────────────────────┐    │
│  │  🗺️   📊   👤            │    │  ← Bottom nav
│  │  Map  Pulse Profile      │    │
│  └──────────────────────────┘    │
└──────────────────────────────────┘
```

**Top bar:** Translucent blur. Neighbourhood name (reverse geocoded) + notification bell.

**Bottom nav — 3 tabs:**

1. **Map** (default) — The full map experience
2. **Pulse** — Personal economic dashboard: income chart, SabiScore progress, demand insights, apprenticeship status. Different content per user type (see Section 4.7).
3. **Profile** — Account settings, bank details, virtual account, trust score, job/sales history

### 4.5 The Floating AI Button

**Position:** Bottom-right, 16px from edge, above bottom nav.
**Size:** 56px diameter.
**Appearance:** `--work-orange` background, white sparkle/star icon (24px), `box-shadow: 0 4px 12px rgba(0,0,0,0.25)`.
**Idle animation:** Breathing glow — `box-shadow` pulses from `rgba(232,99,10,0.25)` to `rgba(232,99,10,0.45)` over 3s. Subtle warmth, not a strobe.

**Tap behaviour:**

1. Button scales to 0.9 (press), then morphs into a bottom sheet rising from below. 400ms spring.
2. Sheet covers ~60% of screen. Map visible above.
3. Inside: chat interface with text input + mic button.
4. AI greets contextually based on user type:
   - Buyer: "What do you need help with?"
   - Returning buyer: "Welcome back, Funke. Need another plumber?"
   - Worker: "Hi Emeka. You have 2 new job requests nearby."
   - Job seeker: "Hey Tunde. Want to see what's in demand near you today?"

**Collapsed state:** Sheet slides down, button reappears. If active job/match exists, button shows a status dot (green = active, orange = payment pending, blue = tracking).

### 4.6 AI Chat Sheet — Key Moments

**a) Buyer → Match:**

```
┌──────────────────────────────────┐
│  AI: Found the best plumber      │
│  near you:                       │
│                                  │
│  ┌──────────────────────────┐    │
│  │ 👷 Emeka Adeyemi         │    │
│  │ ⭐ 4.7 · 🔵 Verified     │    │
│  │ 📍 1.2km · ~18 min      │    │
│  │ 💰 ₦4,000 – ₦8,000      │    │
│  │                          │    │
│  │  [ Book ₦5,000 ] [Next ›]│    │
│  └──────────────────────────┘    │
└──────────────────────────────────┘
```

Map above highlights Emeka's marker with orange ring + route line.

**b) Buyer → Payment:**

```
┌──────────────────────────────────┐
│  AI: Pay ₦5,000 to secure Emeka:│
│                                  │
│  ┌──────────────────────────┐    │
│  │  ₦5,000                  │    │
│  │  Plumbing · Emeka A.     │    │
│  │  🔒 Secured by Squad     │    │
│  │     × GTBank             │    │
│  │                          │    │
│  │  [ Pay Now ]             │    │
│  └──────────────────────────┘    │
└──────────────────────────────────┘
```

**c) Buyer → Live Tracking:**

```
┌──────────────────────────────────┐
│  AI: Payment confirmed! ✅       │
│                                  │
│  ┌──────────────────────────┐    │
│  │  🟢 Emeka is on his way  │    │
│  │  📍 ETA: 18 min          │    │
│  │  ━━━━━━━░░░░░░░░         │    │
│  └──────────────────────────┘    │
│                                  │
│  [ 📞 Call Emeka ]              │
└──────────────────────────────────┘
```

Map shows live route from worker to buyer.

**d) Job Seeker → Pathway:**

```
┌──────────────────────────────────┐
│  AI: Here's what's in demand     │
│  near Surulere right now:        │
│                                  │
│  ┌──────────────────────────┐    │
│  │ 🧱 Tiling                │    │
│  │ 47 requests/mo · avg ₦15k│    │
│  │ Supply gap: HIGH 🔴      │    │
│  │ [ See apprenticeships › ] │    │
│  └──────────────────────────┘    │
│  ┌──────────────────────────┐    │
│  │ ❄️ AC Repair              │    │
│  │ 31 requests/mo · avg ₦12k│    │
│  │ Supply gap: MEDIUM 🟡    │    │
│  │ [ See apprenticeships › ] │    │
│  └──────────────────────────┘    │
│  ┌──────────────────────────┐    │
│  │ ⚡ Electrical             │    │
│  │ 28 requests/mo · avg ₦10k│    │
│  │ Supply gap: LOW 🟢       │    │
│  │ [ See apprenticeships › ] │    │
│  └──────────────────────────┘    │
└──────────────────────────────────┘
```

Map above toggles to Skills Gap layer, highlighting zones with unmet demand.

**e) Job Seeker → Apprenticeship:**

```
┌──────────────────────────────────┐
│  AI: Tiling apprenticeships near │
│  you:                            │
│                                  │
│  ┌──────────────────────────┐    │
│  │ 👷 Master Chinedu Okafor │    │
│  │ ⭐ 4.8 · ⭐ Elite         │    │
│  │ 📍 Yaba (3.2km)         │    │
│  │ ⏱️ 3-month programme      │    │
│  │ 💰 ₦3,000/week stipend   │    │
│  │ 2 slots open             │    │
│  │                          │    │
│  │  [ Apply ] [ Next › ]    │    │
│  └──────────────────────────┘    │
└──────────────────────────────────┘
```

Map highlights Master Chinedu's marker.

**f) Rating + Payout (after job completion):**

```
┌──────────────────────────────────┐
│  AI: Has Emeka finished the job? │
│                                  │
│  [ Yes, all done ✅ ] [ Not yet ]│
│                                  │
│  AI: How was the work?           │
│  ⭐ ⭐ ⭐ ⭐ ⭐                    │
│                                  │
│  AI: ₦4,750 sent to Emeka's     │
│  Kuda account.                   │
│                                  │
│  ┌──────────────────────────┐    │
│  │ 💰 Payout sent           │    │
│  │ ₦4,750 → Kuda ****1234  │    │
│  │ Trust: 0.74 → 0.76 🔵   │    │
│  │ SabiScore: 58 📈        │    │
│  └──────────────────────────┘    │
└──────────────────────────────────┘
```

### 4.7 Pulse Tab (Personal Economic Dashboard)

The **Pulse** tab shows different content depending on user type. It's the personal intelligence feed — proof that every transaction makes the system (and the user) smarter.

**For Workers (Emeka):**

```
┌──────────────────────────────────┐
│  Your Pulse                      │
│                                  │
│  ┌──────────────────────────┐    │
│  │ INCOME THIS MONTH         │    │
│  │ ₦187,000 ↑14%            │    │
│  │ ▁▂▃▄▅▆▇█▇▆              │    │  ← Sparkline chart
│  │ 23 jobs completed         │    │
│  └──────────────────────────┘    │
│                                  │
│  ┌─────────────┬────────────┐    │
│  │ Trust Score │ SabiScore  │    │
│  │  0.76 🔵   │  58 / 100  │    │
│  │  ┌──────┐  │  ┌──────┐  │    │
│  │  │██████│  │  │█████░│  │    │  ← Progress bars
│  │  └──────┘  │  └──────┘  │    │
│  │ Verified   │ Loan ready │    │
│  └─────────────┴────────────┘    │
│                                  │
│  ┌──────────────────────────┐    │
│  │ 💡 INSIGHT                │    │
│  │ "You're earning 14% more │    │
│  │ than last month. 2 more  │    │
│  │ jobs to reach Elite ⭐"  │    │
│  └──────────────────────────┘    │
│                                  │
│  ┌──────────────────────────┐    │
│  │ 🏦 FINANCIAL SERVICES     │    │
│  │ ✅ Savings → Active       │    │
│  │ ✅ Microloan → Eligible   │    │
│  │ 🔒 Insurance → Score 70+ │    │
│  └──────────────────────────┘    │
└──────────────────────────────────┘
```

**For Traders (Mama Ngozi):**

```
┌──────────────────────────────────┐
│  Your Pulse                      │
│                                  │
│  ┌──────────────────────────┐    │
│  │ REVENUE THIS WEEK         │    │
│  │ ₦412,000 ↑12%            │    │
│  │ ▃▅▇▆▅▇█                  │    │
│  │ 31 transactions logged    │    │
│  └──────────────────────────┘    │
│                                  │
│  ┌──────────────────────────┐    │
│  │ TOP ITEMS                 │    │
│  │ Rice ········· ₦165,000  │    │
│  │ Indomie ······ ₦74,000   │    │
│  │ Palm Oil ····· ₦58,000   │    │
│  └──────────────────────────┘    │
│                                  │
│  ┌──────────────────────────┐    │
│  │ SabiScore: 43 / 100      │    │
│  │ ━━━━━━━━━░░░░░░░░░░░░   │    │
│  │ 7 more weeks of logging   │    │
│  │ to unlock inventory loan  │    │
│  └──────────────────────────┘    │
└──────────────────────────────────┘
```

**For Job Seekers (Tunde):**

```
┌──────────────────────────────────┐
│  Your Pulse                      │
│                                  │
│  ┌──────────────────────────┐    │
│  │ 📍 DEMAND NEAR SURULERE   │    │
│  │                          │    │
│  │ 🧱 Tiling    47 req  🔴  │    │
│  │ ❄️ AC Repair 31 req  🟡  │    │
│  │ ⚡ Electric  28 req  🟢  │    │
│  │                          │    │
│  │ Updated 2 hours ago       │    │
│  └──────────────────────────┘    │
│                                  │
│  ┌──────────────────────────┐    │
│  │ 🎓 YOUR PATHWAY           │    │
│  │                          │    │
│  │ Tiling Apprenticeship     │    │
│  │ with Master Chinedu       │    │
│  │ Week 4 of 12             │    │
│  │ ━━━━━━━░░░░░░░░░         │    │
│  │ 3 / 8 milestones done    │    │
│  └──────────────────────────┘    │
│                                  │
│  ┌──────────────────────────┐    │
│  │ 💡 "Tilers in Surulere    │    │
│  │ earn ₦180k/month avg.    │    │
│  │ Keep going, Tunde!"       │    │
│  └──────────────────────────┘    │
└──────────────────────────────────┘
```

### 4.8 Worker Card (Bottom Sheet)

Triggered by tapping a marker or AI match. Two heights: half-sheet (45%) and full-sheet (85%).

**Half-sheet:**

```
┌──────────────────────────────────┐
│  ━━━━━━  (drag handle)           │
│                                  │
│  [Photo]  Emeka Adeyemi    ⭐4.7 │
│           🔧 Plumber · Yaba      │
│           🔵 Verified             │
│                                  │
│  📍 1.2km · ~18 min    💰 ₦4–8k  │
│                                  │
│  [ 💬 Book via AI ]              │
│  [ 📞 Call directly ]            │
└──────────────────────────────────┘
```

**Full-sheet (dragged up) adds:**

- Trust score bar (coloured, animated fill)
- SabiScore badge (if worker consents to share)
- Stats: `43 jobs · 68% repeat · 8 months active`
- "Trains apprentices" badge (if applicable, with open slot count)
- 2–3 recent reviews
- Virtual account: "Pay directly: GTBank · 9279755518"
- Share button (short link to public profile)

---

## 5. Surface 2 — WhatsApp Bot

WhatsApp is where traders and USSD-adjacent users live. The designer's job here is formatting text messages, not pixels — but the same care applies.

### Design Rules for WhatsApp Messages

- Use `*bold*` for names, amounts, and labels
- Use line breaks generously — dense text blocks are unreadable on small screens
- Emojis as visual anchors, not decoration: 📍 for location, 💰 for money, ⭐ for rating, 📦 for logged sale
- Keep messages under 300 words
- One CTA per message ("Reply BOOK" not "Reply BOOK or NEXT or SKIP or HELP")
- Financial amounts always formatted: `₦5,000` not `5000`

### Key Message Templates

**Worker Match Card:**

```
──────────────────────
✅ *Emeka Adeyemi*
🔧 Plumber · Yaba
──────────────────────
⭐ 4.7/5.0 rating
✅ 43 jobs completed
🔁 68% repeat customers
💰 ₦4,000–₦8,000/day
📍 1.2km away · ~18 min
──────────────────────
🏦 Pay Direct:
GTBank · 9279755518
──────────────────────
Reply *BOOK* or *NEXT*
```

**Trader Sale Logged:**

```
📦 *Sale Logged!*

3 × Bags of Rice — ₦75,000

📊 Today: ₦142,000 (4 sales)
📊 This week: ₦583,000

SabiScore: 42 → 43 📈
8 more weeks to unlock loan.

Reply *REPORT* for weekly summary.
```

**Trader Weekly Report:**

```
📊 *Weekly Report*
Mama Ngozi Provisions

💰 Revenue: ₦412,000 (↑12%)
📦 Transactions: 31
🏆 Top item: Rice (₦165k · 40%)
📅 Best day: Saturday (₦98k)

SabiScore: 43 / 100
━━━━━━━━━░░░░░░░░░░░░

Reply *LOAN* to check eligibility.
```

**Payout Confirmation:**

```
💰 *You've been paid!*

₦4,750 → Kuda MFB ****1234
Job: Pipe repair at Yaba

Trust: 0.74 → 0.76 🔵
SabiScore: 58 📈

You're now eligible for a microloan!
Reply *LOAN* for details.
```

**Job Seeker Demand Map:**

```
📍 *Trades in Demand — Surulere*

1. 🧱 Tiling
   47 requests/mo · avg ₦15k/job
   Gap: HIGH 🔴 (only 2 tilers!)

2. ❄️ AC Repair
   31 requests/mo · avg ₦12k/job
   Gap: MEDIUM 🟡

3. ⚡ Electrical
   28 requests/mo · avg ₦10k/job
   Gap: LOW 🟢

Reply *1*, *2*, or *3* to see
apprenticeships.
```

---

## 6. Surface 3 — Economic Intelligence Dashboard

This is the hackathon "wow" screen. It proves that SabiWork is an intelligent economic system, not just a payment-enabled job board.

### Layout (Desktop — 1280px+)

```
┌──────────────────────────────────────────────────────────────────┐
│  SABIWORK ECONOMIC INTELLIGENCE          Lagos · Live    [Dark]  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────────────┐│
│  │ ₦2.4M  │ │  147   │ │   83   │ │  12    │ │  SabiScores    ││
│  │ Volume │ │  Jobs  │ │Workers │ │Traders │ │  ▁▃▅▇▅▃▁      ││
│  │ Today  │ │ Today  │ │ Paid   │ │ Active │ │  Distribution  ││
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────┬────────────────────────────┐│
│  │                                 │                            ││
│  │         LIVE MAP                │    DEMAND INTELLIGENCE     ││
│  │                                 │                            ││
│  │    🟢    🔵                     │  Skills Gaps (This Week)   ││
│  │       🟢        🟡             │                            ││
│  │  🟢       🔵                   │  🧱 Tiling — Surulere      ││
│  │     🟡         🟢             │     47 req · 2 workers     ││
│  │        🟢    🟢               │     GAP: 🔴 CRITICAL       ││
│  │   🔵        🟢               │                            ││
│  │                                 │  ❄️ AC Repair — Ikeja      ││
│  │  [Workers] [Demand] [Gaps]     │     31 req · 5 workers     ││
│  │                                 │     GAP: 🟡 MODERATE       ││
│  │                                 │                            ││
│  │                                 │  ⚡ Electrical — Lekki     ││
│  │                                 │     28 req · 12 workers    ││
│  │                                 │     GAP: 🟢 HEALTHY        ││
│  │                                 │                            ││
│  ├─────────────────────────────────┤  Forecast: Plumbing +40%  ││
│  │                                 │  in rainy season (Jun–Sep) ││
│  │  LIVE FEED                      │                            ││
│  │                                 ├────────────────────────────┤│
│  │  💰 ₦5,000 — Plumber, Yaba    │                            ││
│  │     12 seconds ago              │  PAYMENT CHANNELS          ││
│  │  📦 Sale logged — ₦18,500     │  ┌──────────────────┐      ││
│  │     Provisions, Mushin · 45s   │  │ Card     ███░ 35%│      ││
│  │  💰 ₦8,000 — Electrician      │  │ Transfer ████ 42%│      ││
│  │     Lekki · 2 min ago          │  │ USSD     █░░░ 12%│      ││
│  │  🎓 Apprentice started         │  │ Mobile   █░░░ 11%│      ││
│  │     Tiling, Surulere · 5 min   │  └──────────────────┘      ││
│  │  💰 ₦4,750 payout sent        │                            ││
│  │     Kuda MFB · 8 min ago      │  FINANCIAL INCLUSION       ││
│  │                                 │  SabiScore 30+:  152 users││
│  │                                 │  Loan eligible:   67 users││
│  │                                 │  Loans active:    23      ││
│  └─────────────────────────────────┴────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
```

### Dashboard Design Direction

**Background:** `#0A0A0A` (near-black). This is a command centre, not a marketing page.
**Card surfaces:** `#1A1A1A` with `1px solid #2A2A2A` border. No heavy shadows on dark backgrounds.
**Accent colour:** `--sabi-green` for positive metrics, `--work-orange` for active events, `--cash-gold` for financial data, `--alert-red` for gaps.
**Text:** `#F5F5F5` primary, `#AAAAAA` secondary, amounts in `--cash-gold` monospace.

### Dashboard Animation & Real-Time Behaviour

- **Stats cards:** Numbers count up from 0 on page load (staggered, 0.8–1.2s)
- **Live feed:** New events slide in from the right with a subtle green/orange pulse on the left border. Auto-scroll. Fade older items.
- **Map markers:** Pulse once when a new transaction occurs at that location. New markers scale in from 0.
- **Demand intelligence:** Gap indicators (`🔴🟡🟢`) pulse once when data updates.
- **Payment channels bar chart:** Bars animate width on load.
- **SabiScore histogram:** Bars grow upward on load, staggered left to right.

### Dashboard Data Sources

Every element on the dashboard is fed by real data from Squad webhooks and the EI Engine:

| Element | Data Source |
|---|---|
| Volume today | Sum of `payment_amount` from Squad webhooks where `paid_at >= today` |
| Jobs today | Count of jobs with status `paid` or `completed` today |
| Workers paid | Distinct `worker_id` with successful payouts today |
| Traders active | Distinct `trader_id` with logged sales today |
| Live feed | Real-time WebSocket stream of webhook events + sales logs |
| Skills gaps | EI Engine demand vs supply calculation per trade per area |
| Payment channels | Aggregated `payment_channel` from Squad webhooks |
| SabiScore distribution | Histogram of all user SabiScores |
| Financial inclusion | Count of users at each SabiScore tier |
| Forecast | EI Engine demand forecast (trend + seasonal) |

---

## 7. Motion Guidelines

### Map

- Marker appear: scale 0→1, spring easing, 50ms stagger
- Marker pulse (available): `scale(1.0→1.08→1.0)`, 2s, ease-in-out
- AI match highlight: bounce from `translateY(-20px)`, orange ring fade in, 500ms
- Route line: animated `stroke-dashoffset`, 800ms
- Pan to match: smooth `flyTo`, 600ms ease-out
- Heat map layer toggle: 300ms opacity fade

### AI Button

- Idle glow: `box-shadow` pulse, 3s cycle, barely noticeable
- Tap → sheet: scale 0.9 → morph to sheet, 400ms spring
- Sheet dismiss → button: reverse, 300ms
- Status dot: fade + scale in, 200ms

### Bottom Sheets

- Rise: spring from off-screen, 350ms
- Drag: 1:1 finger tracking, snap to 45% or 85%
- Dismiss: slide down with decel, 250ms

### Chat

- AI bubble: fade in + slide up 8px, 200ms. Typing indicator (3 dots) 400–800ms before.
- User bubble: slide up, 150ms, immediate
- Worker/payment card: scale 0.95→1.0 + fade, 250ms
- Action buttons: no entrance animation — solid and ready

### Dashboard

- Stats count up: 0.8–1.2s, staggered
- Feed items: slide in right, 200ms
- Map marker pulse on event: 300ms
- Chart bars: width/height animate on load, 600ms staggered

### Performance Budget

`transform` and `opacity` only. Target 60fps on Mediatek Helio G35. If below 30fps on that chipset, remove the animation.

---

## 8. Iconography

**Set:** Phosphor Icons (open source, Regular + Bold weights).

| Concept | Icon | Context |
|---|---|---|
| AI / Chat | `sparkle` | AI button, chat |
| Location | `map-pin` | Markers, job location |
| Payment | `credit-card` | Checkout, payment |
| Payout | `arrow-circle-up-right` | Worker payout |
| Trust | `shield-check` | Trust badge, security |
| Star / Rating | `star` | Ratings |
| Phone | `phone` | Call worker |
| Clock | `clock` | ETA |
| Route | `navigation-arrow` | Directions |
| Confirm | `check-circle` | Success states |
| Close | `x` | Dismiss |
| Mic | `microphone` | Voice input |
| Send | `paper-plane-tilt` | Chat send |
| Chart | `chart-line-up` | Pulse tab, dashboard |
| Score | `trophy` | SabiScore |
| Learn | `graduation-cap` | Apprenticeship, Pathway |
| Shop | `storefront` | Trader features |
| Demand | `fire` | High-demand indicators |
| Gap | `warning-circle` | Skills gap alerts |

---

## 9. Component Inventory

| Component | Variants | Priority |
|---|---|---|
| **Map marker** | Default, available, AI match, selected, busy, cluster | P0 |
| **AI button (FAB)** | Resting, pressed, with status dot | P0 |
| **Bottom sheet** | Half (45%), full (85%) | P0 |
| **Worker card (sheet)** | Compact, expanded (with SabiScore, reviews, apprentice badge) | P0 |
| **Worker card (chat inline)** | Match card with Book/Next | P0 |
| **Demand card (chat inline)** | Trade name, request count, gap indicator, apprenticeship CTA | P0 |
| **Apprenticeship card (chat inline)** | Master worker, duration, stipend, slots, Apply button | P0 |
| **Payment card (chat inline)** | Amount, description, Squad security line, Pay button | P0 |
| **Chat bubble** | AI message, user message, typing indicator | P0 |
| **Chat action button** | Primary (green), secondary (outline) | P0 |
| **Status tracker (chat inline)** | ETA card with progress bar | P0 |
| **Rating input** | 5 tappable stars | P0 |
| **Pulse cards** | Income chart, score progress, insight, financial services | P0 |
| **Layer toggle chips** | Workers, Demand, Gaps (active/inactive) | P0 |
| **Dashboard stats card** | Number + label + trend | P0 |
| **Dashboard live feed item** | Icon + description + timestamp | P0 |
| **Dashboard skills gap row** | Trade, area, request count, worker count, gap badge | P0 |
| **Dashboard channel bar** | Horizontal bar with percentage | P1 |
| **SabiScore progress bar** | Score, fill, next milestone label | P1 |
| **Trust score visual** | Ring (profile), bar (card), badge (marker) | P1 |
| **Top bar** | Location + bell (translucent blur) | P1 |
| **Bottom nav** | 3 tabs: Map, Pulse, Profile | P1 |
| **Toast** | Success, error, info | P2 |
| **Empty states** | No workers nearby, no sales logged, no pathway started | P2 |
| **Onboarding** | 2–3 screens explaining AI button + map | P2 |

---

## 10. Spacing, Layout & Dark Mode Tokens

```css
:root {
  /* Colours */
  --sabi-green: #1B7A3D;
  --work-orange: #E8630A;
  --deep-black: #1A1A1A;
  --warm-white: #FAF7F2;
  --trust-blue: #1565C0;
  --alert-red: #D32F2F;
  --muted-sand: #D4C5A9;
  --cash-gold: #F9A825;

  /* Trust tiers */
  --tier-emerging: #81C784;
  --tier-trusted: #1B7A3D;
  --tier-verified: #1565C0;
  --tier-elite: #F9A825;

  /* Typography */
  --font-display: 'Plus Jakarta Sans', sans-serif;
  --font-body: 'DM Sans', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-full: 9999px;

  /* Elevation */
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.1);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.15);
  --shadow-lg: 0 8px 24px rgba(0,0,0,0.2);
  --shadow-fab: 0 4px 12px rgba(0,0,0,0.25);
}

/* Dark mode overrides */
[data-theme="dark"] {
  --surface: #1E1E1E;
  --background: #121212;
  --text-primary: #F5F5F5;
  --text-secondary: #AAAAAA;
  --chat-ai: #2A2A2A;
  --chat-user: #2ECC71;
  --divider: #333333;
}
```

Touch targets: 48px minimum, 56px for primary actions, 8px gap between adjacent targets.

---

## 11. Accessibility

- WCAG AA contrast on all text (4.5:1 body, 3:1 large)
- Trust tiers: colour + shape + text label (never colour alone)
- Map markers: distinct shapes per tier for colour-blind users
- AI chat: text input + voice input (mic button)
- Bottom sheets: visible drag handle + explicit close button
- Star rating: tap per star (not drag-only)
- Screen reader labels on all markers: "Emeka Adeyemi, Plumber, Verified, 4.7 stars, 1.2 kilometres"
- Dashboard: all charts have text-equivalent data accessible via screen reader

---

## 12. Deliverables Checklist

| Deliverable | Priority |
|---|---|
| Home screen (map + markers + AI button + layer chips) | P0 |
| Custom map style (light + dark) | P0 |
| Worker marker set (all 6 states) | P0 |
| AI button (all states + morph animation spec) | P0 |
| AI chat sheet — buyer flow (match → pay → track → rate) | P0 |
| AI chat sheet — job seeker flow (demand → apprenticeship) | P0 |
| Worker card bottom sheet (compact + expanded) | P0 |
| Payment card (inline chat) | P0 |
| Economic Intelligence Dashboard (full layout) | P0 |
| Pulse tab — worker variant | P0 |
| Pulse tab — trader variant | P0 |
| Pulse tab — job seeker variant | P0 |
| WhatsApp message templates (all 6) | P1 |
| Worker public profile (web page) | P1 |
| Demand heat map layer | P1 |
| Skills gap layer | P1 |
| Onboarding screens (2–3) | P2 |
| Empty states | P2 |

---

## 13. Reference Apps

| App | Study |
|---|---|
| **Uber** | Map-first, bottom sheets, FAB, live tracking |
| **Google Maps** | Markers, clustering, route drawing, layer toggles |
| **Bolt (Africa)** | Map UX on low-end Android in African cities |
| **ChatGPT mobile** | Conversational UI, inline rich cards |
| **Bloomberg Terminal** | Data density, real-time feeds, dark dashboard (for EI Dashboard) |
| **Strava** | Personal stats dashboard, progress tracking, achievement unlocks (for Pulse tab) |

**What NOT to reference:** Fiverr, Upwork, TaskRabbit, or any job board. SabiWork is a map with an AI concierge and an economic intelligence engine. Different mental model entirely.

---

*SabiWork Design Brief v3.0 — The map is the app. The AI is the interface. The data is the product.*
