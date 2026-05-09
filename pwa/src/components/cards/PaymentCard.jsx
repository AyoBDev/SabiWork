// pwa/src/components/cards/PaymentCard.jsx
export default function PaymentCard({ payment }) {
  const handlePay = () => {
    // Open Squad checkout URL
    if (payment.checkout_url) {
      window.open(payment.checkout_url, '_blank');
    }
  };

  return (
    <div className="bg-white rounded-xl border border-warm-border p-3 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-cash-gold/20 flex items-center justify-center">
          <span className="text-base">💳</span>
        </div>
        <div>
          <p className="text-xs text-warm-muted">Payment Required</p>
          <p className="text-base font-bold text-warm-text">
            ₦{(payment.amount || 0).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="text-xs text-warm-muted mb-3 space-y-0.5">
        <p>Service: <span className="text-warm-text capitalize">{payment.service_category}</span></p>
        <p>Worker: <span className="text-warm-text">{payment.worker_name}</span></p>
        <p className="text-[10px]">Ref: {payment.transaction_ref}</p>
      </div>

      <button
        onClick={handlePay}
        className="w-full h-10 bg-cash-gold text-warm-text text-sm font-semibold rounded-lg active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
      >
        <span>Pay with Squad</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      </button>

      <p className="text-[10px] text-warm-muted text-center mt-1.5">
        Secured by Squad · Card, Transfer, or USSD
      </p>
    </div>
  );
}
