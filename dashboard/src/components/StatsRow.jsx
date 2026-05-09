// dashboard/src/components/StatsRow.jsx
'use client';

import { useEffect, useState } from 'react';

export default function StatsRow({ stats }) {
  const cards = [
    { label: 'Volume Today', value: `₦${formatCurrency(stats?.volume_today || 0)}`, color: 'sabi-green', icon: '💰' },
    { label: 'Jobs Completed', value: String(stats?.jobs_today || 0), color: 'work-orange', icon: '🔨' },
    { label: 'Workers Paid', value: String(stats?.workers_paid || 0), color: 'cash-gold', icon: '👷' },
    { label: 'Traders Active', value: String(stats?.traders_active || 0), color: 'sabi-green', icon: '🏪' },
    { label: 'Avg SabiScore', value: String(stats?.avg_sabi_score || 0), color: 'work-orange', icon: '📊' }
  ];

  return (
    <div className="grid grid-cols-5 gap-3">
      {cards.map((card, i) => (
        <StatCard key={i} {...card} delay={i * 100} />
      ))}
    </div>
  );
}

function StatCard({ label, value, color, icon, delay }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div className={`bg-dash-surface border border-dash-border rounded-xl p-3 transition-all duration-500 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-lg">{icon}</span>
        <span className={`w-2 h-2 rounded-full bg-${color}`} />
      </div>
      <p className="text-xl font-bold text-dash-text font-mono">{value}</p>
      <p className="text-[10px] text-dash-muted mt-0.5">{label}</p>
    </div>
  );
}

function formatCurrency(amount) {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`;
  return String(amount);
}
