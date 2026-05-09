# Plan 1: Project Scaffold + Docker Compose + Database Migrations

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the monorepo structure, Docker Compose with PostgreSQL (TimescaleDB) + Redis, Express backend scaffold, and all 11 database migrations so that `docker-compose up` starts a working API server connected to a ready database.

**Architecture:** Four services (backend, pwa, dashboard, whatsapp-bot) in one repo, tied together with Docker Compose. Backend is Express 5 with Knex for migrations/queries. PostgreSQL 16 with TimescaleDB extension for time-series data. Redis 7 for caching.

**Tech Stack:** Node.js 22, Express 5, Knex 3, PostgreSQL 16 + TimescaleDB, Redis 7, Docker Compose

---

## File Structure

```
SabiWork/
├── backend/
│   ├── src/
│   │   ├── index.js              # Express server entry
│   │   ├── config.js             # Environment variable loading
│   │   └── database/
│   │       ├── knex.js           # Knex instance with pool config
│   │       └── knexfile.js       # Migration/seed config
│   ├── migrations/
│   │   ├── 001_create_workers.js
│   │   ├── 002_create_buyers.js
│   │   ├── 003_create_jobs.js
│   │   ├── 004_create_traders.js
│   │   ├── 005_create_sales_logs.js
│   │   ├── 006_create_seekers.js
│   │   ├── 007_create_apprenticeships.js
│   │   ├── 008_create_demand_signals.js
│   │   ├── 009_create_trust_events.js
│   │   ├── 010_create_webhook_events.js
│   │   └── 011_create_agents.js
│   ├── package.json
│   ├── Dockerfile
│   └── .dockerignore
├── pwa/
│   └── .gitkeep
├── dashboard/
│   └── .gitkeep
├── whatsapp-bot/
│   └── .gitkeep
├── shared/
│   └── constants.js              # Trade categories, areas, thresholds
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

---

### Task 1: Initialize Monorepo Structure

**Files:**
- Create: `SabiWork/.gitignore`
- Create: `SabiWork/.env.example`
- Create: `SabiWork/pwa/.gitkeep`
- Create: `SabiWork/dashboard/.gitkeep`
- Create: `SabiWork/whatsapp-bot/.gitkeep`

- [ ] **Step 1: Create .gitignore**

```gitignore
node_modules/
.env
.DS_Store
dist/
build/
*.log
.vite/
.next/
```

- [ ] **Step 2: Create .env.example**

```bash
# === Database ===
DATABASE_URL=postgres://sabiwork:sabiwork_dev@postgres:5432/sabiwork

# === Redis ===
REDIS_URL=redis://redis:6379

# === Squad API (Sandbox) ===
SQUAD_BASE_URL=https://sandbox-api-d.squadco.com
SQUAD_SECRET_KEY=sandbox_sk_xxxxxxxxxxxxx
SQUAD_PUBLIC_KEY=sandbox_pk_xxxxxxxxxxxxx
SQUAD_WEBHOOK_SECRET=your_webhook_hash_secret
SQUAD_MERCHANT_ID=your_merchant_id

# === Groq AI ===
GROQ_API_KEY=gsk_xxxxxxxxxxxxx

# === Mapbox ===
VITE_MAPBOX_TOKEN=pk.xxxxxxxxxxxxx
NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxxxxxxxxxxxx

# === WhatsApp Bot ===
ENABLE_BOT=true
BOT_ADMIN_NUMBERS=2348012345678

# === Service Auth ===
SERVICE_KEY=shared_secret_between_services
JWT_SECRET=jwt_secret_for_admin_auth

# === App Config ===
PORT=3000
NODE_ENV=development
WEBHOOK_BASE_URL=https://your-ngrok-url.ngrok.io
```

- [ ] **Step 3: Create placeholder directories**

```bash
mkdir -p pwa dashboard whatsapp-bot
touch pwa/.gitkeep dashboard/.gitkeep whatsapp-bot/.gitkeep
```

- [ ] **Step 4: Commit**

```bash
git init
git add .gitignore .env.example pwa/.gitkeep dashboard/.gitkeep whatsapp-bot/.gitkeep
git commit -m "chore: initialize monorepo structure"
```

---

### Task 2: Shared Constants

**Files:**
- Create: `shared/constants.js`

- [ ] **Step 1: Create shared constants file**

```javascript
// shared/constants.js
// Trade categories, Lagos areas with coordinates, trust tiers, SabiScore thresholds

