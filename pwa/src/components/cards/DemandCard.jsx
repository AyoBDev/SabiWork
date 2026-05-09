// pwa/src/components/cards/DemandCard.jsx
export default function DemandCard({ demand }) {
  return (
    <div className="bg-white rounded-xl border border-work-orange/30 p-3 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-work-orange/10 flex items-center justify-center">
          <span className="text-base">📊</span>
        </div>
        <p className="text-sm font-medium text-warm-text">Demand Insight</p>
      </div>

      <p className="text-xs text-warm-muted leading-relaxed">{demand.insight}</p>

      {demand.stats && (
        <div className="grid grid-cols-3 gap-2 mt-2">
          {demand.stats.map((stat, i) => (
            <div key={i} className="text-center bg-warm-bg rounded-lg p-1.5">
              <p className="text-sm font-bold text-work-orange">{stat.value}</p>
              <p className="text-[9px] text-warm-muted">{stat.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
