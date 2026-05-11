import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const BANKS = [
  { code: '090267', name: 'Kuda' },
  { code: '100004', name: 'OPay' },
  { code: '100033', name: 'PalmPay' },
  { code: '058', name: 'GTBank' },
  { code: '044', name: 'Access' },
  { code: '011', name: 'First Bank' },
  { code: '033', name: 'UBA' },
  { code: '057', name: 'Zenith' },
  { code: '035', name: 'Wema' },
  { code: '090551', name: 'FairMoney' },
];

export default function InvestPage() {
  const { roundId } = useParams();
  const [round, setRound] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [phone, setPhone] = useState('');
  const [bank, setBank] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [amount, setAmount] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [paymentInstructions, setPaymentInstructions] = useState(null);

  useEffect(() => {
    fetchRound();
  }, [roundId]);

  const fetchRound = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/invest/rounds/${roundId}`);
      if (!response.ok) throw new Error('Failed to fetch round');
      const data = await response.json();
      setRound(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAccountNumberBlur = async () => {
    if (accountNumber.length !== 10 || !bank) return;

    try {
      setLookupLoading(true);
      setAccountName('');
      const response = await fetch('/api/workers/lookup-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountNumber, bankCode: bank }),
      });

      if (!response.ok) throw new Error('Account lookup failed');
      const data = await response.json();
      setAccountName(data.accountName || '');
    } catch (err) {
      setError('Could not verify account');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSubmitLoading(true);
      setError(null);

      const response = await fetch(`/api/invest/rounds/${roundId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          bankCode: bank,
          accountNumber,
          amount: parseInt(amount) * 100, // Convert to kobo
        }),
      });

      if (!response.ok) throw new Error('Failed to join round');
      const data = await response.json();
      setPaymentInstructions(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center">
        <div className="text-green-600">Loading...</div>
      </div>
    );
  }

  if (error && !round) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border p-6 max-w-md w-full">
          <div className="text-red-600 text-center">{error}</div>
        </div>
      </div>
    );
  }

  if (paymentInstructions) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border p-6 max-w-md w-full">
          <h2 className="text-2xl font-bold text-green-600 mb-4">Payment Instructions</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-600">Transfer to:</label>
              <p className="text-lg font-semibold">{paymentInstructions.virtualAccountNumber}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Amount:</label>
              <p className="text-lg font-semibold">₦{(paymentInstructions.amount / 100).toLocaleString()}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Reference (include in narration):</label>
              <p className="text-lg font-semibold font-mono">{paymentInstructions.reference}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-xl mt-6">
              <p className="text-sm text-green-800">
                Make sure to include the reference code in your transfer narration.
                Your investment will be confirmed once payment is received.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const progressPercent = round ? (round.raisedAmount / round.targetAmount) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white p-4 pb-20">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Round Details Card */}
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">{round?.traderName}</h1>
          <p className="text-gray-600 mb-4">{round?.businessType}</p>

          <div className="flex items-center gap-2 mb-6">
            <span className="text-sm text-gray-600">SabiScore:</span>
            <span className="text-lg font-bold text-green-600">{round?.sabiScore}</span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Raised</span>
                <span className="font-semibold">
                  ₦{((round?.raisedAmount || 0) / 100).toLocaleString()} /
                  ₦{((round?.targetAmount || 0) / 100).toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-600 h-3 rounded-full transition-all"
                  style={{ width: `${Math.min(progressPercent, 100)}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600">Interest Rate</label>
                <p className="text-lg font-semibold">{round?.interestRate}%</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Repayment Split</label>
                <p className="text-lg font-semibold">{round?.repaymentSplit}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Join Form Card */}
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Join This Round</h2>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-600"
                placeholder="08012345678"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bank
              </label>
              <select
                value={bank}
                onChange={(e) => {
                  setBank(e.target.value);
                  setAccountName('');
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-600"
                required
              >
                <option value="">Select Bank</option>
                {BANKS.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Number
              </label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setAccountNumber(value);
                  setAccountName('');
                }}
                onBlur={handleAccountNumberBlur}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-600"
                placeholder="0123456789"
                maxLength={10}
                required
              />
              {lookupLoading && (
                <p className="text-sm text-gray-500 mt-1">Verifying account...</p>
              )}
              {accountName && (
                <p className="text-sm text-green-600 mt-1">{accountName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (₦)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-600"
                placeholder="10000"
                min="1"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitLoading || !accountName}
              className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {submitLoading ? 'Processing...' : 'Join Round'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
