import { useState, useEffect } from 'react';
import useAppStore from '../../stores/appStore';
import api from '../../services/api';

const DEMO_ITEMS = [
  { id: 1, name: 'Tomatoes (basket)', price: 1200, unit: 'basket', stock: 8, maxStock: 50, demand: 'Selling fast', img: '/items/tomatoes.png' },
  { id: 2, name: 'Rice (50kg bag)', price: 7500, unit: 'bag', stock: 12, maxStock: 30, demand: 'Steady demand', img: '/items/rice.png' },
  { id: 3, name: 'Onions (bowl)', price: 1200, unit: 'bowl', stock: 38, maxStock: 50, demand: null, img: '/items/onions.png' },
  { id: 4, name: 'Pepper (Tatashe)', price: 800, unit: 'kg', stock: 8, maxStock: 50, demand: null, img: '/items/pepper.png' },
  { id: 5, name: 'Fish (Argentina)', price: 1500, unit: 'kg', stock: 5, maxStock: 40, demand: null, img: '/items/fish.png' },
];

function getStockStatus(stock, maxStock) {
  const ratio = stock / maxStock;
  if (ratio <= 0.1) return { label: 'Out', color: 'text-red-500', bg: 'bg-red-50', bar: 'bg-red-500' };
  if (ratio <= 0.25) return { label: 'Low', color: 'text-red-500', bg: 'bg-red-50', bar: 'bg-red-500' };
  return { label: 'Good', color: 'text-sabi-green', bg: 'bg-green-50', bar: 'bg-sabi-green' };
}

