# Demo Script — SabiWork

**Target Duration:** 5 minutes
**Audience:** Squad Hackathon 3.0 judges

---

## Setup (Before Demo)

1. All services running: `docker-compose up`
2. ngrok exposing backend: `ngrok http 3000`
3. Squad webhook configured with ngrok URL
4. Browser windows ready:
   - Tab 1: Dashboard (`http://localhost:3001`)
   - Tab 2: PWA (`http://localhost:5173`)
   - Tab 3: WhatsApp Web (bot logged in)
5. Demo simulation script ready but not running

---

## Timeline

### 0:00-0:30 — Opening: Dashboard Overview

**Show:** Dashboard at full screen

**Say:**
> "SabiWork is an intelligent economic system for Nigeria's informal sector. This dashboard shows 3 months of economic intelligence — already learning."

**Point out:**
- Today's volume: ₦X million
- Active workers: X across Lagos
- Map showing real-time activity
- Live transaction feed

**Transition:** "Let me show you how it works."

---

### 0:30-1:00 — Map Layers (PWA)

**Show:** Switch to PWA tab

**Say:**
> "This is the consumer-facing PWA. Every dot is a worker with a verified financial identity."

**Demo:**
- Toggle "Workers" layer → show colored markers (trade types)
- Toggle "Demand" layer → show red heat zones (unmatched requests)
- Toggle "Gaps" layer → show blue zones (skills shortages)

**Point out:**
> "See Surulere? No tilers. The system learns this."

**Transition:** "Watch what happens when someone needs help."

---

### 1:00-2:30 — Buyer Flow (Core Demo)

**Show:** PWA chat interface

**Say:**
> "A buyer needs a plumber. Natural language, no forms."

**Demo:**
1. Tap orange FAB button
2. Type: "I need a plumber in Surulere"
3. **AI responds** with worker card showing:
   - Emeka (4.7★, 95% trust score)
   - ₦15,000 standard rate
   - "Available now"
4. Tap "Book Emeka"
5. **Payment card appears** with Squad checkout URL

**Say:**
> "Squad handles the payment. Multiple options: card, transfer, USSD."

**Demo:**
6. (Optionally) Click payment link to show Squad page
7. Return to terminal, simulate webhook:

```bash
# In terminal (have this pre-typed)
curl -X POST http://localhost:3000/api/webhooks/squad \
  -H "Content-Type: application/json" \
  -d '{"Event": "charge_successful", "TransactionRef": "TX123", ...}'
```

**Switch to Dashboard**

**Show:**
- New event appears in live feed: "Payment received — ₦15,000"
- Stats update in real-time
- Map shows pulse marker at Surulere

**Say:**
> "Instant worker payout. Trust score increases. Next time, Emeka gets priority matching."

**Transition:** "That's buyers. Now traders."

---

### 2:30-3:00 — Trader Flow (WhatsApp)

**Show:** WhatsApp conversation with bot

**Say:**
> "Most traders use WhatsApp. Watch this."

**Demo:**
1. Send message: "sold 3 bags rice 75000"
2. **Bot responds:** "Logged ✓ 3 bags rice ₦75,000. Great job Mama Ngozi!"
3. Send: "REPORT"
4. **Bot sends:** Weekly summary with:
   - Total sales: ₦450,000
   - Items sold: 25
   - SabiScore: 68/100
   - Growth: +12% vs last week

**Say:**
> "Natural language parsing. No app needed. Builds financial identity with every sale."

**Switch to Dashboard**

**Show:** Trader section with updated stats

**Transition:** "And for job seekers..."

---

### 3:00-3:45 — Seeker Flow (Apprenticeship Pathway)

**Show:** Back to PWA

**Say:**
> "Remember those gaps? David wants to learn tiling."

**Demo:**
1. Tap chat → Type: "I want to learn tiling in Surulere"
2. **AI responds:** "High demand! Found 2 apprenticeship programs nearby."
3. Show apprenticeship card:
   - Master Ojo's Tiling Workshop
   - 6-month program
   - Guaranteed job placement
   - ₦5,000/month stipend

**Say:**
> "Demand-driven career advice. Learn what the market needs. Graduate with trust score. Start working."

