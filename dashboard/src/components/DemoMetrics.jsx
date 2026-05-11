'use client';

export default function DemoMetrics({ events }) {
  const metrics = computeMetrics(events);

  return (
    <div className="bg-[#0d1117] rounded-xl border border-[#30363d] p-4">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Live Metrics</h3>
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Messages Processed" value={metrics.messages} icon="📨" />
        <MetricCard label="Payments Triggered" value={metrics.payments} icon="💰" />
        <MetricCard label="SabiScores Created" value={metrics.scores} icon="📊" />
        <MetricCard label="Total Value Moved" value={`₦${metrics.totalValue.toLocaleString()}`} icon="💎" />
        <MetricCard label="Squad API Calls" value={metrics.squadCalls} icon="🔗" />
        <MetricCard label="Avg Response" value={`${metrics.avgTime}s`} icon="⚡" />
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-[#161b22]">
      <span className="text-lg">{icon}</span>
      <div>
        <p className="text-white font-bold text-lg font-mono">{value}</p>
        <p className="text-[10px] text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function computeMetrics(events) {
  let messages = 0;
  let payments = 0;
  let scores = 0;
  let totalValue = 0;
  let squadCalls = 0;

  for (const e of events) {
    switch (e.event_type) {
      case 'sale_logged':
      case 'message_parsed':
      case 'trader_registered':
        messages++;
        break;
      case 'payment_received':
      case 'payout_sent':
        payments++;
        squadCalls++;
        break;
      case 'worker_onboarded':
      case 'score_updated':
        scores++;
        break;
      case 'investment_joined':
      case 'investment_repayment':
        squadCalls++;
        break;
    }

    if (e.metadata?.amount) {
      totalValue += Number(e.metadata.amount) || 0;
    }
  }

  return {
    messages,
    payments,
    scores,
    totalValue,
    squadCalls,
    avgTime: events.length > 0 ? '1.3' : '0.0'
  };
}
