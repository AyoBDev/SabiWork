// pwa/src/components/pulse/WorkerPulse.jsx
import TrustRing from './TrustRing';
import SabiScoreBar from './SabiScoreBar';

export default function WorkerPulse({ user }) {
  const weeklyIncome = Math.round(user.total_income / 12); // approx weekly

  return (
    <div className="space-y-4">
      {/* Income summary */}
      <div className="bg-white rounded-xl border border-warm-border p-4">
        <h3 className="text-sm font-semibold text-warm-text mb-3">This Week</h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-lg font-bold text-sabi-green">₦{(weeklyIncome).toLocaleString()}</p>
            <p className="text-[10px] text-warm-muted">Income</p>
          </div>
          <div>
            <p className="text-lg font-bold text-warm-text">{Math.ceil(user.total_jobs / 12)}</p>
            <p className="text-[10px] text-warm-muted">Jobs</p>
          </div>
          <div>
            <p className="text-lg font-bold text-cash-gold">4.6</p>
            <p className="text-[10px] text-warm-muted">Avg Rating</p>
          </div>
        </div>
      </div>

      {/* Sabi Score Ring */}
      <div className="bg-white rounded-xl border border-warm-border p-4 flex flex-col items-center">
        <h3 className="text-sm font-semibold text-warm-text mb-3">Sabi Score</h3>
        <TrustRing score={user.sabi_score} />
        <p className="text-[10px] text-warm-muted mt-2 text-center">
          Based on {user.total_jobs} completed jobs, payment speed, and ratings
        </p>
      </div>

      {/* SabiScore */}
      <SabiScoreBar score={user.sabi_score} />

      {/* AI Insight */}
      <div className="bg-sabi-green/5 rounded-xl border border-sabi-green/20 p-4">
        <div className="flex items-start gap-2">
          <span className="text-base">💡</span>
          <div>
            <p className="text-xs font-medium text-sabi-green mb-0.5">Insight</p>
            <p className="text-xs text-warm-text leading-relaxed">
              Your reliability is top 20% in {user.service_areas?.[0] || 'your area'}.
              Completing 3 more jobs this week could boost your Sabi Score.
            </p>
          </div>
        </div>
      </div>

      {/* Financial products unlocked */}
      <div className="bg-white rounded-xl border border-warm-border p-4">
        <h3 className="text-sm font-semibold text-warm-text mb-2">Unlocked</h3>
        <div className="space-y-2">
          <UnlockItem unlocked={true} label="Basic Matching" description="Available to all workers" />
          <UnlockItem unlocked={user.sabi_score >= 0.3} label="Priority Matching" description="Sabi Score ≥ 0.30" />
          <UnlockItem unlocked={user.sabi_score >= 0.6} label="Accept Apprentices" description="Sabi Score ≥ 0.60" />
          <UnlockItem unlocked={user.sabi_score >= 30} label="Savings Account" description="SabiScore ≥ 30" />
          <UnlockItem unlocked={user.sabi_score >= 50} label="Microloan" description="SabiScore ≥ 50" />
          <UnlockItem unlocked={user.sabi_score >= 70} label="Full Financial Suite" description="SabiScore ≥ 70" />
        </div>
      </div>
    </div>
  );
}

function UnlockItem({ unlocked, label, description }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${unlocked ? 'bg-sabi-green' : 'bg-warm-border'}`}>
        {unlocked ? (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="3" fill="none"/></svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="#999"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
        )}
      </div>
      <div>
        <p className={`text-xs font-medium ${unlocked ? 'text-warm-text' : 'text-warm-muted'}`}>{label}</p>
        <p className="text-[9px] text-warm-muted">{description}</p>
      </div>
    </div>
  );
}