**Show:** Pathway visualization (if built) or just emphasize:
> "Seeker → Apprentice → Worker → Master. Full financial inclusion at every step."

**Transition:** "One more thing — field agents."

---

### 3:45-4:15 — Field Agent Mode (Onboarding)

**Show:** PWA with agent toggle

**Say:**
> "Workers without smartphones? We send field agents."

**Demo:**
1. Toggle to "Agent Mode" in PWA
2. Show onboarding form:
   - Name, phone, trade
   - GPS auto-capture (show live location)
   - Bank account verified via Squad
   - Photo capture
3. Tap "Create Worker"
4. **Success:** "Emeka #W127 onboarded ✓"

**Say:**
> "Instant virtual account creation. Ready to receive payouts. No bank visit needed."

**Show Dashboard:** New worker appears on map with pulse marker

**Transition:** "Let me show you the intelligence layer."

---

### 4:15-4:45 — Intelligence Dashboard (Wrap-up)

**Show:** Dashboard full screen

**Say:**
> "Every transaction makes it smarter. Look."

**Point out panels:**
- **Top Trades:** Plumbing ↑ demand +15% this week
- **Skills Gaps:** 3 neighborhoods need tilers
- **Worker Performance:** Emeka ranked #1 in Surulere
- **Trader Growth:** Mama Ngozi +12% weekly sales
- **Payout Success:** 98.5% instant disbursement

**Optional:** Start demo simulation script in terminal:

```bash
./scripts/demo-simulate.sh
```

**Show:** Events flooding in, map pulsing, stats changing

**Say:**
> "Real-time economic intelligence. Banks, microfinance, government — they see the invisible economy."

**Transition:** "Why this matters."

---

### 4:45-5:00 — Closing

**Say:**
> "Nigeria's informal sector is 65% of GDP but invisible to financial services. SabiWork makes every transaction count. Every payment builds trust. Every worker gets included."
>
> "Sabi dey pay."

**Show:** Final dashboard overview with all systems active

**Optional strong close:**
> "This isn't a demo database. Three months of synthetic economic activity. Ready to go live in any Lagos neighborhood. Just needs Squad API keys and phones."

---

## Backup Demos (If Time)

### WhatsApp Bot QR Code
Show the terminal with bot logs, explain Baileys headless client.

### Squad Webhook Log
Show backend terminal with real-time webhook processing.

### Database Query
Terminal: `docker exec -it sabiwork-postgres psql -U sabiwork -d sabiwork -c "SELECT COUNT(*) FROM payments;"`

---

## Demo Failures & Fixes

### Worker match fails
**Fallback:** "Let me query directly" → Show workers API endpoint in browser

### Payment simulation breaks
**Fallback:** Skip webhook, go straight to dashboard → "Webhook would trigger this"

### WhatsApp bot not responding
**Fallback:** Show pre-recorded video of trader flow OR show chat logs in terminal

### Dashboard WebSocket disconnects
**Fallback:** Use demo-simulate.sh to refresh events, reload page

---

## Practice Checklist

- [ ] Timed demo under 5 minutes
- [ ] All transitions smooth (no fumbling between tabs)
- [ ] Terminal commands pre-typed or aliased
- [ ] Backup slides ready (if live demo fails completely)
- [ ] Rehearsed opening and closing lines
- [ ] Tested all flows end-to-end at least once
- [ ] Demo simulation script tested
- [ ] WhatsApp bot logged in and responsive
- [ ] ngrok URL configured in Squad dashboard
- [ ] Browser tabs bookmarked in correct order

---

## Key Messages

1. **AI + Payments = Financial Inclusion**
2. **Every transaction builds identity**
3. **Multi-channel: PWA, WhatsApp, Field Agents**
4. **Real-time intelligence for everyone**
5. **Ready to deploy today**

---

## Technical Talking Points (If Asked)

- **AI:** Groq (Llama 3.1 + 3.3) with keyword fallback
- **Payments:** Squad (all 6 products integrated)
- **Database:** TimescaleDB (time-series analytics)
- **Scale:** Designed for 100k workers, 1M transactions/month
- **Deploy:** Docker Compose → can migrate to K8s
- **Cost:** $0.02/transaction with Groq + Squad fees
