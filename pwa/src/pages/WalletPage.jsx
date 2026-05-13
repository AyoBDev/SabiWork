// pwa/src/pages/WalletPage.jsx

const MOCK_TRANSACTIONS = [
  {
    id: 1,
    description: 'Escrow payment to David Emeka',
    detail: 'Tap Repair · May 8, 2026 · 10:30 AM',
    amount: -5000,
    status: 'In Escrow',
    statusColor: 'text-orange-500',
    hasAvatar: true,
    initial: 'D'
  },
  {
    id: 2,
    description: 'Payment released to Tunde Afolabi',
    detail: 'Wall Painting · May 7, 2026 · 9:10 AM',
    amount: 12000,
    status: 'Completed',
    statusColor: 'text-sabi-green',
    hasAvatar: true,
    initial: 'T'
  },
  {
    id: 3,
    description: 'Wallet Top-up',
    detail: 'From GTBank · May 7, 2026 · 2:15 PM',
    amount: 20000,
    status: 'Successful',
    statusColor: 'text-sabi-green',
    hasAvatar: false,
    icon: 'download'
  },
  {
    id: 4,
    description: 'Withdrawal to GTBank',
    detail: 'May 6, 2026 · 11:45 AM',
    amount: -15000,
    status: 'Successful',
    statusColor: 'text-sabi-green',
    hasAvatar: false,
    icon: 'upload'
  },
  {
    id: 5,
    description: 'Payment released to Tunde Afolabi',
    detail: 'Wall Painting · Apr 30, 2024 · 9:10 AM',
    amount: 12000,
    status: 'Completed',
    statusColor: 'text-sabi-green',
    hasAvatar: true,
    initial: 'T'
  }
];

const SPENDING_DATA = [
  { month: 'Nov', height: 30 },
  { month: 'Dec', height: 50 },
  { month: 'Jan', height: 40 },
  { month: 'Feb', height: 45 },
  { month: 'Mar', height: 60 },
  { month: 'Apr', height: 55 },
  { month: 'May', height: 80 }
];

export default function WalletPage() {
  return (
    <div className="h-full pb-16 overflow-y-auto bg-white">
      {/* Header */}
      <div className="px-5 pt-14 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Wallet</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage Payments, escrow and job Transactions</p>
          </div>
          <button className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>
        </div>
      </div>

      {/* Balance card */}
      <div className="mx-5 mt-4 rounded-2xl bg-gradient-to-br from-sabi-green to-sabi-green-dark p-5 relative overflow-hidden">
        {/* Decorative card shape */}
        <div className="absolute top-4 right-4 w-12 h-8 rounded-md bg-gradient-to-br from-green-300/30 to-yellow-400/30 border border-white/20" />
        <div className="absolute top-6 right-6 w-4 h-4 rounded-full bg-red-400/60" />
        <div className="absolute top-6 right-4 w-4 h-4 rounded-full bg-yellow-400/60" />

        <p className="text-white/80 text-xs mb-1">Wallet Balance</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-white text-3xl font-bold">₦ 68,500</span>
            <button className="text-white/60">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
            </button>
          </div>
          <p className="text-white/70 text-xs">Wallet ID: 9090 497 395</p>
        </div>

        <button className="mt-3 px-4 py-1.5 bg-white rounded-full text-sm font-medium text-gray-800 flex items-center gap-1">
          <span>+</span> Add Money
        </button>

        <div className="flex items-center gap-1.5 mt-3">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="white" opacity="0.7"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="white" strokeWidth="2" fill="none" /></svg>
          <p className="text-white/70 text-xs">Your funds are protected with escrow</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-around px-5 py-5">
        {[
          { label: 'Send', icon: 'send' },
          { label: 'Withdraw', icon: 'withdraw' },
          { label: 'Add Money', icon: 'add' },
          { label: 'History', icon: 'history' },
          { label: 'Savings', icon: 'savings' }
        ].map((action) => (
          <button key={action.label} className="flex flex-col items-center gap-1.5">
            <div className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center bg-white">
              <ActionIcon type={action.icon} />
            </div>
            <span className="text-[10px] text-gray-600 font-medium">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Escrow notice */}
      <div className="mx-5 px-4 py-3 bg-sabi-green/5 border border-sabi-green/20 rounded-xl flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-sabi-green/20 flex items-center justify-center shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#7CB342"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#7CB342" strokeWidth="2" fill="none" /></svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">₦5,000 Held in Escrow</p>
          <p className="text-xs text-gray-500">Tap Repair · David Emeka</p>
        </div>
      </div>

      {/* Monthly Spending */}
      <div className="px-5 mt-6">
        <h2 className="text-base font-bold text-gray-900 mb-4">Monthly Spending</h2>
        <div className="flex items-end justify-between h-24 px-2">
          {SPENDING_DATA.map((item, idx) => (
            <div key={item.month} className="flex flex-col items-center gap-1">
              <div
                className={`w-8 rounded-md ${idx === SPENDING_DATA.length - 1 ? 'bg-sabi-green' : 'bg-sabi-green/30'}`}
                style={{ height: `${item.height}px` }}
              />
              <span className="text-[10px] text-gray-400">{item.month}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Savings Pots */}
      <div className="px-5 mt-6">
        <h2 className="text-base font-bold text-gray-900 mb-3">Savings Pots</h2>
        <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sabi-green/10 flex items-center justify-center text-lg">🏠</div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">Home Maintenance</p>
            <p className="text-xs text-gray-500">₦22,000 of ₦80,000</p>
            <div className="w-full h-1.5 bg-gray-200 rounded-full mt-1.5">
              <div className="h-full bg-sabi-green rounded-full" style={{ width: '27.5%' }} />
            </div>
          </div>
          <button className="px-3 py-1.5 bg-sabi-green/10 text-sabi-green text-xs font-semibold rounded-full">Top Up</button>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="px-5 mt-6 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-gray-900">Recent Transactions</h2>
          <button className="text-sm text-sabi-green font-medium">See All</button>
        </div>
        <div className="space-y-4">
          {MOCK_TRANSACTIONS.map((tx) => (
            <TransactionRow key={tx.id} tx={tx} />
          ))}
        </div>
      </div>
    </div>
  );
}

function TransactionRow({ tx }) {
  return (
    <div className="flex items-center gap-3">
      {/* Icon/Avatar */}
      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
        {tx.hasAvatar ? (
          <span className="text-sm font-bold text-gray-500">{tx.initial}</span>
        ) : tx.icon === 'download' ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7CB342" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12l7 7 7-7" /></svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7CB342" strokeWidth="2" strokeLinecap="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{tx.description}</p>
        <p className="text-[11px] text-gray-400 truncate">{tx.detail}</p>
      </div>

      {/* Amount */}
      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-gray-900">
          {tx.amount < 0 ? `-₦ ${Math.abs(tx.amount).toLocaleString()}` : `₦${tx.amount.toLocaleString()}`}
        </p>
        <p className={`text-[11px] font-medium ${tx.statusColor}`}>{tx.status}</p>
      </div>
    </div>
  );
}

function ActionIcon({ type }) {
  switch (type) {
    case 'send':
      return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" /></svg>;
    case 'withdraw':
      return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.8" strokeLinecap="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>;
    case 'add':
      return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" /></svg>;
    case 'history':
      return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>;
    case 'savings':
      return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.8" strokeLinecap="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>;
    default:
      return null;
  }
}
