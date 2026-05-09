# Plan 9: PWA Pulse + Profile + Field Agent Mode

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Pulse tab (personal economic dashboard showing income charts, trust ring, SabiScore progress, AI insights — with variants for worker, trader, and seeker), the Profile page (account info, bank details, scores, availability toggle), and the Field Agent onboarding mode (GPS-capturing registration form for bulk worker signup).

**Architecture:** Pulse page conditionally renders based on `user.role`. Profile page shows current user data with edit capabilities. Field Agent mode replaces the bottom nav when `user.role === 'agent'` with Map/Onboard/Stats tabs. The onboard form captures GPS automatically via `navigator.geolocation`.

**Tech Stack:** React 19, Zustand, Tailwind CSS v4, Navigator Geolocation API

**Depends on:** Plan 7 (PWA scaffold), Plan 5 (backend routes for workers, traders, intelligence)

---

## File Structure

```
pwa/src/
├── pages/
│   ├── PulsePage.jsx            # Personal economic dashboard (replaces placeholder)
│   └── ProfilePage.jsx         # Account + scores (replaces placeholder)
├── components/
│   ├── pulse/
│   │   ├── WorkerPulse.jsx     # Income chart, trust ring, insights
│   │   ├── TraderPulse.jsx     # Revenue chart, top items, SabiScore
│   │   ├── SeekerPulse.jsx     # Demand near you, apprenticeship progress
│   │   ├── TrustRing.jsx       # Circular trust score visual
│   │   └── SabiScoreBar.jsx    # Linear progress bar with tier markers
│   ├── profile/
│   │   ├── ScoreSection.jsx    # Trust + SabiScore combined view
│   │   └── BankSection.jsx     # Bank details + virtual account
│   └── agent/
│       ├── AgentNav.jsx        # Alternative nav: Map | Onboard | Stats
│       ├── OnboardPage.jsx     # Registration form + GPS
│       └── AgentStats.jsx      # Workers onboarded, area coverage
└── hooks/
    └── useGeolocation.js       # GPS capture hook
```

---

### Task 1: Trust Ring + SabiScore Bar Components

**Files:**
- Create: `pwa/src/components/pulse/TrustRing.jsx`
- Create: `pwa/src/components/pulse/SabiScoreBar.jsx`

- [ ] **Step 1: Create TrustRing (circular progress)**

```jsx
// pwa/src/components/pulse/TrustRing.jsx
const TIER_COLORS = {
  emerging: '#4CAF50',
  trusted: '#1B7A3D',
  verified: '#1976D2',
  elite: '#F9A825'
};

function getTier(score) {
  if (score >= 0.8) return { name: 'Elite', color: TIER_COLORS.elite };
  if (score >= 0.6) return { name: 'Verified', color: TIER_COLORS.verified };
  if (score >= 0.3) return { name: 'Trusted', color: TIER_COLORS.trusted };
  return { name: 'Emerging', color: TIER_COLORS.emerging };
}

export default function TrustRing({ score }) {
  const tier = getTier(score);
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - score * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle cx="50" cy="50" r="40" fill="none" stroke="#E8E4DF" strokeWidth="8" />
          {/* Progress circle */}
          <circle
            cx="50" cy="50" r="40" fill="none"
            stroke={tier.color} strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-warm-text">{score.toFixed(2)}</span>
          <span className="text-[9px] text-warm-muted">/ 1.00</span>
        </div>
      </div>
      <span
        className="mt-1.5 text-xs font-semibold px-2 py-0.5 rounded-full text-white"
        style={{ background: tier.color }}
      >
        {tier.name}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Create SabiScoreBar**

```jsx
// pwa/src/components/pulse/SabiScoreBar.jsx
const TIERS = [
  { min: 0, max: 29, label: 'Building', color: '#E8E4DF' },
  { min: 30, max: 49, label: 'Savings', color: '#4CAF50' },
  { min: 50, max: 69, label: 'Microloan', color: '#1976D2' },
  { min: 70, max: 100, label: 'Full Suite', color: '#F9A825' }
];

