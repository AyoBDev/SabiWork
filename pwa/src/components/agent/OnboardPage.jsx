// pwa/src/components/agent/OnboardPage.jsx
import { useState } from 'react';
import { User, CreditCard, CheckCircle2, Loader2, ChevronDown } from 'lucide-react';
import { useGeolocation } from '../../hooks/useGeolocation';
import { detectBanksFromAccount } from '../../utils/nuban';
import { BANKS } from '../wallet/BankSelector';
import api from '../../services/api';

const TRADES = [
  'plumbing', 'electrical', 'carpentry', 'cleaning', 'tailoring',
  'hairdressing', 'painting', 'catering', 'welding', 'tiling'
];

const AREAS = [
  'surulere', 'yaba', 'ikeja', 'lekki', 'victoria_island',
  'mushin', 'maryland', 'ojota', 'ikorodu', 'ajah'
];

export default function OnboardPage() {
  const { location, loading: gpsLoading, capture } = useGeolocation();
  // 'phone' or 'bank' — which identity method user chooses
  const [identityMethod, setIdentityMethod] = useState(null);

  const [form, setForm] = useState({
    name: '', phone: '', primary_trade: '', service_areas: [],
    bank_code: '', account_number: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupResult, setLookupResult] = useState(null);
  const [bankSelectorOpen, setBankSelectorOpen] = useState(false);
  const [bankSearch, setBankSearch] = useState('');

  const updateField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const toggleArea = (area) => {
    setForm((f) => ({
      ...f,
      service_areas: f.service_areas.includes(area)
        ? f.service_areas.filter((a) => a !== area)
        : [...f.service_areas, area]
    }));
  };

  // Auto-detect bank from account number using NUBAN
  const handleAccountNumberChange = (value) => {
    const digits = value.replace(/\D/g, '');
    updateField('account_number', digits);
    setLookupResult(null);

    if (digits.length === 10 && !form.bank_code) {
      const candidates = detectBanksFromAccount(digits);
      if (candidates.length === 1) {
        updateField('bank_code', candidates[0].code);
        // Auto-trigger lookup
        handleLookupWithBank(candidates[0].code, digits);
      }
    }
  };

  const handleLookup = () => handleLookupWithBank(form.bank_code, form.account_number);

  const handleLookupWithBank = async (bankCode, accountNumber) => {
    if (!bankCode || !accountNumber || accountNumber.length !== 10) return;
    setLookingUp(true);
    setLookupResult(null);
    try {
      const response = await api.lookupBank(bankCode, accountNumber);
      if (response.account_name) {
        setLookupResult({ success: true, account_name: response.account_name });
        updateField('name', response.account_name);
      } else {
        setLookupResult({ error: 'Could not resolve account name' });
      }
    } catch (err) {
      setLookupResult({ error: err.message || 'Lookup failed' });
    } finally {
      setLookingUp(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let coords = location;
      if (!coords) {
        coords = await capture();
      }

      const payload = {
        ...form,
        location_lat: coords?.lat,
        location_lng: coords?.lng,
        onboarding_channel: 'field_agent',
        gps_verified: !!(coords?.lat && coords?.lng)
      };

      const response = await fetch('/api/workers/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();

      if (!response.ok) throw new Error(result.error || 'Registration failed');

      setSuccess(result);
      setForm({ name: '', phone: '', primary_trade: '', service_areas: [], bank_code: '', account_number: '' });
      setLookupResult(null);
      setIdentityMethod(null);
    } catch (err) {
      alert('Registration failed: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Success screen
  if (success) {
    return (
      <div className="h-full pb-14 overflow-y-auto p-4">
        <div className="bg-sabi-green/5 rounded-xl border border-sabi-green/20 p-6 text-center mt-8">
          <CheckCircle2 className="w-12 h-12 text-sabi-green mx-auto mb-3" />
          <h2 className="text-lg font-bold text-sabi-green">Worker Registered!</h2>
          <p className="text-sm text-gray-700 mt-1">{success.name}</p>
          {success.bank_verified && (
            <p className="text-xs text-gray-500 mt-1">Bank verified as identity</p>
          )}
          {success.virtual_account_number && (
            <p className="text-xs text-gray-500 mt-2">
              VA: <span className="font-mono text-sabi-green">{success.virtual_account_number}</span>
            </p>
          )}
          <button
            onClick={() => setSuccess(null)}
            className="mt-4 px-6 py-2 bg-sabi-green text-white rounded-lg text-sm font-medium"
          >
            Register Another
          </button>
        </div>
      </div>
    );
  }

  // Identity method selection screen
  if (!identityMethod) {
    return (
      <div className="h-full pb-14 overflow-y-auto">
        <div className="sticky top-0 bg-white z-10 px-5 pt-14 pb-3 border-b border-gray-100">
          <h1 className="text-xl font-bold text-gray-900">Onboard Worker</h1>
          <p className="text-sm text-gray-500 mt-0.5">Choose how to identify the worker</p>
        </div>

        <div className="p-5 space-y-4 mt-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Verification Method</p>

          {/* Bank Account Option */}
          <button
            onClick={() => setIdentityMethod('bank')}
            className="w-full p-5 bg-sabi-green/5 border-2 border-sabi-green/30 rounded-2xl text-left flex items-start gap-4 active:scale-[0.98] transition-transform"
          >
            <div className="w-12 h-12 rounded-xl bg-sabi-green/20 flex items-center justify-center shrink-0">
              <CreditCard className="w-6 h-6 text-sabi-green" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Bank Account</h3>
              <p className="text-sm text-gray-500 mt-0.5">Use account number as identity. Auto-fills name from BVN.</p>
              <span className="inline-block mt-2 px-2.5 py-0.5 bg-sabi-green/10 text-sabi-green text-xs font-semibold rounded-full">Recommended</span>
            </div>
          </button>

          {/* Phone Number Option */}
          <button
            onClick={() => setIdentityMethod('phone')}
            className="w-full p-5 bg-gray-50 border-2 border-gray-200 rounded-2xl text-left flex items-start gap-4 active:scale-[0.98] transition-transform"
          >
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
              <User className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Phone Number</h3>
              <p className="text-sm text-gray-500 mt-0.5">Manual entry with phone number. Name typed manually.</p>
            </div>
          </button>
        </div>
      </div>
    );
  }

  const selectedBank = BANKS.find(b => b.code === form.bank_code);
  const filteredBanks = BANKS.filter(b => b.name.toLowerCase().includes(bankSearch.toLowerCase()));

  return (
    <div className="h-full pb-14 overflow-y-auto">
      <div className="sticky top-0 bg-white z-10 px-5 pt-14 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <button onClick={() => setIdentityMethod(null)} className="text-sm text-sabi-green font-medium">← Back</button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              {identityMethod === 'bank' ? 'Bank Account Onboarding' : 'Phone Onboarding'}
            </h1>
            <p className="text-xs text-gray-500">
              {identityMethod === 'bank' ? 'Account number serves as worker identity' : 'Phone number serves as worker identity'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-5">
        {/* GPS status */}
        <div className="flex items-center gap-2 text-xs px-3 py-2.5 bg-gray-50 rounded-xl">
          <div className={`w-2.5 h-2.5 rounded-full ${location ? 'bg-sabi-green' : 'bg-orange-400 animate-pulse'}`} />
          <span className="text-gray-500 flex-1">
            {location
              ? `GPS: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)} (±${Math.round(location.accuracy)}m)`
              : gpsLoading ? 'Acquiring GPS...' : 'GPS will capture on submit'}
          </span>
          {!location && (
            <button type="button" onClick={capture} className="text-sabi-green font-medium text-xs">
              Capture
            </button>
          )}
        </div>

        {/* Bank Identity Flow */}
        {identityMethod === 'bank' && (
          <div className="space-y-4">
            {/* Bank Selector */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Bank</label>
              <button
                type="button"
                onClick={() => setBankSelectorOpen(true)}
                className="w-full flex items-center justify-between px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-left"
              >
                <span className={`text-sm ${selectedBank ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                  {selectedBank ? selectedBank.name : 'Select Bank'}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Account Number */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Account Number</label>
              <input
                type="tel"
                maxLength={10}
                value={form.account_number}
                onChange={(e) => handleAccountNumberChange(e.target.value)}
                placeholder="Enter 10-digit account number"
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-sabi-green focus:ring-1 focus:ring-sabi-green/30"
              />
            </div>

            {/* Verify Button */}
            {form.bank_code && form.account_number.length === 10 && !lookupResult?.success && (
              <button
                type="button"
                onClick={handleLookup}
                disabled={lookingUp}
                className="w-full py-3 bg-sabi-green/10 text-sabi-green text-sm font-semibold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {lookingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {lookingUp ? 'Verifying...' : 'Verify & Get Name'}
              </button>
            )}

            {/* Lookup Result */}
            {lookingUp && !lookupResult && (
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-xl">
                <Loader2 className="w-4 h-4 text-sabi-green animate-spin" />
                <span className="text-sm text-gray-500">Resolving account name...</span>
              </div>
            )}
            {lookupResult?.success && (
              <div className="flex items-center gap-2 px-4 py-3 bg-sabi-green/5 border border-sabi-green/20 rounded-xl">
                <CheckCircle2 className="w-4 h-4 text-sabi-green" />
                <span className="text-sm font-medium text-gray-900">{lookupResult.account_name}</span>
              </div>
            )}
            {lookupResult?.error && (
              <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
                <span className="text-sm text-red-600">{lookupResult.error}</span>
              </div>
            )}
          </div>
        )}

        {/* Phone Identity Flow */}
        {identityMethod === 'phone' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Phone Number</label>
              <input
                type="tel"
                required
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-sabi-green focus:ring-1 focus:ring-sabi-green/30"
                placeholder="08012345678"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Full Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-sabi-green focus:ring-1 focus:ring-sabi-green/30"
                placeholder="Enter full name"
              />
            </div>
          </div>
        )}

        {/* Phone (optional for bank flow) */}
        {identityMethod === 'bank' && (
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Phone Number (optional)</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-sabi-green focus:ring-1 focus:ring-sabi-green/30"
              placeholder="08012345678"
            />
          </div>
        )}

        {/* Primary Trade */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-2 block">Primary Trade</label>
          <div className="grid grid-cols-2 gap-2">
            {TRADES.map((trade) => (
              <button
                key={trade}
                type="button"
                onClick={() => updateField('primary_trade', trade)}
                className={`h-10 rounded-xl text-xs font-medium capitalize transition-colors ${
                  form.primary_trade === trade
                    ? 'bg-sabi-green text-white'
                    : 'bg-gray-50 text-gray-700 border border-gray-200'
                }`}
              >
                {trade}
              </button>
            ))}
          </div>
        </div>

        {/* Service Areas */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-2 block">Service Areas</label>
          <div className="flex flex-wrap gap-2">
            {AREAS.map((area) => (
              <button
                key={area}
                type="button"
                onClick={() => toggleArea(area)}
                className={`px-3 py-2 rounded-full text-xs capitalize transition-colors ${
                  form.service_areas.includes(area)
                    ? 'bg-sabi-green text-white'
                    : 'bg-gray-50 text-gray-700 border border-gray-200'
                }`}
              >
                {area.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || !form.primary_trade || (identityMethod === 'phone' ? (!form.name || !form.phone) : (!form.account_number || !lookupResult?.success))}
          className="w-full py-4 bg-sabi-green text-white text-sm font-semibold rounded-xl disabled:opacity-40 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : null}
          {submitting ? 'Registering...' : 'Register Worker'}
        </button>
      </form>

      {/* Bank Selector Bottom Sheet */}
      {bankSelectorOpen && (
        <div className="fixed inset-0 z-[100] flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setBankSelectorOpen(false)} />
          <div className="relative w-full bg-white rounded-t-3xl max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-center pt-3 pb-1">
              <div className="w-10 h-1.5 rounded-full bg-gray-200" />
            </div>
            <div className="px-5 py-3 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Select Bank</h3>
            </div>
            <div className="px-5 py-3">
              <input
                type="text"
                placeholder="Search bank..."
                value={bankSearch}
                onChange={(e) => setBankSearch(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-sabi-green"
                autoFocus
              />
            </div>
            <div className="flex-1 overflow-y-auto px-5 pb-8">
              {filteredBanks.map((bank) => (
                <button
                  key={bank.code}
                  type="button"
                  onClick={() => { updateField('bank_code', bank.code); setBankSelectorOpen(false); setBankSearch(''); }}
                  className="w-full flex items-center justify-between py-3.5 border-b border-gray-50 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                      <span className="text-xs font-bold text-gray-500">{bank.name.slice(0, 2).toUpperCase()}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-800">{bank.name}</span>
                  </div>
                  {form.bank_code === bank.code && (
                    <CheckCircle2 className="w-5 h-5 text-sabi-green" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
