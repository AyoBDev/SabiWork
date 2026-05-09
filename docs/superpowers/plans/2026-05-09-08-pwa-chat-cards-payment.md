# Plan 8: PWA AI Chat + Cards + Payment Flow

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the AI chat interface — the floating action button (FAB), bottom-sheet chat panel, message bubbles, typed response cards (worker card, payment card, tracking card, rating card, payout card), and the full buyer flow: type need → AI matches → show worker card → book → Squad checkout → payment confirmed → job tracking → completion → rating → payout notification.

**Architecture:** Chat is a bottom-sheet overlay (65% of screen). Messages are an array of typed objects in Zustand. The `sendChat` API call returns structured responses that map to card components. Squad payment opens in an embedded iframe or redirect. Job state tracked in store and updated via polling.

**Tech Stack:** React 19, Zustand, CSS transitions (transform/opacity only), Squad checkout URL

**Depends on:** Plan 7 (PWA scaffold), Plan 4 (backend /api/chat endpoint), Plan 2 (Squad payments)

---

## File Structure

```
pwa/src/
├── components/
│   ├── chat/
│   │   ├── AIButton.jsx         # Floating action button (orange, sparkle)
│   │   ├── ChatSheet.jsx        # Bottom sheet container
│   │   ├── ChatBubble.jsx       # Text message bubble
│   │   ├── ChatInput.jsx        # Input bar with send button
│   │   └── ChatMessage.jsx      # Routes message type to correct component
│   └── cards/
│       ├── WorkerCard.jsx       # Matched worker info + book button
│       ├── PaymentCard.jsx      # Squad checkout prompt
│       ├── TrackingCard.jsx     # Job in progress status
│       ├── RatingCard.jsx       # Star rating after completion
│       ├── PayoutCard.jsx       # Worker payout confirmation
│       └── DemandCard.jsx       # Demand insight card
└── hooks/
    └── useChat.js               # Chat logic hook
```

---

### Task 1: AI Floating Action Button

**Files:**
- Create: `pwa/src/components/chat/AIButton.jsx`

- [ ] **Step 1: Create AIButton component**

```jsx
// pwa/src/components/chat/AIButton.jsx
import useAppStore from '../../stores/appStore';

export default function AIButton() {
  const { chatOpen, setChatOpen, activeJob } = useAppStore();

  if (chatOpen) return null;

  return (
    <button
      onClick={() => setChatOpen(true)}
      className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-work-orange shadow-lg flex items-center justify-center transition-transform active:scale-90"
      style={{
        animation: 'breathe 3s ease-in-out infinite'
      }}
      aria-label="Open AI Chat"
    >
      {/* Sparkle icon */}
      <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
        <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" />
      </svg>

      {/* Status dot when active job exists */}
      {activeJob && (
        <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-sabi-green rounded-full border-2 border-white" />
      )}

      <style>{`
        @keyframes breathe {
          0%, 100% { box-shadow: 0 4px 16px rgba(232, 99, 10, 0.4); }
          50% { box-shadow: 0 4px 24px rgba(232, 99, 10, 0.7); }
        }
      `}</style>
    </button>
  );
}
```

- [ ] **Step 2: Add AIButton to MapPage**

Update `pwa/src/pages/MapPage.jsx` — add `<AIButton />` after `<LayerToggle />`:

```jsx
// Add import at top
import AIButton from '../components/chat/AIButton';

// Add in JSX after <LayerToggle />
<AIButton />
```

- [ ] **Step 3: Commit**

```bash
git add pwa/src/components/chat/AIButton.jsx pwa/src/pages/MapPage.jsx
git commit -m "feat: add AI floating action button with breathing glow"
```

---

### Task 2: Chat Sheet (Bottom Panel)

**Files:**
- Create: `pwa/src/components/chat/ChatSheet.jsx`
- Create: `pwa/src/components/chat/ChatInput.jsx`

- [ ] **Step 1: Create ChatSheet**

