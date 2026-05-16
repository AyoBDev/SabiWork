// pwa/src/components/cards/PayoutCard.jsx
export default function PayoutCard({ payout }) {
  return (
    <div className="bg-white rounded-xl border border-sabi-green/30 p-3 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-sabi-green/10 flex items-center justify-center">
          <span className="text-base">✅</span>
        </div>
        <div>
          <p className="text-xs text-sabi-green font-medium">Payout Sent!</p>
          <p className="text-base font-bold text-warm-text">
            ₦{(payout.amount || 0).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="bg-sabi-green/5 rounded-lg p-2.5 text-xs space-y-1">
        <div className="flex justify-between">
          <span className="text-warm-muted">Bank</span>
          <span className="text-warm-text">{payout.bank_name || 'GTBank'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-warm-muted">Account</span>
          <span className="text-warm-text">{payout.account_name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-warm-muted">NIP Ref</span>
          <span className="text-warm-text font-mono text-[10px]">{payout.nip_ref}</span>
        </div>
      </div>

      {payout.trust_update && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px]">
          <span className="text-sabi-green">↑ Sabi Score: {payout.trust_update.new_score.toFixed(2)}</span>
          <span className="text-warm-muted">•</span>
          <span className="text-cash-gold">{payout.trust_update.sabi_score}/100</span>
        </div>
      )}
    </div>
  );
}
