// pwa/src/components/pulse/SabiScoreBar.jsx
const TIERS = [
  { min: 0, max: 29, label: 'Building', color: '#E8E4DF' },
  { min: 30, max: 49, label: 'Savings', color: '#4CAF50' },
  { min: 50, max: 69, label: 'Microloan', color: '#1976D2' },
  { min: 70, max: 100, label: 'Full Suite', color: '#F9A825' }
];

export default function SabiScoreBar({ score }) {
  const currentTier = TIERS.find((t) => score >= t.min && score <= t.max) || TIERS[0];
  const nextTier = TIERS.find((t) => t.min > score);
  const pointsToNext = nextTier ? nextTier.min - score : 0;

  return (
    <div className="bg-white rounded-xl border border-warm-border p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-warm-text">SabiScore</h3>
        <span className="text-lg font-bold text-warm-text">{score}</span>
      </div>

      {/* Progress bar */}
      <div className="relative h-3 bg-warm-bg rounded-full overflow-hidden mb-2">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000"
          style={{ width: `${score}%`, background: currentTier.color }}
        />
        {/* Tier markers */}
        {[30, 50, 70].map((mark) => (
          <div
            key={mark}
            className="absolute top-0 bottom-0 w-px bg-warm-border"
            style={{ left: `${mark}%` }}
          />
        ))}
      </div>

      {/* Tier labels */}
      <div className="flex justify-between text-[9px] text-warm-muted mb-3">
        {TIERS.map((t) => (
          <span key={t.label} className={score >= t.min ? 'text-warm-text font-medium' : ''}>
            {t.label}
          </span>
        ))}
      </div>

      {/* Next milestone */}
      {nextTier && (
        <p className="text-xs text-warm-muted text-center">
          <span className="text-sabi-green font-medium">{pointsToNext} points</span> to unlock {nextTier.label}
        </p>
      )}
    </div>
  );
}