```jsx
// pwa/src/components/chat/ChatSheet.jsx
import { useRef, useEffect } from 'react';
import useAppStore from '../../stores/appStore';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';

export default function ChatSheet() {
  const { chatOpen, setChatOpen, messages } = useAppStore();
  const scrollRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ease-out ${
        chatOpen ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{ height: '65vh' }}
    >
      {/* Backdrop */}
      {chatOpen && (
        <div
          className="fixed inset-0 bg-black/20 -z-10"
          onClick={() => setChatOpen(false)}
        />
      )}

      {/* Sheet */}
      <div className="h-full bg-white rounded-t-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Handle */}
        <div className="flex items-center justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-warm-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-2 border-b border-warm-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-work-orange flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-warm-text">SabiWork AI</p>
              <p className="text-[10px] text-sabi-green">Ready to help</p>
            </div>
          </div>
          <button
            onClick={() => setChatOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-warm-bg"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-warm-muted text-sm mt-8">
              <p className="text-base mb-1">Wetin you need?</p>
              <p className="text-xs">Try: "I need a plumber in Surulere"</p>
            </div>
          )}
          {messages.map((msg, idx) => (
            <ChatMessage key={idx} message={msg} />
          ))}
        </div>

        {/* Input */}
        <ChatInput />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create ChatInput**

```jsx
// pwa/src/components/chat/ChatInput.jsx
import { useState } from 'react';
import useAppStore from '../../stores/appStore';
import { useChat } from '../../hooks/useChat';

export default function ChatInput() {
  const [text, setText] = useState('');
  const { loading } = useAppStore();
  const { send } = useChat();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim() || loading) return;
    send(text.trim());
    setText('');
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 px-3 py-2 border-t border-warm-border bg-white safe-area-pb"
    >
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Wetin you dey find?"
        disabled={loading}
        className="flex-1 h-10 px-4 rounded-full bg-warm-bg border border-warm-border text-sm focus:outline-none focus:border-sabi-green disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={!text.trim() || loading}
        className="w-10 h-10 rounded-full bg-sabi-green flex items-center justify-center disabled:opacity-40 transition-opacity"
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        )}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Add ChatSheet to App.jsx**

Update `pwa/src/App.jsx` — import and render ChatSheet:

```jsx
// Add import
import ChatSheet from './components/chat/ChatSheet';

// Add before <BottomNav />
<ChatSheet />
```

- [ ] **Step 4: Commit**

```bash
git add pwa/src/components/chat/ChatSheet.jsx pwa/src/components/chat/ChatInput.jsx pwa/src/App.jsx
git commit -m "feat: add chat bottom sheet with input and auto-scroll"
```

---

### Task 3: Chat Message Router + Bubble

**Files:**
- Create: `pwa/src/components/chat/ChatMessage.jsx`
- Create: `pwa/src/components/chat/ChatBubble.jsx`

- [ ] **Step 1: Create ChatBubble**

```jsx
// pwa/src/components/chat/ChatBubble.jsx
export default function ChatBubble({ text, sender }) {
  const isUser = sender === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-sabi-green text-white rounded-br-sm'
            : 'bg-warm-bg text-warm-text rounded-bl-sm'
        }`}
      >
        {text}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create ChatMessage router**

```jsx
// pwa/src/components/chat/ChatMessage.jsx
import ChatBubble from './ChatBubble';
import WorkerCard from '../cards/WorkerCard';
import PaymentCard from '../cards/PaymentCard';
import TrackingCard from '../cards/TrackingCard';
import RatingCard from '../cards/RatingCard';
import PayoutCard from '../cards/PayoutCard';
import DemandCard from '../cards/DemandCard';

export default function ChatMessage({ message }) {
  switch (message.type) {
    case 'text':
      return <ChatBubble text={message.text} sender={message.sender} />;
    case 'worker_card':
      return <WorkerCard worker={message.data} />;
    case 'payment_card':
      return <PaymentCard payment={message.data} />;
    case 'tracking_card':
      return <TrackingCard job={message.data} />;
    case 'rating_card':
      return <RatingCard job={message.data} />;
    case 'payout_card':
      return <PayoutCard payout={message.data} />;
    case 'demand_card':
      return <DemandCard demand={message.data} />;
    default:
      return <ChatBubble text={message.text || 'Unknown message'} sender="ai" />;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add pwa/src/components/chat/ChatMessage.jsx pwa/src/components/chat/ChatBubble.jsx
git commit -m "feat: add chat bubble and message type router"
```

---

### Task 4: Worker Card

**Files:**
- Create: `pwa/src/components/cards/WorkerCard.jsx`

- [ ] **Step 1: Create WorkerCard**

