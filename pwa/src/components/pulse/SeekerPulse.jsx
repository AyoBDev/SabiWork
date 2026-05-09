// pwa/src/components/pulse/SeekerPulse.jsx
export default function SeekerPulse({ user }) {
  return (
    <div className="space-y-4">
      {/* Demand near you */}
      <div className="bg-white rounded-xl border border-warm-border p-4">
        <h3 className="text-sm font-semibold text-warm-text mb-2">Demand Near You</h3>
        <p className="text-xs text-warm-muted mb-3">Trades people are searching for in {user.area}</p>
        <div className="space-y-2">
          <DemandItem trade="Tiling" count={47} gap={true} />
          <DemandItem trade="Plumbing" count={23} gap={false} />
          <DemandItem trade="Electrical" count={18} gap={false} />
        </div>
      </div>

      {/* Apprenticeship opportunity */}
      <div className="bg-sabi-green/5 rounded-xl border border-sabi-green/20 p-4">
        <h3 className="text-sm font-semibold text-sabi-green mb-2">Opportunity</h3>
        <p className="text-xs text-warm-text leading-relaxed mb-3">
          There are <span className="font-bold">47 tiling requests</span> in Surulere with
          <span className="font-bold text-alert-red"> zero tilers</span> available.
          Learn tiling and you could be earning ₦15k-50k per job within 8 weeks.
        </p>
        <button className="w-full h-9 bg-sabi-green text-white text-sm font-medium rounded-lg">
          View Apprenticeships
        </button>
      </div>

      {/* Your interests */}
      <div className="bg-white rounded-xl border border-warm-border p-4">
        <h3 className="text-sm font-semibold text-warm-text mb-2">Your Interests</h3>
        <div className="flex flex-wrap gap-2">
          {(user.interests || []).map((interest) => (
            <span
              key={interest}
              className="px-2.5 py-1 text-xs bg-work-orange/10 text-work-orange rounded-full capitalize"
            >
              {interest.replace('_', ' ')}
            </span>
          ))}
        </div>
      </div>

      {/* Motivational */}
      <div className="bg-work-orange/5 rounded-xl border border-work-orange/20 p-4">
        <div className="flex items-start gap-2">
          <span className="text-base">🚀</span>
          <div>
            <p className="text-xs font-medium text-work-orange mb-0.5">Your Path</p>
            <p className="text-xs text-warm-text leading-relaxed">
              5 apprenticeship spots are available in your area.
              Top apprentices earn ₦5,000/week while learning and graduate with guaranteed first jobs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DemandItem({ trade, count, gap }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-xs capitalize text-warm-text font-medium">{trade}</span>
        {gap && (
          <span className="text-[9px] px-1.5 py-0.5 bg-alert-red/10 text-alert-red rounded-full font-medium">
            GAP
          </span>
        )}
      </div>
      <span className="text-xs text-warm-muted">{count} requests</span>
    </div>
  );
}
