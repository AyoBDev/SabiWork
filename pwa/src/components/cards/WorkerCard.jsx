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
