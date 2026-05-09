// dashboard/src/components/InclusionMetrics.jsx
'use client';

export default function InclusionMetrics({ data }) {
  const metrics = data || {
    total_workers: 20,
    with_virtual_account: 20,
    with_payment_history: 18,
    sabi_score_eligible: 8,
    loan_eligible: 3,
    total_income_generated: 7500000,
    avg_monthly_income: 120000
  };

  return (
    <div className="bg-dash-surface border border-dash-border rounded-xl p-3">
      <h3 className="text-xs font-semibold text-dash-text mb-3">Financial Inclusion</h3>

      <div className="space-y-2">
        <MetricRow
          label="Financial Identities"
          value={`${metrics.with_virtual_account}/${metrics.total_workers}`}
          percentage={(metrics.with_virtual_account / metrics.total_workers) * 100}
          color="sabi-green"
        />
        <MetricRow
          label="Payment History"
          value={`${metrics.with_payment_history}/${metrics.total_workers}`}
          percentage={(metrics.with_payment_history / metrics.total_workers) * 100}
          color="cash-gold"
        />
        <MetricRow
          label="Credit Eligible"
          value={`${metrics.sabi_score_eligible}/${metrics.total_workers}`}
          percentage={(metrics.sabi_score_eligible / metrics.total_workers) * 100}
          color="work-orange"
        />
        <MetricRow
          label="Loan Qualified"
          value={`${metrics.loan_eligible}/${metrics.total_workers}`}
          percentage={(metrics.loan_eligible / metrics.total_workers) * 100}
          color="alert-red"
        />
      </div>

      <div className="mt-3 pt-2 border-t border-dash-border grid grid-cols-2 gap-2">
        <div className="text-center">
          <p className="text-sm font-bold text-cash-gold font-mono">
            ₦{(metrics.total_income_generated / 1000000).toFixed(1)}M
          </p>
          <p className="text-[9px] text-dash-muted">Total Generated</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-sabi-green font-mono">
            ₦{(metrics.avg_monthly_income / 1000).toFixed(0)}K
          </p>
          <p className="text-[9px] text-dash-muted">Avg Monthly/Worker</p>
        </div>
      </div>
    </div>
  );
}

function MetricRow({ label, value, percentage, color }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[10px] text-dash-muted">{label}</span>
        <span className="text-[10px] text-dash-text font-mono">{value}</span>
      </div>
      <div className="h-1.5 bg-dash-bg rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full bg-${color} transition-all duration-1000`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