const TRADES = [
  'plumbing',
  'electrical',
  'tailoring',
  'tiling',
  'carpentry',
  'painting',
  'welding',
  'cleaning',
  'hairdressing',
  'catering'
];

const LAGOS_AREAS = [
  { name: 'Surulere', key: 'surulere', lat: 6.5010, lng: 3.3569 },
  { name: 'Yaba', key: 'yaba', lat: 6.5095, lng: 3.3711 },
  { name: 'Ikeja', key: 'ikeja', lat: 6.6018, lng: 3.3515 },
  { name: 'Lekki', key: 'lekki', lat: 6.4478, lng: 3.4723 },
  { name: 'Victoria Island', key: 'victoria_island', lat: 6.4281, lng: 3.4219 },
  { name: 'Mushin', key: 'mushin', lat: 6.5355, lng: 3.3554 },
  { name: 'Maryland', key: 'maryland', lat: 6.5667, lng: 3.3636 },
  { name: 'Ojota', key: 'ojota', lat: 6.5833, lng: 3.3833 },
  { name: 'Ikorodu', key: 'ikorodu', lat: 6.6194, lng: 3.5105 },
  { name: 'Ajah', key: 'ajah', lat: 6.4698, lng: 3.5852 }
];

const TRUST_TIERS = {
  EMERGING: { min: 0.0, max: 0.29, label: 'Emerging', emoji: '🌱' },
  TRUSTED: { min: 0.30, max: 0.59, label: 'Trusted', emoji: '✅' },
  VERIFIED: { min: 0.60, max: 0.79, label: 'Verified', emoji: '🔵' },
  ELITE: { min: 0.80, max: 1.0, label: 'Elite', emoji: '⭐' }
};

const SABI_SCORE_TIERS = {
  NONE: { min: 0, max: 29, unlocks: 'none', label: 'Keep logging' },
  SAVINGS: { min: 30, max: 49, unlocks: 'savings', label: 'Savings unlocked' },
  MICROLOAN: { min: 50, max: 69, unlocks: 'microloan', label: 'Microloan eligible' },
  FULL: { min: 70, max: 100, unlocks: 'full', label: 'Full financial suite' }
};

const JOB_STATUSES = [
  'created',
  'payment_pending',
  'paid',
  'in_progress',
  'completed',
  'payout_sent'
];

const PAYOUT_STATUSES = ['pending', 'success', 'failed', 'requeried'];

const ONBOARDING_CHANNELS = ['whatsapp', 'ussd', 'field_agent'];

const PLATFORM_FEE_PERCENT = 5;

const SUPPORTED_BANKS = [
  { name: 'Kuda', code: '090267' },
  { name: 'OPay', code: '100004' },
  { name: 'PalmPay', code: '100033' },
  { name: 'GTBank', code: '058' },
  { name: 'Access', code: '044' },
  { name: 'First Bank', code: '011' },
  { name: 'UBA', code: '033' },
  { name: 'Zenith', code: '057' },
  { name: 'Wema', code: '035' },
  { name: 'FairMoney', code: '090551' }
];

module.exports = {
  TRADES,
  LAGOS_AREAS,
  TRUST_TIERS,
  SABI_SCORE_TIERS,
  JOB_STATUSES,
  PAYOUT_STATUSES,
  ONBOARDING_CHANNELS,
  PLATFORM_FEE_PERCENT,
  SUPPORTED_BANKS
};
```

- [ ] **Step 2: Commit**

```bash
git add shared/constants.js
git commit -m "feat: add shared constants (trades, areas, tiers, banks)"
```

---

### Task 3: Backend Package Setup

**Files:**
- Create: `backend/package.json`
- Create: `backend/.dockerignore`

- [ ] **Step 1: Create backend/package.json**

```json
{
  "name": "sabiwork-backend",
  "version": "1.0.0",
  "description": "SabiWork API — Economic Intelligence Platform",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "node --watch src/index.js",
    "migrate": "knex migrate:latest --knexfile src/database/knexfile.js",
    "migrate:rollback": "knex migrate:rollback --knexfile src/database/knexfile.js",
    "seed": "node seed.js",
    "test": "node --test tests/**/*.test.js"
  },
  "dependencies": {
    "express": "^5.1.0",
    "knex": "^3.1.0",
    "pg": "^8.13.0",
    "ioredis": "^5.4.0",
    "cors": "^2.8.5",
    "helmet": "^8.0.0",
    "express-rate-limit": "^7.5.0",
    "jsonwebtoken": "^9.0.2",
    "ws": "^8.18.0",
    "groq-sdk": "^0.8.0",
    "dotenv": "^16.4.0",
    "uuid": "^10.0.0"
  },
  "devDependencies": {},
  "engines": {
    "node": ">=22.0.0"
  }
}
```

- [ ] **Step 2: Create backend/.dockerignore**

```
node_modules
.env
*.log
```

- [ ] **Step 3: Install dependencies**

```bash
cd backend && npm install
```

- [ ] **Step 4: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/.dockerignore
git commit -m "feat: initialize backend package with dependencies"
```

