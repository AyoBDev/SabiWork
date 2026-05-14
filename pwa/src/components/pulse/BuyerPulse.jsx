import SabiScoreBar from './SabiScoreBar';

export default function BuyerPulse({ user }) {
  // Calculate points to next tier
  const TIERS = [
    { min: 0, max: 29, label: 'Building' },
    { min: 30, max: 49, label: 'Savings' },
    { min: 50, max: 69, label: 'Microloan' },
    { min: 70, max: 100, label: 'Full Suite' }
  ];

  const currentScore = user.sabi_score || 0;
  const currentTier = TIERS.find((t) => currentScore >= t.min && currentScore <= t.max) || TIERS[0];
  const nextTier = TIERS.find((t) => t.min > currentScore);
  const pointsToNext = nextTier ? nextTier.min - currentScore : 0;

  // Calculate booking diversity (unique service categories)
  const serviceDiversity = user.service_categories_booked?.length || 0;

  return (
    <div className="space-y-4">
      {/* SabiScore with additional context */}
      <SabiScoreBar score={currentScore} />

      {/* Booking summary */}
      <div className="bg-white rounded-xl border border-warm-border p-4">
        <h3 className="text-sm font-semibold text-warm-text mb-3">Your Activity</h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-lg font-bold text-sabi-green">{user.total_bookings || 0}</p>
            <p className="text-[10px] text-warm-muted">Bookings</p>
          </div>
          <div>
            <p className="text-lg font-bold text-warm-text">
              ₦{((user.total_spent || 0) / 100).toLocaleString()}
            </p>
            <p className="text-[10px] text-warm-muted">Spent</p>
          </div>
          <div>
            <p className="text-lg font-bold text-work-orange">{serviceDiversity}</p>
            <p className="text-[10px] text-warm-muted">Services Tried</p>
          </div>
        </div>
      </div>

      {/* How to improve tips */}
      <div className="bg-white rounded-xl border border-warm-border p-4">
        <h3 className="text-sm font-semibold text-warm-text mb-2">How to Improve</h3>
        <div className="space-y-2.5">
          <TipItem
            icon="📅"
            text="Book services regularly"
            description="Consistent activity builds your score"
          />
          <TipItem
            icon="⭐"
            text="Rate every completed job"
            description="Ratings help improve your score"
          />
          <TipItem
            icon="🎯"
            text="Try different service categories"
            description="Diversity shows you're an active user"
          />
          <TipItem
            icon="🤝"
            text="Refer friends to SabiWork"
            description="Get bonus points for referrals"
          />
        </div>
      </div>

      {/* Progress insight */}
      <div className="bg-sabi-green/5 rounded-xl border border-sabi-green/20 p-4">
        <div className="flex items-start gap-2">
          <span className="text-base">💡</span>
          <div>
            <p className="text-xs font-medium text-sabi-green mb-0.5">Your Progress</p>
            <p className="text-xs text-warm-text leading-relaxed">
              {nextTier ? (
                <>
                  You're in the <span className="font-semibold">{currentTier.label}</span> tier.
                  Just <span className="font-semibold text-sabi-green">{pointsToNext} more points</span> to
                  unlock <span className="font-semibold">{nextTier.label}</span> benefits!
                </>
              ) : (
                <>
                  You've reached the <span className="font-semibold">Full Suite</span> tier!
                  You have access to all SabiWork financial products.
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Benefits unlocked */}
      <div className="bg-white rounded-xl border border-warm-border p-4">
        <h3 className="text-sm font-semibold text-warm-text mb-2">Benefits</h3>
        <div className="space-y-2">
          <BenefitItem unlocked={true} label="Basic Matching" description="Available to all buyers" />
          <BenefitItem unlocked={currentScore >= 30} label="Priority Support" description="SabiScore ≥ 30" />
          <BenefitItem unlocked={currentScore >= 30} label="Savings Account" description="SabiScore ≥ 30" />
          <BenefitItem unlocked={currentScore >= 50} label="Microloan Access" description="SabiScore ≥ 50" />
          <BenefitItem unlocked={currentScore >= 50} label="Investment Opportunities" description="SabiScore ≥ 50" />
          <BenefitItem unlocked={currentScore >= 70} label="Full Financial Suite" description="SabiScore ≥ 70" />
        </div>
      </div>
    </div>
  );
}

function TipItem({ icon, text, description }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-base shrink-0">{icon}</span>
      <div>
        <p className="text-xs font-medium text-warm-text">{text}</p>
        <p className="text-[10px] text-warm-muted">{description}</p>
      </div>
    </div>
  );
}

function BenefitItem({ unlocked, label, description }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`w-5 h-5 rounded-full flex items-center justify-center ${
          unlocked ? 'bg-sabi-green' : 'bg-warm-border'
        }`}
      >
        {unlocked ? (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
            <path
              d="M20 6L9 17l-5-5"
              stroke="white"
              strokeWidth="3"
              fill="none"
            />
          </svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="#999">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
        )}
      </div>
      <div>
        <p
          className={`text-xs font-medium ${
            unlocked ? 'text-warm-text' : 'text-warm-muted'
          }`}
        >
          {label}
        </p>
        <p className="text-[9px] text-warm-muted">{description}</p>
      </div>
    </div>
  );
}