```jsx
// pwa/src/components/cards/WorkerCard.jsx
import { useChat } from '../../hooks/useChat';

const TRUST_COLORS = {
  emerging: '#4CAF50',
  trusted: '#1B7A3D',
  verified: '#1976D2',
  elite: '#F9A825'
};

function getTrustTier(score) {
  if (score >= 0.8) return 'elite';
  if (score >= 0.6) return 'verified';
  if (score >= 0.3) return 'trusted';
  return 'emerging';
}

export default function WorkerCard({ worker }) {
  const { bookWorker } = useChat();
  const tier = getTrustTier(worker.trust_score);
  const color = TRUST_COLORS[tier];

  return (
    <div className="bg-white rounded-xl border border-warm-border p-3 shadow-sm">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
          style={{ background: color }}
        >
          {worker.name.charAt(0)}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-warm-text truncate">{worker.name}</h3>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full text-white font-medium"
              style={{ background: color }}
            >
              {tier}
            </span>
          </div>
          <p className="text-xs text-warm-muted mt-0.5 capitalize">{worker.primary_trade}</p>

          {/* Stats */}
          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-warm-muted">
            <span>{worker.total_jobs} jobs</span>
            <span>⭐ {(worker.trust_score * 5).toFixed(1)}</span>
            {worker.distance && <span>📍 {worker.distance}</span>}
          </div>
        </div>
      </div>

      {/* Book button */}
      <button
        onClick={() => bookWorker(worker)}
        className="mt-3 w-full h-10 bg-sabi-green text-white text-sm font-medium rounded-lg active:scale-[0.98] transition-transform"
      >
        Book {worker.name.split(' ')[0]}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add pwa/src/components/cards/WorkerCard.jsx
git commit -m "feat: add WorkerCard with trust badge and book action"
```

---

### Task 5: Payment Card

**Files:**
- Create: `pwa/src/components/cards/PaymentCard.jsx`

- [ ] **Step 1: Create PaymentCard**

```jsx
// pwa/src/components/cards/PaymentCard.jsx
export default function PaymentCard({ payment }) {
  const handlePay = () => {
    // Open Squad checkout URL
    if (payment.checkout_url) {
      window.open(payment.checkout_url, '_blank');
    }
  };

  return (
    <div className="bg-white rounded-xl border border-warm-border p-3 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-cash-gold/20 flex items-center justify-center">
          <span className="text-base">💳</span>
        </div>
        <div>
          <p className="text-xs text-warm-muted">Payment Required</p>
          <p className="text-base font-bold text-warm-text">
            ₦{(payment.amount || 0).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="text-xs text-warm-muted mb-3 space-y-0.5">
        <p>Service: <span className="text-warm-text capitalize">{payment.service_category}</span></p>
        <p>Worker: <span className="text-warm-text">{payment.worker_name}</span></p>
        <p className="text-[10px]">Ref: {payment.transaction_ref}</p>
      </div>

      <button
        onClick={handlePay}
        className="w-full h-10 bg-cash-gold text-warm-text text-sm font-semibold rounded-lg active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
      >
        <span>Pay with Squad</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      </button>

      <p className="text-[10px] text-warm-muted text-center mt-1.5">
        Secured by Squad · Card, Transfer, or USSD
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add pwa/src/components/cards/PaymentCard.jsx
git commit -m "feat: add PaymentCard with Squad checkout integration"
```

---

### Task 6: Tracking, Rating, Payout, and Demand Cards

**Files:**
- Create: `pwa/src/components/cards/TrackingCard.jsx`
- Create: `pwa/src/components/cards/RatingCard.jsx`
- Create: `pwa/src/components/cards/PayoutCard.jsx`
- Create: `pwa/src/components/cards/DemandCard.jsx`

- [ ] **Step 1: Create TrackingCard**

