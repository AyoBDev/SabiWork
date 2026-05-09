// pwa/src/components/cards/TrackingCard.jsx
const STATUS_LABELS = {
  paid: 'Payment Confirmed',
  in_progress: 'Job In Progress',
  completed: 'Job Completed',
  payout_sent: 'Payout Sent'
};

const STATUS_COLORS = {
  paid: 'bg-cash-gold',
  in_progress: 'bg-sabi-green',
  completed: 'bg-sabi-green',
  payout_sent: 'bg-sabi-green'
};

export default function TrackingCard({ job }) {
  const status = job.status || 'paid';

  return (
    <div className="bg-white rounded-xl border border-warm-border p-3 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[status]} animate-pulse`} />
        <span className="text-xs font-medium text-warm-text">{STATUS_LABELS[status]}</span>
      </div>

      <div className="bg-warm-bg rounded-lg p-2.5 text-xs space-y-1">
        <div className="flex justify-between">
          <span className="text-warm-muted">Worker</span>
          <span className="text-warm-text font-medium">{job.worker_name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-warm-muted">Service</span>
          <span className="text-warm-text capitalize">{job.service_category}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-warm-muted">Amount</span>
          <span className="text-warm-text font-medium">₦{(job.agreed_amount || 0).toLocaleString()}</span>
        </div>
      </div>

      {status === 'in_progress' && (
        <p className="text-[10px] text-sabi-green mt-2 text-center">
          Worker is on the way • You'll be notified when done
        </p>
      )}
    </div>
  );
}