---

### Task 4: Backend Config + Database Connection

**Files:**
- Create: `backend/src/config.js`
- Create: `backend/src/database/knexfile.js`
- Create: `backend/src/database/knex.js`

- [ ] **Step 1: Create backend/src/config.js**

```javascript
// backend/src/config.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  databaseUrl: process.env.DATABASE_URL,

  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // Squad
  squadBaseUrl: process.env.SQUAD_BASE_URL || 'https://sandbox-api-d.squadco.com',
  squadSecretKey: process.env.SQUAD_SECRET_KEY,
  squadPublicKey: process.env.SQUAD_PUBLIC_KEY,
  squadWebhookSecret: process.env.SQUAD_WEBHOOK_SECRET,
  squadMerchantId: process.env.SQUAD_MERCHANT_ID,

  // Groq
  groqApiKey: process.env.GROQ_API_KEY,

  // Auth
  serviceKey: process.env.SERVICE_KEY,
  jwtSecret: process.env.JWT_SECRET,

  // Webhook
  webhookBaseUrl: process.env.WEBHOOK_BASE_URL || 'http://localhost:3000',
};

module.exports = config;
```

- [ ] **Step 2: Create backend/src/database/knexfile.js**

```javascript
// backend/src/database/knexfile.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

module.exports = {
  development: {
    client: 'pg',
    connection: process.env.DATABASE_URL || 'postgres://sabiwork:sabiwork_dev@localhost:5432/sabiwork',
    migrations: {
      directory: path.resolve(__dirname, '../../migrations')
    },
    pool: {
      min: 2,
      max: 10
    }
  },
  production: {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    migrations: {
      directory: path.resolve(__dirname, '../../migrations')
    },
    pool: {
      min: 2,
      max: 20
    }
  }
};
```

- [ ] **Step 3: Create backend/src/database/knex.js**

```javascript
// backend/src/database/knex.js
const knexLib = require('knex');
const knexfile = require('./knexfile');

const env = process.env.NODE_ENV || 'development';
const knex = knexLib(knexfile[env]);

module.exports = knex;
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/config.js backend/src/database/
git commit -m "feat: add backend config and database connection"
```

---

### Task 5: Express Server Entry Point

**Files:**
- Create: `backend/src/index.js`

- [ ] **Step 1: Create backend/src/index.js**

```javascript
// backend/src/index.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createServer } = require('http');
const config = require('./config');

const app = express();
const server = createServer(app);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'sabiwork-backend', timestamp: new Date().toISOString() });
});

// API routes (to be added in Plan 5)
app.get('/api', (req, res) => {
  res.json({ message: 'SabiWork API v1.0', routes: [] });
});

// Start server
server.listen(config.port, () => {
  console.log(`SabiWork backend running on port ${config.port}`);
});

module.exports = { app, server };
```

- [ ] **Step 2: Test locally**

```bash
cd backend && node src/index.js
# In another terminal:
curl http://localhost:3000/health
# Expected: {"status":"ok","service":"sabiwork-backend","timestamp":"..."}
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/index.js
git commit -m "feat: add Express server with health check"
```

---

### Task 6: Database Migrations — Workers + Buyers + Jobs

**Files:**
- Create: `backend/migrations/001_create_workers.js`
- Create: `backend/migrations/002_create_buyers.js`
- Create: `backend/migrations/003_create_jobs.js`

- [ ] **Step 1: Create 001_create_workers.js**