export default function SabiScoreBar({ score }) {
  const currentTier = TIERS.find((t) => score >= t.min && score <= t.max) || TIERS[0];
  const nextTier = TIERS.find((t) => t.min > score);
  const pointsToNext = nextTier ? nextTier.min - score : 0;

  return (
    <div className="bg-white rounded-xl border border-warm-border p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-warm-text">SabiScore</h3>
        <span className="text-lg font-bold text-warm-text">{score}</span>
      </div>

      {/* Progress bar */}
      <div className="relative h-3 bg-warm-bg rounded-full overflow-hidden mb-2">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000"
          style={{ width: `${score}%`, background: currentTier.color }}
        />
        {/* Tier markers */}
        {[30, 50, 70].map((mark) => (
          <div
            key={mark}
            className="absolute top-0 bottom-0 w-px bg-warm-border"
            style={{ left: `${mark}%` }}
          />
        ))}
      </div>

      {/* Tier labels */}
      <div className="flex justify-between text-[9px] text-warm-muted mb-3">
        {TIERS.map((t) => (
          <span key={t.label} className={score >= t.min ? 'text-warm-text font-medium' : ''}>
            {t.label}
          </span>
        ))}
      </div>

      {/* Next milestone */}
      {nextTier && (
        <p className="text-xs text-warm-muted text-center">
          <span className="text-sabi-green font-medium">{pointsToNext} points</span> to unlock {nextTier.label}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add pwa/src/components/pulse/TrustRing.jsx pwa/src/components/pulse/SabiScoreBar.jsx
git commit -m "feat: add TrustRing and SabiScoreBar visual components"
```

---

### Task 2: Worker Pulse View

**Files:**
- Create: `pwa/src/components/pulse/WorkerPulse.jsx`

- [ ] **Step 1: Create WorkerPulse**

```jsx
// pwa/src/components/pulse/WorkerPulse.jsx
import TrustRing from './TrustRing';
import SabiScoreBar from './SabiScoreBar';

export default function WorkerPulse({ user }) {
  const weeklyIncome = Math.round(user.total_income / 12); // approx weekly

  return (
    <div className="space-y-4">
      {/* Income summary */}
      <div className="bg-white rounded-xl border border-warm-border p-4">
        <h3 className="text-sm font-semibold text-warm-text mb-3">This Week</h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-lg font-bold text-sabi-green">₦{(weeklyIncome).toLocaleString()}</p>
            <p className="text-[10px] text-warm-muted">Income</p>
          </div>
          <div>
            <p className="text-lg font-bold text-warm-text">{Math.ceil(user.total_jobs / 12)}</p>
            <p className="text-[10px] text-warm-muted">Jobs</p>
          </div>
          <div>
            <p className="text-lg font-bold text-cash-gold">4.6</p>
            <p className="text-[10px] text-warm-muted">Avg Rating</p>
          </div>
        </div>
      </div>

      {/* Trust Ring */}
      <div className="bg-white rounded-xl border border-warm-border p-4 flex flex-col items-center">
        <h3 className="text-sm font-semibold text-warm-text mb-3">Trust Score</h3>
        <TrustRing score={user.trust_score} />
        <p className="text-[10px] text-warm-muted mt-2 text-center">
          Based on {user.total_jobs} completed jobs, payment speed, and ratings
        </p>
      </div>

      {/* SabiScore */}
      <SabiScoreBar score={user.sabi_score} />

      {/* AI Insight */}
      <div className="bg-sabi-green/5 rounded-xl border border-sabi-green/20 p-4">
        <div className="flex items-start gap-2">
          <span className="text-base">💡</span>
          <div>
            <p className="text-xs font-medium text-sabi-green mb-0.5">Insight</p>
            <p className="text-xs text-warm-text leading-relaxed">
              Your reliability is top 20% in {user.service_areas?.[0] || 'your area'}.
              Completing 3 more jobs this week could move you to the next trust tier.
            </p>
          </div>
        </div>
      </div>

      {/* Financial products unlocked */}
      <div className="bg-white rounded-xl border border-warm-border p-4">
        <h3 className="text-sm font-semibold text-warm-text mb-2">Unlocked</h3>
        <div className="space-y-2">
          <UnlockItem unlocked={true} label="Basic Matching" description="Available to all workers" />
          <UnlockItem unlocked={user.trust_score >= 0.3} label="Priority Matching" description="Trust score ≥ 0.30" />
          <UnlockItem unlocked={user.trust_score >= 0.6} label="Accept Apprentices" description="Trust score ≥ 0.60" />
          <UnlockItem unlocked={user.sabi_score >= 30} label="Savings Account" description="SabiScore ≥ 30" />
          <UnlockItem unlocked={user.sabi_score >= 50} label="Microloan" description="SabiScore ≥ 50" />
          <UnlockItem unlocked={user.sabi_score >= 70} label="Full Financial Suite" description="SabiScore ≥ 70" />
        </div>
      </div>
    </div>
  );
}

function UnlockItem({ unlocked, label, description }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${unlocked ? 'bg-sabi-green' : 'bg-warm-border'}`}>
        {unlocked ? (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="3" fill="none"/></svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="#999"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
        )}
      </div>
      <div>
        <p className={`text-xs font-medium ${unlocked ? 'text-warm-text' : 'text-warm-muted'}`}>{label}</p>
        <p className="text-[9px] text-warm-muted">{description}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add pwa/src/components/pulse/WorkerPulse.jsx
git commit -m "feat: add WorkerPulse with income stats, trust ring, SabiScore, insights"
```

---

### Task 3: Trader Pulse + Seeker Pulse

**Files:**
- Create: `pwa/src/components/pulse/TraderPulse.jsx`
- Create: `pwa/src/components/pulse/SeekerPulse.jsx`

- [ ] **Step 1: Create TraderPulse**

```jsx
// pwa/src/components/pulse/TraderPulse.jsx
import SabiScoreBar from './SabiScoreBar';

export default function TraderPulse({ user }) {
  const weeklyRevenue = Math.round(user.total_logged_revenue / 12);
  const weeklySales = Math.round(user.total_logged_sales / 12);

  return (
    <div className="space-y-4">
      {/* Revenue summary */}
      <div className="bg-white rounded-xl border border-warm-border p-4">
        <h3 className="text-sm font-semibold text-warm-text mb-3">This Week</h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-lg font-bold text-sabi-green">₦{weeklyRevenue.toLocaleString()}</p>
            <p className="text-[10px] text-warm-muted">Revenue</p>
          </div>
          <div>
            <p className="text-lg font-bold text-warm-text">{weeklySales}</p>
            <p className="text-[10px] text-warm-muted">Sales</p>
          </div>
          <div>
            <p className="text-lg font-bold text-work-orange capitalize">{user.business_type?.replace('_', ' ')}</p>
            <p className="text-[10px] text-warm-muted">Category</p>
          </div>
        </div>
      </div>

      {/* Top selling items (simulated) */}
      <div className="bg-white rounded-xl border border-warm-border p-4">
        <h3 className="text-sm font-semibold text-warm-text mb-2">Top Items</h3>
        <div className="space-y-2">
          <TopItem name="Rice (50kg)" count={34} revenue={850000} />
          <TopItem name="Garri (paint)" count={28} revenue={140000} />
          <TopItem name="Palm Oil" count={22} revenue={220000} />
        </div>
      </div>

      {/* SabiScore */}
      <SabiScoreBar score={user.sabi_score} />

      {/* Loan progress */}
      <div className="bg-cash-gold/5 rounded-xl border border-cash-gold/20 p-4">
        <div className="flex items-start gap-2">
          <span className="text-base">🎯</span>
          <div>
            <p className="text-xs font-medium text-cash-gold mb-0.5">Loan Progress</p>
            <p className="text-xs text-warm-text leading-relaxed">
              {user.sabi_score < 50
                ? `${50 - user.sabi_score} points to microloan eligibility. Keep logging sales consistently!`
                : 'You qualify for a microloan! Visit your nearest partner MFI.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TopItem({ name, count, revenue }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-medium text-warm-text">{name}</p>
        <p className="text-[10px] text-warm-muted">{count} sales</p>
      </div>
      <p className="text-xs font-semibold text-warm-text">₦{revenue.toLocaleString()}</p>
    </div>
  );
}
```

- [ ] **Step 2: Create SeekerPulse**

```jsx
// pwa/src/components/pulse/SeekerPulse.jsx
export default function SeekerPulse({ user }) {
  return (
    <div className="space-y-4">
      {/* Demand near you */}
      <div className="bg-white rounded-xl border border-warm-border p-4">
        <h3 className="text-sm font-semibold text-warm-text mb-2">Demand Near You</h3>
        <p className="text-xs text-warm-muted mb-3">Trades people are searching for in {user.area}</p>
        <div className="space-y-2">
          <DemandItem trade="Tiling" count={47} gap={true} />
          <DemandItem trade="Plumbing" count={23} gap={false} />
          <DemandItem trade="Electrical" count={18} gap={false} />
        </div>
      </div>

      {/* Apprenticeship opportunity */}
      <div className="bg-sabi-green/5 rounded-xl border border-sabi-green/20 p-4">
        <h3 className="text-sm font-semibold text-sabi-green mb-2">Opportunity</h3>
        <p className="text-xs text-warm-text leading-relaxed mb-3">
          There are <span className="font-bold">47 tiling requests</span> in Surulere with
          <span className="font-bold text-alert-red"> zero tilers</span> available.
          Learn tiling and you could be earning ₦15k-50k per job within 8 weeks.
        </p>
        <button className="w-full h-9 bg-sabi-green text-white text-sm font-medium rounded-lg">
          View Apprenticeships
        </button>
      </div>

      {/* Your interests */}
      <div className="bg-white rounded-xl border border-warm-border p-4">
        <h3 className="text-sm font-semibold text-warm-text mb-2">Your Interests</h3>
        <div className="flex flex-wrap gap-2">
          {(user.interests || []).map((interest) => (
            <span
              key={interest}
              className="px-2.5 py-1 text-xs bg-work-orange/10 text-work-orange rounded-full capitalize"
            >
              {interest.replace('_', ' ')}
            </span>
          ))}
        </div>
      </div>

      {/* Motivational */}
      <div className="bg-work-orange/5 rounded-xl border border-work-orange/20 p-4">
        <div className="flex items-start gap-2">
          <span className="text-base">🚀</span>
          <div>
            <p className="text-xs font-medium text-work-orange mb-0.5">Your Path</p>
            <p className="text-xs text-warm-text leading-relaxed">
              5 apprenticeship spots are available in your area.
              Top apprentices earn ₦5,000/week while learning and graduate with guaranteed first jobs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DemandItem({ trade, count, gap }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-xs capitalize text-warm-text font-medium">{trade}</span>
        {gap && (
          <span className="text-[9px] px-1.5 py-0.5 bg-alert-red/10 text-alert-red rounded-full font-medium">
            GAP
          </span>
        )}
      </div>
      <span className="text-xs text-warm-muted">{count} requests</span>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add pwa/src/components/pulse/TraderPulse.jsx pwa/src/components/pulse/SeekerPulse.jsx
git commit -m "feat: add TraderPulse and SeekerPulse dashboard variants"
```

---

### Task 4: PulsePage (Route to Correct Variant)

**Files:**
- Modify: `pwa/src/pages/PulsePage.jsx`

- [ ] **Step 1: Replace PulsePage placeholder with real implementation**

```jsx
// pwa/src/pages/PulsePage.jsx
import useAppStore from '../stores/appStore';
import WorkerPulse from '../components/pulse/WorkerPulse';
import TraderPulse from '../components/pulse/TraderPulse';
import SeekerPulse from '../components/pulse/SeekerPulse';

export default function PulsePage() {
  const { user } = useAppStore();

  // Default to worker view for demo
  const role = user?.role || 'worker';

  // Mock user data for demo if no user logged in
  const demoUser = user || {
    role: 'worker',
    name: 'Emeka Okafor',
    trust_score: 0.76,
    sabi_score: 62,
    total_jobs: 34,
    total_income: 510000,
    service_areas: ['surulere', 'yaba', 'mushin'],
    primary_trade: 'plumbing'
  };

  return (
    <div className="h-full pb-14 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-warm-bg/95 backdrop-blur-sm z-10 px-4 pt-4 pb-2 border-b border-warm-border">
        <h1 className="text-lg font-bold text-warm-text">Pulse</h1>
        <p className="text-xs text-warm-muted">Your economic dashboard</p>
      </div>

      <div className="p-4">
        {role === 'worker' && <WorkerPulse user={demoUser} />}
        {role === 'trader' && <TraderPulse user={demoUser} />}
        {role === 'seeker' && <SeekerPulse user={demoUser} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add pwa/src/pages/PulsePage.jsx
git commit -m "feat: implement PulsePage routing to worker/trader/seeker variants"
```

---

### Task 5: Profile Page

**Files:**
- Modify: `pwa/src/pages/ProfilePage.jsx`
- Create: `pwa/src/components/profile/ScoreSection.jsx`
- Create: `pwa/src/components/profile/BankSection.jsx`

- [ ] **Step 1: Create ScoreSection**

```jsx
// pwa/src/components/profile/ScoreSection.jsx
import TrustRing from '../pulse/TrustRing';

export default function ScoreSection({ trustScore, sabiScore }) {
  return (
    <div className="bg-white rounded-xl border border-warm-border p-4">
      <h3 className="text-sm font-semibold text-warm-text mb-3">Your Scores</h3>
      <div className="flex items-center justify-around">
        <TrustRing score={trustScore} />
        <div className="text-center">
          <p className="text-3xl font-bold text-warm-text">{sabiScore}</p>
          <p className="text-[10px] text-warm-muted">SabiScore</p>
          <p className="text-[9px] text-sabi-green mt-0.5">/ 100</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create BankSection**

```jsx
// pwa/src/components/profile/BankSection.jsx
export default function BankSection({ user }) {
  return (
    <div className="bg-white rounded-xl border border-warm-border p-4">
      <h3 className="text-sm font-semibold text-warm-text mb-3">Bank Details</h3>
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-warm-muted">Account Name</span>
          <span className="text-warm-text font-medium">{user.account_name || '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-warm-muted">Account Number</span>
          <span className="text-warm-text font-mono">{user.account_number || '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-warm-muted">Bank</span>
          <span className="text-warm-text">{user.bank_code || '—'}</span>
        </div>
        {user.virtual_account_number && (
          <>
            <div className="border-t border-warm-border my-2" />
            <div className="flex justify-between">
              <span className="text-warm-muted">Virtual Account</span>
              <span className="text-sabi-green font-mono font-medium">{user.virtual_account_number}</span>
            </div>
            <p className="text-[10px] text-warm-muted">
              Any payment to this account is auto-logged and improves your SabiScore
            </p>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Replace ProfilePage**

```jsx
// pwa/src/pages/ProfilePage.jsx
import { useState } from 'react';
import useAppStore from '../stores/appStore';
import ScoreSection from '../components/profile/ScoreSection';
import BankSection from '../components/profile/BankSection';
import api from '../services/api';

export default function ProfilePage() {
  const { user } = useAppStore();

  // Demo user for display
  const profile = user || {
    name: 'Emeka Okafor',
    phone: '08031000001',
    primary_trade: 'plumbing',
    service_areas: ['surulere', 'yaba', 'mushin'],
    trust_score: 0.76,
    sabi_score: 62,
    total_jobs: 34,
    total_income: 510000,
    is_available: true,
    account_name: 'EMEKA OKAFOR',
    account_number: '0123456701',
    bank_code: '058',
    virtual_account_number: '9900000001',
    onboarding_channel: 'whatsapp',
    gps_verified: true
  };

  const [available, setAvailable] = useState(profile.is_available);

  const toggleAvailability = async () => {
    const newVal = !available;
    setAvailable(newVal);
    try {
      if (user?.id) {
        await api.updateAvailability(user.id, newVal);
      }
    } catch (err) {
      setAvailable(!newVal); // revert
    }
  };

  return (
    <div className="h-full pb-14 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-warm-bg/95 backdrop-blur-sm z-10 px-4 pt-4 pb-2 border-b border-warm-border">
        <h1 className="text-lg font-bold text-warm-text">Profile</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* User card */}
        <div className="bg-white rounded-xl border border-warm-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-sabi-green flex items-center justify-center text-white text-xl font-bold">
              {profile.name.charAt(0)}
            </div>
            <div className="flex-1">
              <h2 className="text-base font-semibold text-warm-text">{profile.name}</h2>
              <p className="text-xs text-warm-muted capitalize">{profile.primary_trade} · {profile.phone}</p>
              <div className="flex items-center gap-1 mt-1">
                {profile.gps_verified && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-sabi-green/10 text-sabi-green rounded-full">GPS ✓</span>
                )}
                <span className="text-[9px] px-1.5 py-0.5 bg-warm-bg text-warm-muted rounded-full capitalize">
                  via {profile.onboarding_channel}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Availability toggle */}
        <div className="bg-white rounded-xl border border-warm-border p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-warm-text">Available for Jobs</p>
            <p className="text-[10px] text-warm-muted">Toggle to appear in search results</p>
          </div>
          <button
            onClick={toggleAvailability}
            className={`w-12 h-7 rounded-full transition-colors relative ${
              available ? 'bg-sabi-green' : 'bg-warm-border'
            }`}
          >
            <div
              className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                available ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Scores */}
        <ScoreSection trustScore={profile.trust_score} sabiScore={profile.sabi_score} />

        {/* Service areas */}
        <div className="bg-white rounded-xl border border-warm-border p-4">
          <h3 className="text-sm font-semibold text-warm-text mb-2">Service Areas</h3>
          <div className="flex flex-wrap gap-2">
            {(profile.service_areas || []).map((area) => (
              <span key={area} className="px-2.5 py-1 text-xs bg-warm-bg text-warm-text rounded-full capitalize">
                {area.replace('_', ' ')}
              </span>
            ))}
          </div>
        </div>

        {/* Bank */}
        <BankSection user={profile} />

        {/* Stats */}
        <div className="bg-white rounded-xl border border-warm-border p-4">
          <h3 className="text-sm font-semibold text-warm-text mb-2">Lifetime Stats</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center bg-warm-bg rounded-lg p-3">
              <p className="text-lg font-bold text-warm-text">{profile.total_jobs}</p>
              <p className="text-[10px] text-warm-muted">Jobs Done</p>
            </div>
            <div className="text-center bg-warm-bg rounded-lg p-3">
              <p className="text-lg font-bold text-sabi-green">₦{(profile.total_income / 1000).toFixed(0)}k</p>
              <p className="text-[10px] text-warm-muted">Total Earned</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add pwa/src/pages/ProfilePage.jsx pwa/src/components/profile/ScoreSection.jsx pwa/src/components/profile/BankSection.jsx
git commit -m "feat: implement ProfilePage with scores, bank, availability toggle"
```

---

### Task 6: Geolocation Hook

**Files:**
- Create: `pwa/src/hooks/useGeolocation.js`

- [ ] **Step 1: Create useGeolocation hook**

```javascript
// pwa/src/hooks/useGeolocation.js
import { useState, useCallback } from 'react';

export function useGeolocation() {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const capture = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return Promise.reject(new Error('Geolocation not supported'));
    }

    setLoading(true);
    setError(null);

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
          setLocation(coords);
          setLoading(false);
          resolve(coords);
        },
        (err) => {
          setError(err.message);
          setLoading(false);
          reject(err);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });
  }, []);

  return { location, error, loading, capture };
}
```

- [ ] **Step 2: Commit**

```bash
git add pwa/src/hooks/useGeolocation.js
git commit -m "feat: add useGeolocation hook for GPS capture"
```

---

### Task 7: Field Agent Mode (Nav + Onboard Form + Stats)

**Files:**
- Create: `pwa/src/components/agent/AgentNav.jsx`
- Create: `pwa/src/components/agent/OnboardPage.jsx`
- Create: `pwa/src/components/agent/AgentStats.jsx`

- [ ] **Step 1: Create AgentNav**

```jsx
// pwa/src/components/agent/AgentNav.jsx
import { useLocation, useNavigate } from 'react-router-dom';

const tabs = [
  { path: '/', label: 'Map', icon: '🗺️' },
  { path: '/onboard', label: 'Onboard', icon: '➕' },
  { path: '/stats', label: 'Stats', icon: '📊' }
];

export default function AgentNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-warm-border">
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center w-full h-full min-w-[48px] min-h-[48px] transition-colors ${
                active ? 'text-work-orange' : 'text-warm-muted'
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span className="text-[10px] mt-0.5 font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Create OnboardPage (Field Agent form)**

```jsx
// pwa/src/components/agent/OnboardPage.jsx
import { useState } from 'react';
import { useGeolocation } from '../../hooks/useGeolocation';
import api from '../../services/api';

const TRADES = [
  'plumbing', 'electrical', 'carpentry', 'cleaning', 'tailoring',
  'hairdressing', 'painting', 'catering', 'welding', 'tiling'
];

const AREAS = [
  'surulere', 'yaba', 'ikeja', 'lekki', 'victoria_island',
  'mushin', 'maryland', 'ojota', 'ikorodu', 'ajah'
];

export default function OnboardPage() {
  const { location, loading: gpsLoading, capture } = useGeolocation();
  const [form, setForm] = useState({
    name: '', phone: '', primary_trade: '', service_areas: [],
    bank_code: '', account_number: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);

  const updateField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const toggleArea = (area) => {
    setForm((f) => ({
      ...f,
      service_areas: f.service_areas.includes(area)
        ? f.service_areas.filter((a) => a !== area)
        : [...f.service_areas, area]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Capture GPS if not already done
      let coords = location;
      if (!coords) {
        coords = await capture();
      }

      await api.getWorkers(); // placeholder — will call onboard endpoint
      const payload = {
        ...form,
        location_lat: coords.lat,
        location_lng: coords.lng,
        onboarding_channel: 'field_agent',
        gps_verified: true
      };

      // POST to onboard endpoint
      const response = await fetch('/api/workers/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();

      setSuccess(result);
      setForm({ name: '', phone: '', primary_trade: '', service_areas: [], bank_code: '', account_number: '' });
    } catch (err) {
      alert('Registration failed: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="h-full pb-14 overflow-y-auto p-4">
        <div className="bg-sabi-green/5 rounded-xl border border-sabi-green/20 p-6 text-center mt-8">
          <p className="text-3xl mb-2">✅</p>
          <h2 className="text-lg font-bold text-sabi-green">Worker Registered!</h2>
          <p className="text-sm text-warm-text mt-1">{success.name || form.name}</p>
          {success.virtual_account_number && (
            <p className="text-xs text-warm-muted mt-2">
              VA: <span className="font-mono text-sabi-green">{success.virtual_account_number}</span>
            </p>
          )}
          <button
            onClick={() => setSuccess(null)}
            className="mt-4 px-6 py-2 bg-sabi-green text-white rounded-lg text-sm font-medium"
          >
            Register Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full pb-14 overflow-y-auto">
      <div className="sticky top-0 bg-warm-bg/95 backdrop-blur-sm z-10 px-4 pt-4 pb-2 border-b border-warm-border">
        <h1 className="text-lg font-bold text-warm-text">Onboard Worker</h1>
        <p className="text-xs text-warm-muted">GPS will be captured automatically</p>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {/* GPS status */}
        <div className="flex items-center gap-2 text-xs">
          <div className={`w-2.5 h-2.5 rounded-full ${location ? 'bg-sabi-green' : 'bg-cash-gold animate-pulse'}`} />
          <span className="text-warm-muted">
            {location
              ? `GPS: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)} (±${Math.round(location.accuracy)}m)`
              : gpsLoading ? 'Acquiring GPS...' : 'GPS will capture on submit'}
          </span>
          {!location && (
            <button type="button" onClick={capture} className="text-sabi-green font-medium">
              Capture Now
            </button>
          )}
        </div>

        {/* Name */}
        <div>
          <label className="text-xs font-medium text-warm-text">Full Name</label>
          <input
            type="text" required value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            className="mt-1 w-full h-10 px-3 rounded-lg border border-warm-border text-sm focus:outline-none focus:border-sabi-green"
            placeholder="Enter worker's name"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="text-xs font-medium text-warm-text">Phone Number</label>
          <input
            type="tel" required value={form.phone}
            onChange={(e) => updateField('phone', e.target.value)}
            className="mt-1 w-full h-10 px-3 rounded-lg border border-warm-border text-sm focus:outline-none focus:border-sabi-green"
            placeholder="08012345678"
          />
        </div>

        {/* Trade */}
        <div>
          <label className="text-xs font-medium text-warm-text">Primary Trade</label>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {TRADES.map((trade) => (
              <button
                key={trade} type="button"
                onClick={() => updateField('primary_trade', trade)}
                className={`h-9 rounded-lg text-xs font-medium capitalize transition-colors ${
                  form.primary_trade === trade
                    ? 'bg-sabi-green text-white'
                    : 'bg-warm-bg text-warm-text border border-warm-border'
                }`}
              >
                {trade}
              </button>
            ))}
          </div>
        </div>

        {/* Service Areas */}
        <div>
          <label className="text-xs font-medium text-warm-text">Service Areas (select multiple)</label>
          <div className="mt-1 flex flex-wrap gap-2">
            {AREAS.map((area) => (
              <button
                key={area} type="button"
                onClick={() => toggleArea(area)}
                className={`px-2.5 py-1.5 rounded-full text-xs capitalize transition-colors ${
                  form.service_areas.includes(area)
                    ? 'bg-work-orange text-white'
                    : 'bg-warm-bg text-warm-text border border-warm-border'
                }`}
              >
                {area.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Bank details */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-warm-text">Bank Code</label>
            <input
              type="text" value={form.bank_code}
              onChange={(e) => updateField('bank_code', e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-lg border border-warm-border text-sm focus:outline-none focus:border-sabi-green"
              placeholder="058"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-warm-text">Account No.</label>
            <input
              type="text" value={form.account_number}
              onChange={(e) => updateField('account_number', e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-lg border border-warm-border text-sm focus:outline-none focus:border-sabi-green"
              placeholder="0123456789"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || !form.name || !form.phone || !form.primary_trade}
          className="w-full h-12 bg-sabi-green text-white text-sm font-semibold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>Register Worker</>
          )}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Create AgentStats**

```jsx
// pwa/src/components/agent/AgentStats.jsx
export default function AgentStats() {
  // Demo stats
  const stats = {
    today: 3,
    total: 8,
    area: 'surulere',
    topTrade: 'plumbing'
  };

  return (
    <div className="h-full pb-14 overflow-y-auto">
      <div className="sticky top-0 bg-warm-bg/95 backdrop-blur-sm z-10 px-4 pt-4 pb-2 border-b border-warm-border">
        <h1 className="text-lg font-bold text-warm-text">Agent Stats</h1>
        <p className="text-xs text-warm-muted">Your onboarding performance</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl border border-warm-border p-4 text-center">
            <p className="text-2xl font-bold text-sabi-green">{stats.today}</p>
            <p className="text-xs text-warm-muted">Today</p>
          </div>
          <div className="bg-white rounded-xl border border-warm-border p-4 text-center">
            <p className="text-2xl font-bold text-warm-text">{stats.total}</p>
            <p className="text-xs text-warm-muted">Total</p>
          </div>
        </div>

        {/* Area info */}
        <div className="bg-white rounded-xl border border-warm-border p-4">
          <h3 className="text-sm font-semibold text-warm-text mb-2">Your Area</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-warm-muted">Assigned</span>
              <span className="text-warm-text capitalize">{stats.area}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-warm-muted">Top demand</span>
              <span className="text-warm-text capitalize">{stats.topTrade}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-warm-muted">Workers needed</span>
              <span className="text-work-orange font-medium">12 more</span>
            </div>
          </div>
        </div>

        {/* Priority zones */}
        <div className="bg-work-orange/5 rounded-xl border border-work-orange/20 p-4">
          <h3 className="text-sm font-semibold text-work-orange mb-2">Priority Zones</h3>
          <p className="text-xs text-warm-text leading-relaxed">
            Surulere market area has <strong>47 unmet tiling requests</strong>.
            Focus onboarding tilers near Adeniran Ogunsanya Street.
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add agent routes to App.jsx**

Update `pwa/src/App.jsx` to include agent routes:

```jsx
// Add imports
import OnboardPage from './components/agent/OnboardPage';
import AgentStats from './components/agent/AgentStats';
import AgentNav from './components/agent/AgentNav';
import useAppStore from './stores/appStore';

export default function App() {
  const { user } = useAppStore();
  const isAgent = user?.role === 'agent';

  return (
    <div className="h-screen w-screen overflow-hidden bg-warm-bg relative">
      <Routes>
        <Route path="/" element={<MapPage />} />
        <Route path="/pulse" element={<PulsePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/onboard" element={<OnboardPage />} />
        <Route path="/stats" element={<AgentStats />} />
      </Routes>
      <ChatSheet />
      {isAgent ? <AgentNav /> : <BottomNav />}
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add pwa/src/components/agent/AgentNav.jsx pwa/src/components/agent/OnboardPage.jsx pwa/src/components/agent/AgentStats.jsx pwa/src/App.jsx
git commit -m "feat: add Field Agent mode with GPS onboarding form and stats"
```

---

### Task 8: Verify All Pages

**Files:** None (verification only)

- [ ] **Step 1: Start dev server**

Run: `cd pwa && npm run dev`

- [ ] **Step 2: Verify all routes**

Navigate to:
- `/` — Map with FAB (orange sparkle button)
- `/pulse` — Shows WorkerPulse with TrustRing, SabiScore bar, insights
- `/profile` — Shows user info, availability toggle, scores, bank details
- Bottom nav switches between pages

- [ ] **Step 3: Test chat interaction (mock)**

- Tap FAB → Chat sheet slides up
- Type message → Shows user bubble (green)
- API call will fail if backend not running — that's expected
- Close via X or backdrop tap

- [ ] **Step 4: Commit if any fixes needed**

```bash
git add -A pwa/src/
git commit -m "fix: resolve any lint or render issues in PWA pages"
```
