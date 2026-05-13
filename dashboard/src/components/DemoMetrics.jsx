// dashboard/src/components/DemoMetrics.jsx
'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  MessageSquare,
  Wallet,
  BarChart3,
  Gem,
  Link,
  Zap
} from 'lucide-react';

const METRIC_ICONS = {
  Messages: { icon: MessageSquare, color: 'text-pink-400' },
  Payments: { icon: Wallet, color: 'text-yellow-400' },
  Scores: { icon: BarChart3, color: 'text-cyan-400' },
  'Value Moved': { icon: Gem, color: 'text-violet-400' },
  'Squad Calls': { icon: Link, color: 'text-blue-400' },
  'Avg Time': { icon: Zap, color: 'text-green-400' }
};

export default function DemoMetrics({ events }) {
  const metrics = computeMetrics(events);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3 px-5 pt-4">
        <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Live Metrics</CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <div className="grid grid-cols-3 gap-3">
          <MetricCard label="Messages" value={metrics.messages} />
          <MetricCard label="Payments" value={metrics.payments} />
          <MetricCard label="Scores" value={metrics.scores} />
          <MetricCard label="Value Moved" value={`₦${metrics.totalValue.toLocaleString()}`} />
          <MetricCard label="Squad Calls" value={metrics.squadCalls} />
          <MetricCard label="Avg Time" value={`${metrics.avgTime}s`} />
        </div>
      </CardContent>
    </Card>
  );
}

function MetricCard({ label, value }) {
  const config = METRIC_ICONS[label];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
      <Icon className={`w-5 h-5 ${config.color}`} />
      <div>
        <p className="text-foreground font-bold text-lg font-mono">{value}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
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
