// pwa/src/components/profile/BankSection.jsx
export default function BankSection({ user }) {
  return (
    <div className="bg-white rounded-xl border border-warm-border p-4">
      <h3 className="text-sm font-semibold text-warm-text mb-3">Bank Details</h3>
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-warm-muted">Account Name</span>
          <span className="text-warm-text font-medium">{user.account_name || '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-warm-muted">Account Number</span>
          <span className="text-warm-text font-mono">{user.account_number || '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-warm-muted">Bank</span>
          <span className="text-warm-text">{user.bank_code || '—'}</span>
        </div>
        {user.virtual_account_number && (
          <>
            <div className="border-t border-warm-border my-2" />
            <div className="flex justify-between">
              <span className="text-warm-muted">Virtual Account</span>
              <span className="text-sabi-green font-mono font-medium">{user.virtual_account_number}</span>
            </div>
            <p className="text-[10px] text-warm-muted">
              Any payment to this account is auto-logged and improves your SabiScore
            </p>
          </>
        )}
      </div>
    </div>
  );
}