export default function TraderPulse({ user }) {
  const salesLog = useAppStore((s) => s.salesLog);
  const addSale = useAppStore((s) => s.addSale);
  const agentAction = useAppStore((s) => s.agentAction);
  const [items] = useState(DEMO_ITEMS);
  const [showLogSale, setShowLogSale] = useState(false);
  const [agentFill, setAgentFill] = useState(null);

  // Agent automation: open sale sheet, fill fields, submit
  useEffect(() => {
    if (!agentAction) {
      setAgentFill(null);
      return;
    }
    if (agentAction.type === 'open_log_sale') {
      setShowLogSale(true);
    } else if (agentAction.type === 'fill_sale') {
      setShowLogSale(true);
      setAgentFill(agentAction.data);
    } else if (agentAction.type === 'submit_sale') {
      setShowLogSale(false);
      setAgentFill(null);
    }
  }, [agentAction]);

  const totalItems = items.length;
  const lowStockItems = items.filter(i => getStockStatus(i.stock, i.maxStock).label !== 'Good');
  const lowStockNames = lowStockItems.slice(0, 3).map(i => i.name.split(' (')[0]);

  async function handleManualLogSale(itemName, quantity, amount) {
    setShowLogSale(false);

    const phone = user?.phone || useAppStore.getState().user?.phone;
    const message = `sold ${quantity} ${itemName} for ${amount}`;

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/traders/log-sale`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, message })
      });

      if (res.ok) {
        const data = await res.json();
        addSale({
          ...data.sale,
          today_total: data.trader_stats?.today_total,
          today_count: data.trader_stats?.today_count,
          sabi_score_after: data.trader_stats?.sabi_score_after,
          logged_at: new Date().toISOString()
        });
      } else {
        addSale({
          item_name: itemName,
          quantity: parseInt(quantity),
          amount: parseInt(amount),
          logged_at: new Date().toISOString()
        });
      }
    } catch {
      addSale({
        item_name: itemName,
        quantity: parseInt(quantity),
        amount: parseInt(amount),
        logged_at: new Date().toISOString()
      });
    }
  }

  return (
    <div>
      {/* Green gradient header */}
      <div className="bg-gradient-to-br from-sabi-green to-green-700 px-5 pt-16 pb-6 rounded-b-3xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-white">Hello, {user?.name?.split(' ')[0] || 'Trader'}</h1>
            <p className="text-sm text-white/80">Track your stock levels and restock alerts</p>
          </div>
          <div className="relative">
            <div className="w-14 h-14 rounded-full bg-white/20 overflow-hidden border-2 border-white/40">
              <div className="w-full h-full bg-gradient-to-br from-orange-300 to-orange-500 flex items-center justify-center text-white text-lg font-bold">
                {(user?.name || 'T')[0]}
              </div>
            </div>
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-sabi-green rounded-full border-2 border-white" />
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2">
            <span className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM7.16 6.26l-.87-1.63A1 1 0 005.4 4H3v2h1.6l3.6 7.59-1.35 2.44A2 2 0 009 18.7h10v-2H9l1.1-2h6.23a2 2 0 001.76-1.05l3.58-6.49A1 1 0 0020.8 6H6.21z"/></svg>
            </span>
            <div>
              <p className="text-base font-bold text-white leading-tight">{totalItems}</p>
              <p className="text-[10px] text-white/70">Items</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2">
            <span className="w-7 h-7 rounded-lg bg-yellow-500/30 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#FBBF24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
            </span>
            <div>
              <p className="text-base font-bold text-white leading-tight">{lowStockItems.length}</p>
              <p className="text-[10px] text-white/70">Low Stock</p>
            </div>
          </div>

          <button
            onClick={() => setShowLogSale(true)}
            className="ml-auto flex items-center gap-1.5 bg-white rounded-xl px-4 py-2.5 shadow-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1B7A3D" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            <span className="text-sm font-semibold text-sabi-green">Log Sale</span>
          </button>
        </div>
      </div>

      {/* Recent sales logged (from AI or manual) */}
      {salesLog.length > 0 && (
        <div className="mx-4 mt-4 bg-white rounded-xl border border-sabi-green/20 p-4">
          <h3 className="text-sm font-semibold text-warm-text mb-3 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1B7A3D" strokeWidth="2" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
            Recent Sales
          </h3>
          <div className="space-y-2">
            {salesLog.slice(0, 5).map((sale, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-warm-border/30 last:border-0">
                <div>
                  <p className="text-xs font-medium text-warm-text">
                    {sale.quantity}x {sale.item_name}
                  </p>
                  <p className="text-[10px] text-warm-muted">
                    {new Date(sale.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <p className="text-sm font-semibold text-sabi-green">₦{Number(sale.amount).toLocaleString()}</p>
              </div>
            ))}
          </div>
          {salesLog[0]?.today_total != null && (
            <div className="mt-3 pt-3 border-t border-warm-border/50 flex items-center justify-between">
              <span className="text-xs text-warm-muted">Today's total</span>
              <span className="text-sm font-bold text-warm-text">₦{Number(salesLog[0].today_total).toLocaleString()}</span>
            </div>
          )}
        </div>
      )}

      {/* Restocking alert */}
      {lowStockItems.length > 0 && (
        <div className="mx-4 mt-4 bg-white rounded-xl border border-warm-border p-4 flex items-start gap-3">
          <span className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#F59E0B"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
          </span>
          <div>
            <p className="text-sm font-bold text-warm-text">{lowStockItems.length} items need restocking</p>
            <p className="text-xs text-warm-muted mt-0.5">
              {lowStockNames.join(', ')}{lowStockItems.length > 3 ? `, and ${lowStockItems.length - 3} more` : ''} will run out today based on your selling rate.
            </p>
          </div>
        </div>
      )}

      {/* Sale Items */}
      <div className="mx-4 mt-4 bg-white rounded-xl border border-warm-border p-4 pb-6">
        <h3 className="text-base font-bold text-warm-text mb-4">Sale Items</h3>
        <div className="divide-y divide-warm-border/50">
          {items.map((item) => (
            <SaleItem key={item.id} item={item} />
          ))}
        </div>
      </div>

      {/* Log Sale Sheet */}
      <LogSaleSheet open={showLogSale} onClose={() => setShowLogSale(false)} items={items} onSubmit={handleManualLogSale} agentFill={agentFill} />
    </div>
  );
}

function SaleItem({ item }) {
  const status = getStockStatus(item.stock, item.maxStock);
  const barPercent = Math.min((item.stock / item.maxStock) * 100, 100);

  return (
    <div className="py-3.5 first:pt-0 last:pb-0">
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-xl bg-warm-bg flex items-center justify-center overflow-hidden shrink-0">
          <img
            src={item.img}
            alt={item.name}
            className="w-10 h-10 object-contain"
            onError={(e) => { e.target.style.display = 'none'; e.target.parentNode.innerHTML = '<span class="text-2xl">📦</span>'; }}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <p className="text-sm font-semibold text-warm-text">{item.name}</p>
            <p className="text-xs font-medium text-warm-text ml-2 shrink-0">{item.stock} Left</p>
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <p className="text-xs text-warm-muted">
              ₦{item.price.toLocaleString()}/{item.unit}
              {item.demand && <span> · {item.demand}</span>}
            </p>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
              {status.label}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-2 ml-[68px]">
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${status.bar}`}
            style={{ width: `${barPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function LogSaleSheet({ open, onClose, items, onSubmit, agentFill }) {
  const [item, setItem] = useState('');
  const [quantity, setQuantity] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [agentTyping, setAgentTyping] = useState(null);

  // Agent auto-fill: react to progressive data from the hook
  useEffect(() => {
    if (!agentFill) {
      setAgentTyping(null);
      return;
    }
    if (agentFill.item_name && !agentFill.quantity) {
      setAgentTyping('item');
      setItem(agentFill.item_name);
    } else if (agentFill.quantity && !agentFill.amount) {
      setAgentTyping('quantity');
      setItem(agentFill.item_name || item);
      setQuantity(String(agentFill.quantity));
    } else if (agentFill.amount) {
      setAgentTyping('amount');
      setItem(agentFill.item_name || item);
      setQuantity(String(agentFill.quantity || quantity));
      setAmount(String(agentFill.amount));
    }
  }, [agentFill]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!item || !quantity || !amount) return;
    setLoading(true);
    await onSubmit(item, quantity, amount);
    setLoading(false);
    setItem('');
    setQuantity('');
    setAmount('');
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      <div
        className={`fixed inset-x-0 bottom-0 z-[201] bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 rounded-full bg-gray-200" />
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-b border-warm-border/60">
          <h2 className="text-lg font-bold text-warm-text">Log a Sale</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-warm-bg hover:bg-warm-border transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-warm-muted mb-1.5 block">Item</label>
            <select
              value={item}
              onChange={(e) => setItem(e.target.value)}
              className={`w-full h-12 px-4 rounded-xl border bg-warm-bg text-sm text-warm-text focus:outline-none focus:ring-2 focus:ring-sabi-green/30 focus:border-sabi-green transition-all ${agentTyping === 'item' ? 'border-sabi-green ring-2 ring-sabi-green/40' : 'border-warm-border'}`}
            >
              <option value="">Select an item</option>
              {items.map((i) => (
                <option key={i.id} value={i.name}>{i.name}</option>
              ))}
              <option value="other">Other (new item)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-warm-muted mb-1.5 block">Quantity sold</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 3"
              className={`w-full h-12 px-4 rounded-xl border bg-warm-bg text-sm text-warm-text focus:outline-none focus:ring-2 focus:ring-sabi-green/30 focus:border-sabi-green transition-all ${agentTyping === 'quantity' ? 'border-sabi-green ring-2 ring-sabi-green/40' : 'border-warm-border'}`}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-warm-muted mb-1.5 block">Total amount (₦)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 75000"
              className={`w-full h-12 px-4 rounded-xl border bg-warm-bg text-sm text-warm-text focus:outline-none focus:ring-2 focus:ring-sabi-green/30 focus:border-sabi-green transition-all ${agentTyping === 'amount' ? 'border-sabi-green ring-2 ring-sabi-green/40' : 'border-warm-border'}`}
            />
          </div>

          <button
            type="submit"
            disabled={!item || !quantity || !amount || loading}
            className="w-full h-12 rounded-xl bg-sabi-green text-white font-semibold text-sm disabled:opacity-40 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Log Sale'
            )}
          </button>
        </form>
      </div>
    </>
  );
}
