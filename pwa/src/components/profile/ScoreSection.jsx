// pwa/src/components/profile/ScoreSection.jsx
import TrustRing from '../pulse/TrustRing';

export default function ScoreSection({ trustScore, sabiScore }) {
  return (
    <div className="bg-white rounded-xl border border-warm-border p-4">
      <h3 className="text-sm font-semibold text-warm-text mb-3">Your Scores</h3>
      <div className="flex items-center justify-around">
        <TrustRing score={trustScore} />
        <div className="text-center">
          <p className="text-3xl font-bold text-warm-text">{sabiScore}</p>
          <p className="text-[10px] text-warm-muted">SabiScore</p>
          <p className="text-[9px] text-sabi-green mt-0.5">/ 100</p>
        </div>
      </div>
    </div>
  );
}
