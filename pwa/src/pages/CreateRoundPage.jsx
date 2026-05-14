// pwa/src/pages/CreateRoundPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, CheckCircle2, AlertCircle, TrendingUp } from 'lucide-react';
import useAppStore from '../stores/appStore';
import api from '../services/api';

export default function CreateRoundPage() {
  const navigate = useNavigate();
  const { user } = useAppStore();
  const [targetAmount, setTargetAmount] = useState('');
  const [interestRate, setInterestRate] = useState('10');
  const [repaymentSplit, setRepaymentSplit] = useState('20');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/invest/rounds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: user?.phone,
          name: user?.name,
          target_amount: parseInt(targetAmount) * 100, // Convert to kobo
          interest_rate: parseFloat(interestRate) / 100,
          repayment_split: parseFloat(repaymentSplit) / 100
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create round');

      setSuccess(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="h-full pb-16 overflow-y-auto bg-white">
        <div className="px-5 pt-14 pb-4">
          <button onClick={() => navigate('/wallet')} className="text-sm text-sabi-green font-medium">← Back to Wallet</button>
        </div>
        <div className="flex flex-col items-center justify-center px-6 pt-12">
          <div className="w-16 h-16 rounded-full bg-sabi-green/10 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-sabi-green" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Round Created!</h2>
          <p className="text-sm text-gray-500 text-center mb-6">
            Your investment round is now {success.visibility === 'public' ? 'publicly visible' : 'private'}. Share it with investors to start raising funds.
          </p>
          <div className="w-full bg-gray-50 rounded-2xl p-4 space-y-3 mb-6">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Target</span>
              <span className="text-sm font-semibold">₦{(success.target_amount / 100).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Interest Rate</span>
              <span className="text-sm font-semibold">{(success.interest_rate * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Repayment Split</span>
              <span className="text-sm font-semibold">{(success.repayment_split * 100).toFixed(0)}% of sales</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Reference</span>
              <span className="text-sm font-mono font-semibold">{success.reference_prefix}</span>
            </div>
          </div>
          <button
            onClick={() => navigate(`/invest/${success.round_id}`)}
            className="w-full py-4 rounded-xl bg-sabi-green text-white font-semibold"
          >
            View Round
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full pb-16 overflow-y-auto bg-white">
      {/* Header */}
      <div className="px-5 pt-14 pb-4">
        <button onClick={() => navigate(-1)} className="text-sm text-sabi-green font-medium flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-xl font-bold text-gray-900 mt-3">Create Investment Round</h1>
        <p className="text-sm text-gray-500 mt-1">Raise capital from the community to grow your business</p>
      </div>

      {/* Info card */}
      <div className="mx-5 mb-6 p-4 bg-sabi-green/5 border border-sabi-green/20 rounded-2xl">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-sabi-green/20 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-sabi-green" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">How it works</p>
            <p className="text-xs text-gray-500 mt-1">
              Investors fund your round. You repay automatically from a percentage of your sales.
              Your SabiScore must be 30+ and target amount cannot exceed 50% of your total logged revenue.
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="px-5 space-y-5">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">Target Amount (₦)</label>
          <input
            type="number"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            placeholder="e.g. 50000"
            className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-base outline-none focus:border-sabi-green focus:ring-1 focus:ring-sabi-green/30"
            required
            min="1000"
          />
          <p className="text-xs text-gray-400 mt-1">Minimum ₦1,000</p>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">Interest Rate (%)</label>
          <input
            type="number"
            value={interestRate}
            onChange={(e) => setInterestRate(e.target.value)}
            placeholder="10"
            className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-base outline-none focus:border-sabi-green focus:ring-1 focus:ring-sabi-green/30"
            required
            min="1"
            max="30"
          />
          <p className="text-xs text-gray-400 mt-1">Return rate for investors (1-30%)</p>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">Repayment Split (% of sales)</label>
          <input
            type="number"
            value={repaymentSplit}
            onChange={(e) => setRepaymentSplit(e.target.value)}
            placeholder="20"
            className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-base outline-none focus:border-sabi-green focus:ring-1 focus:ring-sabi-green/30"
            required
            min="5"
            max="50"
          />
          <p className="text-xs text-gray-400 mt-1">Percentage of each sale that goes to repayment (5-50%)</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span className="text-sm text-red-600">{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !targetAmount}
          className="w-full py-4 rounded-xl bg-sabi-green text-white font-semibold text-base disabled:opacity-40 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
          {loading ? 'Creating...' : 'Create Round'}
        </button>
      </form>
    </div>
  );
}
