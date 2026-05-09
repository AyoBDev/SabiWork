// dashboard/src/components/DemandPanel.jsx
'use client';

export default function DemandPanel({ gaps }) {
  const gapList = gaps || [
    { trade: 'tiling', area: 'surulere', demand: 47, supply: 0 },
    { trade: 'plumbing', area: 'ajah', demand: 18, supply: 2 },
    { trade: 'electrical', area: 'ikorodu', demand: 12, supply: 1 }
  ];

  return (
    <div className="bg-dash-surface border border-dash-border rounded-xl p-3">
      <h3 className="text-xs font-semibold text-dash-text mb-2">Skills Gaps</h3>
      <div className="space-y-2">
        {gapList.map((gap, idx) => (
          <div key={idx} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${gap.supply === 0 ? 'bg-alert-red' : 'bg-cash-gold'}`} />
              <span className="text-[11px] text-dash-text capitalize">{gap.trade}</span>
              <span className="text-[9px] text-dash-muted capitalize">({gap.area})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-alert-red font-mono">{gap.demand} req</span>
              <span className="text-[9px] text-dash-muted">/</span>
              <span className="text-[10px] text-sabi-green font-mono">{gap.supply} avail</span>
            </div>
          </div>
        ))}
      </div>

      {/* Forecast hint */}
      <div className="mt-3 pt-2 border-t border-dash-border">
        <p className="text-[10px] text-dash-muted">
          <span className="text-alert-red">●</span> Critical: Surulere tiling demand growing 12% week-over-week with zero supply
        </p>
      </div>
    </div>
  );
}