```jsx
// pwa/src/components/cards/TrackingCard.jsx
const STATUS_LABELS = {
  paid: 'Payment Confirmed',
  in_progress: 'Job In Progress',
  completed: 'Job Completed',
  payout_sent: 'Payout Sent'
};

const STATUS_COLORS = {
  paid: 'bg-cash-gold',
  in_progress: 'bg-sabi-green',
  completed: 'bg-sabi-green',
  payout_sent: 'bg-sabi-green'
};

export default function TrackingCard({ job }) {
  const status = job.status || 'paid';

  return (
    <div className="bg-white rounded-xl border border-warm-border p-3 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[status]} animate-pulse`} />
        <span className="text-xs font-medium text-warm-text">{STATUS_LABELS[status]}</span>
      </div>

      <div className="bg-warm-bg rounded-lg p-2.5 text-xs space-y-1">
        <div className="flex justify-between">
          <span className="text-warm-muted">Worker</span>
          <span className="text-warm-text font-medium">{job.worker_name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-warm-muted">Service</span>
          <span className="text-warm-text capitalize">{job.service_category}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-warm-muted">Amount</span>
          <span className="text-warm-text font-medium">₦{(job.agreed_amount || 0).toLocaleString()}</span>
        </div>
      </div>

      {status === 'in_progress' && (
        <p className="text-[10px] text-sabi-green mt-2 text-center">
          Worker is on the way • You'll be notified when done
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create RatingCard**

```jsx
// pwa/src/components/cards/RatingCard.jsx
import { useState } from 'react';
import { useChat } from '../../hooks/useChat';

export default function RatingCard({ job }) {
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const { submitRating } = useChat();

  const handleSubmit = () => {
    if (rating === 0) return;
    submitRating(job.id, rating);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="bg-white rounded-xl border border-warm-border p-3 shadow-sm text-center">
        <p className="text-2xl mb-1">🎉</p>
        <p className="text-sm font-medium text-warm-text">Thank you!</p>
        <p className="text-xs text-warm-muted">Your rating helps build trust in the community.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-warm-border p-3 shadow-sm">
      <p className="text-sm font-medium text-warm-text mb-1">How was {job.worker_name}?</p>
      <p className="text-xs text-warm-muted mb-3">Your rating updates their trust score</p>

      <div className="flex justify-center gap-2 mb-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setRating(star)}
            className="text-2xl transition-transform active:scale-125"
          >
            {star <= rating ? '⭐' : '☆'}
          </button>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={rating === 0}
        className="w-full h-9 bg-sabi-green text-white text-sm font-medium rounded-lg disabled:opacity-40"
      >
        Submit Rating
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Create PayoutCard**

```jsx
// pwa/src/components/cards/PayoutCard.jsx
export default function PayoutCard({ payout }) {
  return (
    <div className="bg-white rounded-xl border border-sabi-green/30 p-3 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-sabi-green/10 flex items-center justify-center">
          <span className="text-base">✅</span>
        </div>
        <div>
          <p className="text-xs text-sabi-green font-medium">Payout Sent!</p>
          <p className="text-base font-bold text-warm-text">
            ₦{(payout.amount || 0).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="bg-sabi-green/5 rounded-lg p-2.5 text-xs space-y-1">
        <div className="flex justify-between">
          <span className="text-warm-muted">Bank</span>
          <span className="text-warm-text">{payout.bank_name || 'GTBank'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-warm-muted">Account</span>
          <span className="text-warm-text">{payout.account_name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-warm-muted">NIP Ref</span>
          <span className="text-warm-text font-mono text-[10px]">{payout.nip_ref}</span>
        </div>
      </div>

      {payout.trust_update && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px]">
          <span className="text-sabi-green">↑ Trust: {payout.trust_update.new_score.toFixed(2)}</span>
          <span className="text-warm-muted">•</span>
          <span className="text-cash-gold">SabiScore: {payout.trust_update.sabi_score}</span>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create DemandCard**

```jsx
// pwa/src/components/cards/DemandCard.jsx
export default function DemandCard({ demand }) {
  return (
    <div className="bg-white rounded-xl border border-work-orange/30 p-3 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-work-orange/10 flex items-center justify-center">
          <span className="text-base">📊</span>
        </div>
        <p className="text-sm font-medium text-warm-text">Demand Insight</p>
      </div>

      <p className="text-xs text-warm-muted leading-relaxed">{demand.insight}</p>

      {demand.stats && (
        <div className="grid grid-cols-3 gap-2 mt-2">
          {demand.stats.map((stat, i) => (
            <div key={i} className="text-center bg-warm-bg rounded-lg p-1.5">
              <p className="text-sm font-bold text-work-orange">{stat.value}</p>
              <p className="text-[9px] text-warm-muted">{stat.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add pwa/src/components/cards/TrackingCard.jsx pwa/src/components/cards/RatingCard.jsx pwa/src/components/cards/PayoutCard.jsx pwa/src/components/cards/DemandCard.jsx
git commit -m "feat: add TrackingCard, RatingCard, PayoutCard, DemandCard components"
```

---

### Task 7: useChat Hook (Chat Logic)

**Files:**
- Create: `pwa/src/hooks/useChat.js`

- [ ] **Step 1: Create useChat hook**

```javascript
// pwa/src/hooks/useChat.js
import useAppStore from '../stores/appStore';
import api from '../services/api';

export function useChat() {
  const { addMessage, setLoading, setActiveJob } = useAppStore();

  async function send(text) {
    // Add user message
    addMessage({ type: 'text', text, sender: 'user' });
    setLoading(true);

    try {
      const response = await api.sendChat(text, {
        location: useAppStore.getState().mapCenter
      });

      // Process AI response — may contain multiple messages
      const messages = response.messages || [response];

      for (const msg of messages) {
        addMessage({
          type: msg.type || 'text',
          text: msg.text,
          data: msg.data,
          sender: 'ai'
        });
      }

      // If response contains a job, track it
      if (response.job) {
        setActiveJob(response.job);
      }
    } catch (err) {
      addMessage({
        type: 'text',
        text: 'Sorry, something went wrong. Try again?',
        sender: 'ai'
      });
    } finally {
      setLoading(false);
    }
  }

  async function bookWorker(worker) {
    addMessage({
      type: 'text',
      text: `Booking ${worker.name}...`,
      sender: 'user'
    });
    setLoading(true);

    try {
      const response = await api.sendChat(`BOOK ${worker.id}`, {
        action: 'book',
        worker_id: worker.id
      });

      const messages = response.messages || [response];
      for (const msg of messages) {
        addMessage({
          type: msg.type || 'text',
          text: msg.text,
          data: msg.data,
          sender: 'ai'
        });
      }

      if (response.job) {
        setActiveJob(response.job);
      }
    } catch (err) {
      addMessage({
        type: 'text',
        text: 'Booking failed. Please try again.',
        sender: 'ai'
      });
    } finally {
      setLoading(false);
    }
  }

  async function submitRating(jobId, rating) {
    try {
      const response = await api.rateJob(jobId, rating);

      if (response.messages) {
        for (const msg of response.messages) {
          addMessage({
            type: msg.type || 'text',
            text: msg.text,
            data: msg.data,
            sender: 'ai'
          });
        }
      }

      setActiveJob(null);
    } catch (err) {
      console.error('Rating failed:', err);
    }
  }

  return { send, bookWorker, submitRating };
}
```

- [ ] **Step 2: Commit**

```bash
git add pwa/src/hooks/useChat.js
git commit -m "feat: add useChat hook with send, bookWorker, submitRating"
```

---

### Task 8: Wire Everything Together + Verify

**Files:**
- Modify: `pwa/src/pages/MapPage.jsx` (ensure AIButton + ChatSheet work)

- [ ] **Step 1: Verify MapPage has all imports**

Final `pwa/src/pages/MapPage.jsx` should be:

```jsx
// pwa/src/pages/MapPage.jsx
import { useEffect } from 'react';
import MapCanvas from '../components/map/MapCanvas';
import LayerToggle from '../components/map/LayerToggle';
import AIButton from '../components/chat/AIButton';
import useAppStore from '../stores/appStore';
import api from '../services/api';

export default function MapPage() {
  const { setWorkers, setLoading } = useAppStore();

  useEffect(() => {
    async function loadWorkers() {
      setLoading(true);
      try {
        const data = await api.getWorkers({ available: true });
        setWorkers(data.workers || data);
      } catch (err) {
        console.error('Failed to load workers:', err);
      } finally {
        setLoading(false);
      }
    }
    loadWorkers();
  }, []);

  return (
    <div className="absolute inset-0 pb-14">
      <MapCanvas />
      <LayerToggle />
      <AIButton />
    </div>
  );
}
```

- [ ] **Step 2: Verify App.jsx has ChatSheet**

Final `pwa/src/App.jsx` should be:

```jsx
// pwa/src/App.jsx
import { Routes, Route } from 'react-router-dom';
import MapPage from './pages/MapPage';
import PulsePage from './pages/PulsePage';
import ProfilePage from './pages/ProfilePage';
import BottomNav from './components/ui/BottomNav';
import ChatSheet from './components/chat/ChatSheet';

export default function App() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-warm-bg relative">
      <Routes>
        <Route path="/" element={<MapPage />} />
        <Route path="/pulse" element={<PulsePage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
      <ChatSheet />
      <BottomNav />
    </div>
  );
}
```

- [ ] **Step 3: Start dev server and verify**

Run: `cd pwa && npm run dev`

Expected:
- Map renders (or placeholder if no Mapbox token)
- Orange FAB button visible bottom-right with breathing glow
- Tapping FAB opens chat sheet (slides up from bottom, 65% height)
- Chat shows "Wetin you need?" placeholder
- Typing and submitting sends to API (will 404 if backend not running — that's expected)
- Bottom nav visible below everything
- Closing chat brings back FAB

- [ ] **Step 4: Commit final wiring**

```bash
git add pwa/src/pages/MapPage.jsx pwa/src/App.jsx
git commit -m "feat: wire AI chat flow — FAB opens sheet, messages route to cards"
```
