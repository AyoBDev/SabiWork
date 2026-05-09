// dashboard/src/components/LiveFeed.jsx
'use client';

const EVENT_CONFIG = {
  payment_received: { icon: '💰', color: 'cash-gold', label: 'Payment' },
  payout_sent: { icon: '✅', color: 'sabi-green', label: 'Payout' },
  sale_logged: { icon: '🏪', color: 'work-orange', label: 'Sale' },
  worker_onboarded: { icon: '👷', color: 'sabi-green', label: 'Onboarded' },
  apprenticeship_started: { icon: '📚', color: 'work-orange', label: 'Apprentice' },
  unmatched_demand: { icon: '❓', color: 'alert-red', label: 'Unmatched' }
};

export default function LiveFeed({ events }) {
  return (
    <div className="bg-dash-surface border border-dash-border rounded-xl p-3 h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-dash-text">Live Feed</h3>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-sabi-green animate-pulse" />
          <span className="text-[10px] text-dash-muted">Live</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5">
        {events.length === 0 && (
          <p className="text-xs text-dash-muted text-center mt-4">Waiting for events...</p>
        )}
        {events.map((event, idx) => {
          const config = EVENT_CONFIG[event.event_type] || EVENT_CONFIG.payment_received;
          return (
            <div
              key={idx}
              className="flex items-start gap-2 p-2 rounded-lg bg-dash-bg/50 animate-slide-in"
            >
              <span className="text-sm shrink-0">{config.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-dash-text truncate">
                  {event.description || formatEvent(event)}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[9px] text-${config.color}`}>{config.label}</span>
                  <span className="text-[9px] text-dash-muted">{formatTime(event.timestamp)}</span>
                  {event.amount && (
                    <span className="text-[9px] text-cash-gold font-mono">
                      ₦{Number(event.amount).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatEvent(event) {
  switch (event.event_type) {
    case 'payment_received':
      return `${event.worker_name || 'Worker'} received payment for ${event.service || 'job'}`;
    case 'payout_sent':
      return `₦${Number(event.amount).toLocaleString()} sent to ${event.worker_name || 'worker'}`;
    case 'sale_logged':
      return `${event.trader_name || 'Trader'} logged sale: ${event.item || 'item'}`;
    case 'worker_onboarded':
      return `${event.worker_name || 'New worker'} joined via ${event.channel || 'whatsapp'}`;
    default:
      return event.description || 'Event received';
  }
}

function formatTime(ts) {
  if (!ts) return 'now';
  const d = new Date(ts);
  return d.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
}
