'use client';

import { useEffect, useRef } from 'react';

const STATUS_ICONS = {
  sale_logged: '🏪',
  payment_received: '💰',
  payout_sent: '💸',
  worker_onboarded: '👷',
  job_matched: '🤖',
  job_completed: '✅',
  investment_round_created: '📈',
  investment_joined: '🤝',
  investment_repayment: '💎',
  score_updated: '📊',
  agent_verified: '🛡️',
  message_parsed: '📨',
  trader_registered: '🏪',
  rating_received: '⭐',
  default: '⚡'
};

export default function AgentFeed({ events }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  return (
    <div className="h-full flex flex-col bg-[#0d1117] rounded-xl border border-[#30363d] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363d]">
        <div className="flex items-center gap-2">
          <span className="text-lg">🧠</span>
          <span className="text-sm font-bold text-white">SabiWork Agent</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-green-400 font-mono">ACTIVE</span>
        </div>
      </div>

      {/* Event Log */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-sm">
        {events.length === 0 && (
          <p className="text-gray-500 text-center mt-8">Waiting for activity...</p>
        )}
        {events.map((event, idx) => (
          <AgentEvent key={idx} event={event} />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function AgentEvent({ event }) {
  const icon = STATUS_ICONS[event.event_type] || STATUS_ICONS.default;
  const time = event.timestamp
    ? new Date(event.timestamp).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : 'now';

  return (
    <div className="flex items-start gap-3 animate-fade-in">
      <span className="text-base shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1">
        <p className="text-white text-sm leading-relaxed">
          {event.description || event.event_type}
        </p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-gray-500">{time}</span>
          {event.actor && event.actor !== 'system' && (
            <span className="text-xs text-blue-400">@{event.actor}</span>
          )}
          {event.metadata?.amount && (
            <span className="text-xs text-yellow-400">
              ₦{Number(event.metadata.amount).toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
