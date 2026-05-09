// pwa/src/components/agent/AgentStats.jsx
export default function AgentStats() {
  // Demo stats
  const stats = {
    today: 3,
    total: 8,
    area: 'surulere',
    topTrade: 'plumbing'
  };

  return (
    <div className="h-full pb-14 overflow-y-auto">
      <div className="sticky top-0 bg-warm-bg/95 backdrop-blur-sm z-10 px-4 pt-4 pb-2 border-b border-warm-border">
        <h1 className="text-lg font-bold text-warm-text">Agent Stats</h1>
        <p className="text-xs text-warm-muted">Your onboarding performance</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl border border-warm-border p-4 text-center">
            <p className="text-2xl font-bold text-sabi-green">{stats.today}</p>
            <p className="text-xs text-warm-muted">Today</p>
          </div>
          <div className="bg-white rounded-xl border border-warm-border p-4 text-center">
            <p className="text-2xl font-bold text-warm-text">{stats.total}</p>
            <p className="text-xs text-warm-muted">Total</p>
          </div>
        </div>

        {/* Area info */}
        <div className="bg-white rounded-xl border border-warm-border p-4">
          <h3 className="text-sm font-semibold text-warm-text mb-2">Your Area</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-warm-muted">Assigned</span>
              <span className="text-warm-text capitalize">{stats.area}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-warm-muted">Top demand</span>
              <span className="text-warm-text capitalize">{stats.topTrade}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-warm-muted">Workers needed</span>
              <span className="text-work-orange font-medium">12 more</span>
            </div>
          </div>
        </div>

        {/* Priority zones */}
        <div className="bg-work-orange/5 rounded-xl border border-work-orange/20 p-4">
          <h3 className="text-sm font-semibold text-work-orange mb-2">Priority Zones</h3>
          <p className="text-xs text-warm-text leading-relaxed">
            Surulere market area has <strong>47 unmet tiling requests</strong>.
            Focus onboarding tilers near Adeniran Ogunsanya Street.
          </p>
        </div>
      </div>
    </div>
  );
}
