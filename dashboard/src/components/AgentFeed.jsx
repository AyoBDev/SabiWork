// dashboard/src/components/AgentFeed.jsx
'use client';

import { useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Store,
  Wallet,
  Banknote,
  HardHat,
  Bot,
  CheckCircle2,
  TrendingUp,
  Handshake,
  Gem,
  BarChart3,
  ShieldCheck,
  MessageSquare,
  Star,
  Zap,
  Truck,
  CircleDollarSign,
  BadgeCheck,
  LayoutDashboard
} from 'lucide-react';

const STATUS_ICONS = {
  sale_logged: { icon: Store, color: 'text-orange-400' },
  payment_received: { icon: Wallet, color: 'text-yellow-400' },
  payout_sent: { icon: Banknote, color: 'text-green-400' },
  worker_onboarded: { icon: HardHat, color: 'text-blue-400' },
  job_matched: { icon: Bot, color: 'text-purple-400' },
  job_completed: { icon: CheckCircle2, color: 'text-green-400' },
  investment_round_created: { icon: TrendingUp, color: 'text-cyan-400' },
  investment_joined: { icon: Handshake, color: 'text-pink-400' },
  investment_repayment: { icon: Gem, color: 'text-violet-400' },
  score_updated: { icon: BarChart3, color: 'text-cyan-400' },
  agent_verified: { icon: ShieldCheck, color: 'text-emerald-400' },
  message_parsed: { icon: MessageSquare, color: 'text-pink-400' },
  trader_registered: { icon: Store, color: 'text-orange-400' },
  rating_received: { icon: Star, color: 'text-yellow-400' },
  supplier_matched: { icon: Truck, color: 'text-orange-400' },
  investment_round_opened: { icon: TrendingUp, color: 'text-cyan-400' },
  investment_received: { icon: CircleDollarSign, color: 'text-green-400' },
  verification_granted: { icon: BadgeCheck, color: 'text-emerald-400' },
  platform_summary: { icon: LayoutDashboard, color: 'text-blue-400' },
  default: { icon: Zap, color: 'text-green-400' }
};

export default function AgentFeed({ events }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  return (
    <Card className="h-full flex flex-col border-border/50">
      <CardHeader className="pb-2 px-4 pt-3 flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="SabiWork" className="w-5 h-5 rounded" />
          <CardTitle className="text-sm">SabiWork Agent</CardTitle>
        </div>
        <Badge variant="outline" className="text-green-400 border-green-400/30 bg-green-400/10 font-mono text-[10px]">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse mr-1.5 inline-block" />
          ACTIVE
        </Badge>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-4 pb-4">
          <div className="space-y-3 text-sm pt-2">
            {events.length === 0 && (
              <p className="text-muted-foreground text-center mt-8 text-xs">Waiting for activity...</p>
            )}
            {events.map((event, idx) => (
              <AgentEvent key={idx} event={event} />
            ))}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function AgentEvent({ event }) {
  const config = STATUS_ICONS[event.event_type] || STATUS_ICONS.default;
  const Icon = config.icon;
  const time = event.timestamp
    ? new Date(event.timestamp).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : 'now';

  return (
    <div className="flex items-start gap-3 animate-slide-in">
      <div className={`shrink-0 mt-0.5 ${config.color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-foreground text-sm leading-relaxed">
          {event.description || event.event_type}
        </p>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <span className="text-[11px] text-muted-foreground font-mono">{time}</span>
          {event.actor && event.actor !== 'system' && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
              @{event.actor}
            </Badge>
          )}
          {event.metadata?.amount && (
            <span className="text-[11px] text-yellow-400 font-mono">
              ₦{Number(event.metadata.amount).toLocaleString()}
            </span>
          )}
          <span className="text-[10px] text-green-400/70 font-mono">
            {(0.8 + Math.random() * 1.3).toFixed(1)}s
          </span>
          {event.metadata?.channel && (
            <span className="text-[10px] text-muted-foreground font-mono uppercase">
              {event.metadata.channel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
