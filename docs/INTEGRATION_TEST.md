# Integration Test Guide

This document walks through the full integration test process for SabiWork.

## Prerequisites

1. Copy `.env.example` to `.env`
2. Fill in actual API keys:
   - `SQUAD_API_KEY` and `SQUAD_SECRET_KEY` (from Squad sandbox)
   - `GROQ_API_KEY` (from Groq console)
   - `VITE_MAPBOX_TOKEN` and `NEXT_PUBLIC_MAPBOX_TOKEN` (from Mapbox)

## Step 1: Start All Services

```bash
docker-compose up --build
```

**Expected behavior:**
1. PostgreSQL + Redis start first (healthchecks pass)
2. Backend starts → runs migrations → seeds data → "Server running on port 3000"
3. PWA builds → nginx serves on port 5173
4. Dashboard builds → Next.js serves on port 3001
5. WhatsApp bot starts → shows QR code (scan with phone)

**Wait for:** "Backend seeding complete" message

## Step 2: Verify Backend Health

```bash
curl http://localhost:3000/api/intelligence/stats
```

**Expected:** JSON response with `volume_today`, `jobs_today`, `workers_paid`, etc.

## Step 3: Verify PWA

Open `http://localhost:5173` in browser.

**Expected:**
- Map of Lagos with colored worker markers
- Orange FAB button visible in bottom-right
- Bottom navigation works (Map / Activity / Profile)
- No console errors

## Step 4: Verify Dashboard

Open `http://localhost:3001` in browser.

**Expected:**
- Dark-themed dashboard loads
- Stat cards show data (from seed)
- Map displays with markers
- Live feed area present
- Intelligence panels visible

## Step 5: Test Buyer Flow

```bash
./scripts/test-buyer-flow.sh
```

**Expected:**
- Step 1: Chat returns worker match (worker card with ID)
- Step 2: Booking creates payment (transaction_ref returned)
- Step 3: Webhook processes successfully
- Step 4: Payment verification returns status
- Step 5: Dashboard stats show updated values

## Step 6: Test Trader Flow

```bash
./scripts/test-trader-flow.sh
```

**Expected:**
- Sale logged via chat (NLP parses "sold 3 bags rice 75000")
- Sale logged via API
- Trader report shows transactions

## Step 7: Test Seeker Flow

```bash
./scripts/test-seeker-flow.sh
```

**Expected:**
- Chat returns pathway recommendation
- Skills gaps endpoint returns data
- Apprenticeships endpoint returns matches

## Step 8: Demo Simulation

In a separate terminal:

```bash
./scripts/demo-simulate.sh
```

Open dashboard at `http://localhost:3001`.

**Expected:**
- Events appear in live feed every 3-5 seconds
- Map shows pulse markers for new events
- Stats counters increment in real-time

Press Ctrl+C to stop simulation.

## Step 9: Test PWA Chat Flow

1. Open PWA → Tap orange FAB button
2. Type "I need a plumber in Surulere"
3. Should get AI response with worker card
4. Tap "Book" button on worker card
5. Payment card appears with Squad checkout URL

**Expected flow:**
- Natural language processed correctly
- Worker matched based on trade + location
- Payment initiation creates Squad transaction
- URL opens Squad payment page

## Troubleshooting

### Backend fails to start
- Check logs: `docker-compose logs backend`
- Verify DATABASE_URL and REDIS_URL in .env
- Ensure postgres and redis are healthy

### PWA shows blank page
- Check browser console for errors
- Verify VITE_MAPBOX_TOKEN is set
- Check nginx logs: `docker-compose logs pwa`

### Dashboard WebSocket not connecting
- Verify backend is running on port 3000
- Check NEXT_PUBLIC_WS_URL in docker-compose.yml
- Open browser DevTools → Network → WS tab

### No workers matched in test
- Verify seed data loaded: check backend logs for "Seeding complete"
- Query workers directly: `curl http://localhost:3000/api/workers`

### Squad webhook fails
- For local testing, use test signature mode (already in scripts)
- For real webhooks, set up ngrok and configure Squad dashboard

## Integration Issues Fixed

If issues are found during testing, document them here and commit fixes:

```bash
git add -A
git commit -m "fix: resolve integration issues found during E2E testing"
```

## Success Criteria

- [ ] All 6 services start successfully
- [ ] Backend API responds to health check
- [ ] PWA loads with map and markers
- [ ] Dashboard loads with real-time data
- [ ] Buyer flow test passes all 5 steps
- [ ] Trader flow test logs sales
- [ ] Seeker flow test returns recommendations
- [ ] Demo simulation shows events on dashboard
- [ ] PWA chat flow creates payment
