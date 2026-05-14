// pwa/src/components/wallet/SendSheet.jsx
import { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import BankSelector from './BankSelector';
import { detectBanksFromAccount } from '../../utils/nuban';
import api from '../../services/api';

export default function SendSheet({ open, onClose, type = 'send' }) {
  const [bank, setBank] = useState(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [resolvedName, setResolvedName] = useState('');
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState('');
  const [autoDetected, setAutoDetected] = useState(false);

  // Auto-detect bank when account number reaches 10 digits
  useEffect(() => {
    if (accountNumber.length === 10 && !bank) {
      const candidates = detectBanksFromAccount(accountNumber);
      if (candidates.length === 1) {
        // Single match — auto-select
        setBank(candidates[0]);
        setAutoDetected(true);
      } else if (candidates.length > 1) {
        // Multiple candidates — try to resolve via API
        resolveFromAPI(accountNumber, candidates);
      }
    }
    if (accountNumber.length < 10) {
      setResolvedName('');
      setError('');
      if (autoDetected) {
        setBank(null);
        setAutoDetected(false);
      }
    }
  }, [accountNumber]);

  // Resolve account name when both bank and account number are set
  useEffect(() => {
    if (bank && accountNumber.length === 10) {
      lookupAccountName(bank.code, accountNumber);
    }
  }, [bank, accountNumber]);

  async function resolveFromAPI(accNum, candidates) {
    setResolving(true);
    try {
      const res = await api.resolveAccount(accNum);
      if (res.resolved) {
        const matchedBank = candidates.find(c => c.code === res.resolved.bank_code) || { name: res.resolved.bank_name, code: res.resolved.bank_code };
        setBank(matchedBank);
        setResolvedName(res.resolved.account_name);
        setAutoDetected(true);
      }
    } catch (_) {
      // Couldn't auto-detect, user picks manually
    } finally {
      setResolving(false);
    }
  }

  async function lookupAccountName(bankCode, accNum) {
    setResolving(true);
    setError('');
    try {
      const res = await api.lookupBank(bankCode, accNum);
      setResolvedName(res.account_name);
    } catch (err) {
      setError('Could not verify account');
      setResolvedName('');
    } finally {
      setResolving(false);
    }
  }

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await api.walletTransfer({
        bank_code: bank.code,
        account_number: accountNumber,
        account_name: resolvedName,
        amount: parseInt(amount),
        type
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        setAccountNumber('');
        setAmount('');
        setBank(null);
        setResolvedName('');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Transfer failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  const title = type === 'send' ? 'Send Money' : 'Withdraw';
  const canSubmit = bank && accountNumber.length === 10 && amount && resolvedName && !resolving;

  return (
    <div className="fixed inset-0 z-[100] flex items-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-3xl max-h-[85vh] flex flex-col">
        {/* Handle */}
        <div className="flex items-center justify-center pt-3 pb-1">
          <div className="w-10 h-1.5 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Account number */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Account Number</label>
            <input
              type="tel"
              maxLength={10}
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter 10-digit account number"
              className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-sabi-green focus:ring-1 focus:ring-sabi-green/30"
            />
            {accountNumber.length === 10 && !bank && !resolving && (
              <p className="text-xs text-gray-400 mt-1">Select your bank below</p>
            )}
          </div>

          {/* Bank selector */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">
              Bank
              {autoDetected && <span className="text-sabi-green ml-1">(auto-detected)</span>}
            </label>
            <BankSelector selected={bank} onSelect={(b) => { setBank(b); setAutoDetected(false); }} />
          </div>

          {/* Resolved name */}
          {resolving && (
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-xl">
              <Loader2 className="w-4 h-4 text-sabi-green animate-spin" />
              <span className="text-sm text-gray-500">Verifying account...</span>
            </div>
          )}
          {resolvedName && !resolving && (
            <div className="flex items-center gap-2 px-4 py-3 bg-sabi-green/5 border border-sabi-green/20 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-sabi-green" />
              <span className="text-sm font-medium text-gray-900">{resolvedName}</span>
            </div>
          )}
          {error && !resolving && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-600">{error}</span>
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Amount (₦)</label>
            <input
              type="tel"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
              placeholder="0.00"
              className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-sabi-green focus:ring-1 focus:ring-sabi-green/30 text-lg font-semibold"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="px-5 py-4 border-t border-gray-100" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="w-full py-4 rounded-xl bg-sabi-green text-white font-semibold text-base disabled:opacity-40 active:scale-[0.98] transition-all"
          >
            {success ? '✓ Sent Successfully!' : submitting ? 'Processing...' : type === 'send' ? 'Send Money' : 'Withdraw'}
          </button>
        </div>
      </div>
    </div>
  );
}