```javascript
// backend/migrations/001_create_workers.js
exports.up = async function(knex) {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  await knex.schema.createTable('workers', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('name', 100).notNullable();
    table.string('phone', 15).notNullable().unique();
    table.string('primary_trade', 50).notNullable();
    table.specificType('secondary_trades', 'TEXT[]').defaultTo('{}');
    table.specificType('service_areas', 'TEXT[]').defaultTo('{}');
    table.decimal('location_lat', 9, 6);
    table.decimal('location_lng', 9, 6);
    table.string('bank_code', 10);
    table.string('account_number', 10);
    table.string('account_name', 100);
    table.string('virtual_account_number', 10);
    table.decimal('trust_score', 4, 3).defaultTo(0.0);
    table.integer('sabi_score').defaultTo(0);
    table.integer('total_jobs').defaultTo(0);
    table.integer('total_income').defaultTo(0);
    table.boolean('accepts_apprentices').defaultTo(false);
    table.integer('apprentice_slots').defaultTo(0);
    table.boolean('is_available').defaultTo(true);
    table.string('onboarding_channel', 20).defaultTo('whatsapp');
    table.uuid('onboarded_by');
    table.string('photo_url', 255);
    table.boolean('gps_verified').defaultTo(false);
    table.timestamp('last_active_at').defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.raw('CREATE INDEX idx_workers_trade ON workers (primary_trade)');
  await knex.raw('CREATE INDEX idx_workers_trust ON workers (trust_score DESC)');
  await knex.raw('CREATE INDEX idx_workers_areas ON workers USING GIN (service_areas)');
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('workers');
};
```

- [ ] **Step 2: Create 002_create_buyers.js**

```javascript
// backend/migrations/002_create_buyers.js
exports.up = async function(knex) {
  await knex.schema.createTable('buyers', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('name', 100).notNullable();
    table.string('phone', 15).notNullable().unique();
    table.string('email', 100);
    table.string('area', 50);
    table.decimal('location_lat', 9, 6);
    table.decimal('location_lng', 9, 6);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('buyers');
};
```

- [ ] **Step 3: Create 003_create_jobs.js**

```javascript
// backend/migrations/003_create_jobs.js
exports.up = async function(knex) {
  await knex.schema.createTable('jobs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('buyer_id').notNullable().references('id').inTable('buyers');
    table.uuid('worker_id').references('id').inTable('workers');
    table.string('service_category', 50).notNullable();
    table.text('description');
    table.string('area', 50);
    table.decimal('location_lat', 9, 6);
    table.decimal('location_lng', 9, 6);
    table.integer('agreed_amount');
    table.string('status', 20).defaultTo('created');
    table.string('transaction_ref', 100);
    table.string('payment_channel', 20);
    table.timestamp('paid_at');
    table.string('payout_ref', 100);
    table.integer('payout_amount');
    table.string('payout_status', 20);
    table.string('payout_nip_ref', 100);
    table.smallint('buyer_rating');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('completed_at');
  });

  await knex.raw('CREATE INDEX idx_jobs_status ON jobs (status)');
  await knex.raw('CREATE INDEX idx_jobs_worker ON jobs (worker_id)');
  await knex.raw('CREATE INDEX idx_jobs_buyer ON jobs (buyer_id)');
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('jobs');
};
```

- [ ] **Step 4: Commit**

```bash
git add backend/migrations/001_create_workers.js backend/migrations/002_create_buyers.js backend/migrations/003_create_jobs.js
git commit -m "feat: add migrations for workers, buyers, jobs tables"
```

---

### Task 7: Database Migrations — Traders + Sales Logs + Seekers

**Files:**
- Create: `backend/migrations/004_create_traders.js`
- Create: `backend/migrations/005_create_sales_logs.js`
- Create: `backend/migrations/006_create_seekers.js`

- [ ] **Step 1: Create 004_create_traders.js**

```javascript
// backend/migrations/004_create_traders.js
exports.up = async function(knex) {
  await knex.schema.createTable('traders', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('name', 100).notNullable();
    table.string('phone', 15).notNullable().unique();
    table.string('business_type', 50);
    table.string('area', 50);
    table.decimal('location_lat', 9, 6);
    table.decimal('location_lng', 9, 6);
    table.string('virtual_account_number', 10);
    table.integer('sabi_score').defaultTo(0);
    table.integer('total_logged_sales').defaultTo(0);
    table.integer('total_logged_revenue').defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('traders');
};
```

- [ ] **Step 2: Create 005_create_sales_logs.js**

```javascript
// backend/migrations/005_create_sales_logs.js
exports.up = async function(knex) {
  await knex.schema.createTable('sales_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('trader_id').notNullable().references('id').inTable('traders');
    table.integer('amount').notNullable();
    table.string('item_name', 100);
    table.integer('quantity');
    table.string('category', 50);
    table.string('payment_method', 20).defaultTo('cash');
    table.string('squad_ref', 100);
    table.timestamp('logged_at').defaultTo(knex.fn.now());
  });

  await knex.raw('CREATE INDEX idx_sales_trader_date ON sales_logs (trader_id, logged_at DESC)');
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('sales_logs');
};
```

