// pwa/src/components/pulse/TrustRing.jsx
const TIER_COLORS = {
  emerging: '#4CAF50',
  trusted: '#1B7A3D',
  verified: '#1976D2',
  elite: '#F9A825'
};

function getTier(score) {
  if (score >= 0.8) return { name: 'Elite', color: TIER_COLORS.elite };
  if (score >= 0.6) return { name: 'Verified', color: TIER_COLORS.verified };
  if (score >= 0.3) return { name: 'Trusted', color: TIER_COLORS.trusted };
  return { name: 'Emerging', color: TIER_COLORS.emerging };
}

export default function TrustRing({ score }) {
  const tier = getTier(score);
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - score * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle cx="50" cy="50" r="40" fill="none" stroke="#E8E4DF" strokeWidth="8" />
          {/* Progress circle */}
          <circle
            cx="50" cy="50" r="40" fill="none"
            stroke={tier.color} strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-warm-text">{score.toFixed(2)}</span>
          <span className="text-[9px] text-warm-muted">/ 1.00</span>
        </div>
      </div>
      <span
        className="mt-1.5 text-xs font-semibold px-2 py-0.5 rounded-full text-white"
        style={{ background: tier.color }}
      >
        {tier.name}
      </span>
    </div>
  );
}
