import { useState } from 'react';
import useAppStore from '../../stores/appStore';

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
  const setChatOpen = useAppStore((s) => s.setChatOpen);
  const [items] = useState(DEMO_ITEMS);

  const totalItems = items.length;
  const lowStockItems = items.filter(i => getStockStatus(i.stock, i.maxStock).label !== 'Good');
  const lowStockNames = lowStockItems.slice(0, 3).map(i => i.name.split(' (')[0]);

  return (
    <div className="-m-4 -mt-[60px]">
      {/* Green gradient header */}
      <div className="bg-gradient-to-br from-sabi-green to-green-700 px-5 pt-14 pb-5 rounded-b-3xl">
        <div className="flex items-center justify-between mb-4">
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
            onClick={() => setChatOpen(true)}
            className="ml-auto flex items-center gap-1.5 bg-white rounded-xl px-4 py-2.5 shadow-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1B7A3D" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            <span className="text-sm font-semibold text-sabi-green">Log Sale</span>
          </button>
        </div>
      </div>

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
      <div className="mx-4 mt-4 bg-white rounded-xl border border-warm-border p-4 pb-20">
        <h3 className="text-base font-bold text-warm-text mb-4">Sale Items</h3>
        <div className="divide-y divide-warm-border/50">
          {items.map((item) => (
            <SaleItem key={item.id} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SaleItem({ item }) {
  const status = getStockStatus(item.stock, item.maxStock);
  const barPercent = Math.min((item.stock / item.maxStock) * 100, 100);

  return (
    <div className="py-3.5 first:pt-0 last:pb-0">
      <div className="flex items-center gap-3">
        {/* Product image */}
        <div className="w-14 h-14 rounded-xl bg-warm-bg flex items-center justify-center overflow-hidden shrink-0">
          <img
            src={item.img}
            alt={item.name}
            className="w-10 h-10 object-contain"
            onError={(e) => { e.target.style.display = 'none'; e.target.parentNode.innerHTML = '<span class="text-2xl">📦</span>'; }}
          />
        </div>

        {/* Info */}
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

      {/* Stock bar */}
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