- [ ] **Step 3: Create 006_create_seekers.js**

```javascript
// backend/migrations/006_create_seekers.js
exports.up = async function(knex) {
  await knex.schema.createTable('seekers', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('name', 100).notNullable();
    table.string('phone', 15).notNullable().unique();
    table.string('area', 50);
    table.decimal('location_lat', 9, 6);
    table.decimal('location_lng', 9, 6);
    table.specificType('interests', 'TEXT[]').defaultTo('{}');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('seekers');
};
```

- [ ] **Step 4: Commit**

```bash
git add backend/migrations/004_create_traders.js backend/migrations/005_create_sales_logs.js backend/migrations/006_create_seekers.js
git commit -m "feat: add migrations for traders, sales_logs, seekers tables"
```

---

### Task 8: Database Migrations — Apprenticeships + Demand Signals (TimescaleDB)

**Files:**
- Create: `backend/migrations/007_create_apprenticeships.js`
- Create: `backend/migrations/008_create_demand_signals.js`

- [ ] **Step 1: Create 007_create_apprenticeships.js**

```javascript
// backend/migrations/007_create_apprenticeships.js
exports.up = async function(knex) {
  await knex.schema.createTable('apprenticeships', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('master_worker_id').notNullable().references('id').inTable('workers');
    table.uuid('apprentice_id').notNullable().references('id').inTable('seekers');
    table.string('trade', 50).notNullable();
    table.integer('duration_weeks');
    table.integer('weekly_stipend');
    table.string('status', 20).defaultTo('active');
    table.integer('milestones_completed').defaultTo(0);
    table.integer('total_milestones').defaultTo(8);
    table.timestamp('started_at').defaultTo(knex.fn.now());
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('apprenticeships');
};
```

- [ ] **Step 2: Create 008_create_demand_signals.js**

```javascript
// backend/migrations/008_create_demand_signals.js
exports.up = async function(knex) {
  // Enable TimescaleDB extension
  await knex.raw('CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE');

  await knex.schema.createTable('demand_signals', (table) => {
    table.uuid('id').defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('trade_category', 50).notNullable();
    table.string('area', 50);
    table.decimal('location_lat', 9, 6);
    table.decimal('location_lng', 9, 6);
    table.string('request_type', 20).defaultTo('buyer_request');
    table.integer('amount');
    table.boolean('matched').defaultTo(false);
    table.string('payment_channel', 20);
    table.timestamp('recorded_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  // Convert to TimescaleDB hypertable
  await knex.raw("SELECT create_hypertable('demand_signals', 'recorded_at')");

  await knex.raw('CREATE INDEX idx_demand_trade_area ON demand_signals (trade_category, area)');
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('demand_signals');
};
```

- [ ] **Step 3: Commit**

```bash
git add backend/migrations/007_create_apprenticeships.js backend/migrations/008_create_demand_signals.js
git commit -m "feat: add migrations for apprenticeships and demand_signals (TimescaleDB hypertable)"
```

---

### Task 9: Database Migrations — Trust Events + Webhook Events + Agents

**Files:**
- Create: `backend/migrations/009_create_trust_events.js`
- Create: `backend/migrations/010_create_webhook_events.js`
- Create: `backend/migrations/011_create_agents.js`

- [ ] **Step 1: Create 009_create_trust_events.js**

```javascript
// backend/migrations/009_create_trust_events.js
exports.up = async function(knex) {
  await knex.schema.createTable('trust_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('worker_id').notNullable().references('id').inTable('workers');
    table.string('event_type', 30).notNullable();
    table.decimal('score_delta', 5, 4).notNullable();
    table.decimal('score_after', 4, 3).notNullable();
    table.uuid('job_id').references('id').inTable('jobs');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.raw('CREATE INDEX idx_trust_worker ON trust_events (worker_id, created_at DESC)');
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('trust_events');
};
```

- [ ] **Step 2: Create 010_create_webhook_events.js**

```javascript
// backend/migrations/010_create_webhook_events.js
exports.up = async function(knex) {
  await knex.schema.createTable('webhook_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('transaction_ref', 100).notNullable();
    table.string('event_type', 50);
    table.jsonb('payload');
    table.boolean('processed').defaultTo(false);
    table.timestamp('received_at').defaultTo(knex.fn.now());
  });

  await knex.raw('CREATE UNIQUE INDEX idx_webhook_ref ON webhook_events (transaction_ref)');
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('webhook_events');
};
```

