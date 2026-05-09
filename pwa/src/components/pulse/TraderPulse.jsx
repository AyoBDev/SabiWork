// pwa/src/components/pulse/TraderPulse.jsx
import SabiScoreBar from './SabiScoreBar';

export default function TraderPulse({ user }) {
  const weeklyRevenue = Math.round(user.total_logged_revenue / 12);
  const weeklySales = Math.round(user.total_logged_sales / 12);

  return (
    <div className="space-y-4">
      {/* Revenue summary */}
      <div className="bg-white rounded-xl border border-warm-border p-4">
        <h3 className="text-sm font-semibold text-warm-text mb-3">This Week</h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-lg font-bold text-sabi-green">₦{weeklyRevenue.toLocaleString()}</p>
            <p className="text-[10px] text-warm-muted">Revenue</p>
          </div>
          <div>
            <p className="text-lg font-bold text-warm-text">{weeklySales}</p>
            <p className="text-[10px] text-warm-muted">Sales</p>
          </div>
          <div>
            <p className="text-lg font-bold text-work-orange capitalize">{user.business_type?.replace('_', ' ')}</p>
            <p className="text-[10px] text-warm-muted">Category</p>
          </div>
        </div>
      </div>

      {/* Top selling items (simulated) */}
      <div className="bg-white rounded-xl border border-warm-border p-4">
        <h3 className="text-sm font-semibold text-warm-text mb-2">Top Items</h3>
        <div className="space-y-2">
          <TopItem name="Rice (50kg)" count={34} revenue={850000} />
          <TopItem name="Garri (paint)" count={28} revenue={140000} />
          <TopItem name="Palm Oil" count={22} revenue={220000} />
        </div>
      </div>

      {/* SabiScore */}
      <SabiScoreBar score={user.sabi_score} />

      {/* Loan progress */}
      <div className="bg-cash-gold/5 rounded-xl border border-cash-gold/20 p-4">
        <div className="flex items-start gap-2">
          <span className="text-base">🎯</span>
          <div>
            <p className="text-xs font-medium text-cash-gold mb-0.5">Loan Progress</p>
            <p className="text-xs text-warm-text leading-relaxed">
              {user.sabi_score < 50
                ? `${50 - user.sabi_score} points to microloan eligibility. Keep logging sales consistently!`
                : 'You qualify for a microloan! Visit your nearest partner MFI.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TopItem({ name, count, revenue }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-medium text-warm-text">{name}</p>
        <p className="text-[10px] text-warm-muted">{count} sales</p>
      </div>
      <p className="text-xs font-semibold text-warm-text">₦{revenue.toLocaleString()}</p>
    </div>
  );
}