- [ ] **Step 3: Create 011_create_agents.js**

```javascript
// backend/migrations/011_create_agents.js
exports.up = async function(knex) {
  await knex.schema.createTable('agents', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('name', 100).notNullable();
    table.string('phone', 15).notNullable().unique();
    table.string('area_assigned', 50);
    table.integer('workers_onboarded').defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('agents');
};
```

- [ ] **Step 4: Commit**

```bash
git add backend/migrations/009_create_trust_events.js backend/migrations/010_create_webhook_events.js backend/migrations/011_create_agents.js
git commit -m "feat: add migrations for trust_events, webhook_events, agents tables"
```

---

### Task 10: Docker Compose

**Files:**
- Create: `docker-compose.yml`

- [ ] **Step 1: Create docker-compose.yml**

```yaml
version: '3.8'

services:
  postgres:
    image: timescale/timescaledb:latest-pg16
    environment:
      POSTGRES_DB: sabiwork
      POSTGRES_USER: sabiwork
      POSTGRES_PASSWORD: sabiwork_dev
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sabiwork"]
      interval: 5s
      timeout: 3s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  backend:
    build: ./backend
    ports:
      - "3000:3000"
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: sh -c "npm run migrate && npm start"
    volumes:
      - ./shared:/app/shared

volumes:
  pgdata:
```

- [ ] **Step 2: Commit**

```bash
git add docker-compose.yml
git commit -m "feat: add docker-compose with PostgreSQL (TimescaleDB), Redis, and backend"
```

---

### Task 11: Backend Dockerfile

**Files:**
- Create: `backend/Dockerfile`

- [ ] **Step 1: Create backend/Dockerfile**

```dockerfile
FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --production

COPY src/ ./src/
COPY migrations/ ./migrations/
COPY seed.js ./seed.js

# Shared constants mounted via docker-compose volume at /app/shared

EXPOSE 3000

CMD ["node", "src/index.js"]
```

- [ ] **Step 2: Create a placeholder seed.js so Docker build doesn't fail**

```javascript
// backend/seed.js
// Placeholder — full seed script in Plan 6
async function seed() {
  console.log('Seed script placeholder. Run Plan 6 to implement.');
  process.exit(0);
}

seed();
```

- [ ] **Step 3: Commit**

```bash
git add backend/Dockerfile backend/seed.js
git commit -m "feat: add backend Dockerfile and seed placeholder"
```

---

### Task 12: Test Full Stack Startup

- [ ] **Step 1: Create .env from .env.example**

```bash
cp .env.example .env
# Edit .env: set DATABASE_URL=postgres://sabiwork:sabiwork_dev@postgres:5432/sabiwork
# Set REDIS_URL=redis://redis:6379
# Other keys can stay as placeholders for now
```

- [ ] **Step 2: Start with docker-compose**

```bash
docker-compose up --build
```

Expected output:
- postgres: `database system is ready to accept connections`
- redis: `Ready to accept connections`
- backend: runs 11 migrations successfully, then `SabiWork backend running on port 3000`

- [ ] **Step 3: Verify health endpoint**

```bash
curl http://localhost:3000/health
# Expected: {"status":"ok","service":"sabiwork-backend","timestamp":"..."}
```

- [ ] **Step 4: Verify database tables exist**

```bash
docker-compose exec postgres psql -U sabiwork -d sabiwork -c "\dt"
```

Expected: 11 tables listed (workers, buyers, jobs, traders, sales_logs, seekers, apprenticeships, demand_signals, trust_events, webhook_events, agents)

- [ ] **Step 5: Verify TimescaleDB hypertable**

```bash
docker-compose exec postgres psql -U sabiwork -d sabiwork -c "SELECT * FROM timescaledb_information.hypertables;"
```

Expected: `demand_signals` listed as a hypertable

- [ ] **Step 6: Commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: adjustments from integration test"
```

---

## Summary

After completing this plan you have:
- Monorepo structure with all 4 service directories
- Shared constants (trades, areas, tiers, banks)
- Express 5 backend with health check running
- PostgreSQL 16 + TimescaleDB with all 11 tables migrated
- Redis 7 running
- Docker Compose that starts everything with one command
- Ready for Plan 2 (Squad service layer)
