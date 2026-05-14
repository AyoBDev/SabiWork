// pwa/src/pages/AuthPage.jsx
import { useState, useEffect } from 'react';
import { User, CreditCard, ChevronDown, Loader2, CheckCircle2, AlertCircle, Wrench, Search } from 'lucide-react';
import { BANKS } from '../components/wallet/BankSelector';
import { detectBanksFromAccount } from '../utils/nuban';
import api from '../services/api';
import useAppStore from '../stores/appStore';

const TRADES = [
  'plumbing', 'electrical', 'carpentry', 'cleaning', 'tailoring',
  'hairdressing', 'painting', 'catering', 'welding', 'tiling'
];

const AREAS = [
  'surulere', 'yaba', 'ikeja', 'lekki', 'victoria_island',
  'mushin', 'maryland', 'ojota', 'ikorodu', 'ajah'
];

export default function AuthPage() {
  const setUser = useAppStore((s) => s.setUser);
  const [step, setStep] = useState('choose'); // choose, phone_login, bank_login, user_type, onboard
  const [identityMethod, setIdentityMethod] = useState(null); // 'phone' or 'bank'
  const [userType, setUserType] = useState(null); // 'worker' or 'buyer'

  // Login state
  const [phone, setPhone] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [autoDetected, setAutoDetected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resolvedName, setResolvedName] = useState('');
  const [resolving, setResolving] = useState(false);

  // Onboarding state
  const [onboardForm, setOnboardForm] = useState({
    name: '', phone: '', primary_trade: '', service_areas: [],
    bank_code: '', account_number: '', area: ''
  });
  const [bankSelectorOpen, setBankSelectorOpen] = useState(false);
  const [bankSearch, setBankSearch] = useState('');

  // Auto-detect bank when account number reaches 10 digits
  useEffect(() => {
    if (accountNumber.length === 10 && !bankCode) {
      const candidates = detectBanksFromAccount(accountNumber);
      if (candidates.length === 1) {
        setBankCode(candidates[0].code);
        setAutoDetected(true);
      } else if (candidates.length > 1) {
        // Try resolving via API
        resolveFromAPI(accountNumber, candidates);
      }
    }
    if (accountNumber.length < 10) {
      setResolvedName('');
      setError('');
      if (autoDetected) {
        setBankCode('');
        setAutoDetected(false);
      }
    }
  }, [accountNumber]);

  // Auto-verify account when both bank and account number are set
  useEffect(() => {
    if (bankCode && accountNumber.length === 10 && !resolvedName && !resolving) {
      verifyAccount(bankCode, accountNumber);
    }
  }, [bankCode, accountNumber]);

  async function resolveFromAPI(accNum, candidates) {
    setResolving(true);
    try {
      const res = await api.resolveAccount(accNum);
      if (res.resolved) {
        const matched = candidates.find(c => c.code === res.resolved.bank_code) || { name: res.resolved.bank_name, code: res.resolved.bank_code };
        setBankCode(matched.code);
        setResolvedName(res.resolved.account_name);
        setAutoDetected(true);
      }
    } catch (_) {}
    finally { setResolving(false); }
  }

  async function verifyAccount(code, accNum) {
    setResolving(true);
    setError('');
    try {
      const res = await api.lookupBank(code, accNum);
      if (res.account_name) {
        setResolvedName(res.account_name);
      } else {
        setError('Could not verify account');
      }
    } catch (err) {
      setError('Could not verify account');
    } finally {
      setResolving(false);
    }
  }

  // Login with phone
  async function handlePhoneLogin() {
    if (!phone || phone.length < 10) {
      setError('Enter a valid phone number');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.getProfile(phone);
      if (res && res.id) {
        completeLogin(res);
      } else {
        setOnboardForm((f) => ({ ...f, phone }));
        setIdentityMethod('phone');
        setStep('user_type');
      }
    } catch (err) {
      // 404 = not found, go to user type selection
      setOnboardForm((f) => ({ ...f, phone }));
      setIdentityMethod('phone');
      setStep('user_type');
    } finally {
      setLoading(false);
    }
  }

  // Login with bank account
  async function handleBankLogin() {
    if (!bankCode || accountNumber.length !== 10) {
      setError('Select bank and enter 10-digit account number');
      return;
    }
    if (!resolvedName) {
      setError('Account not yet verified');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // Try to find existing worker by account number
      const workers = await api.getWorkers({ account_number: accountNumber });
      const worker = Array.isArray(workers) ? workers.find(w => w.account_number === accountNumber) : null;
      if (worker) {
        completeLogin(worker);
        return;
      }
    } catch (_) {}

    // Not registered — go to user type selection
    setOnboardForm((f) => ({
      ...f,
      name: resolvedName,
      bank_code: bankCode,
      account_number: accountNumber
    }));
    setIdentityMethod('bank');
    setStep('user_type');
    setLoading(false);
  }

  // Complete login and save session
  function completeLogin(userData) {
    const session = {
      id: userData.id,
      name: userData.name,
      phone: userData.phone,
      primary_trade: userData.primary_trade,
      service_areas: userData.service_areas,
      trust_score: userData.trust_score,
      sabi_score: userData.sabi_score,
      account_number: userData.account_number,
      bank_code: userData.bank_code,
      role: userData.role || (userData.primary_trade ? 'worker' : 'buyer'),
      area: userData.area || userData.service_areas?.[0]
    };
    localStorage.setItem('sabiwork_user', JSON.stringify(session));
    setUser(session);
  }

  // Handle user type selection
  function handleUserTypeSelect(type) {
    setUserType(type);
    if (type === 'buyer' || type === 'trader' || type === 'seeker') {
      // These roles don't need trade/area selection — register immediately
      handleLightweightOnboard(type);
    } else {
      setStep('onboard');
    }
  }

  // Quick onboard for non-worker roles (no trade selection needed)
  async function handleLightweightOnboard(role) {
    setLoading(true);
    setError('');
    try {
      let coords = null;
      try {
        coords = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => resolve(null),
            { timeout: 5000 }
          );
        });
      } catch (_) {}

      // Lightweight session for buyers, traders, and seekers
      const session = {
        id: `${role}_${Date.now()}`,
        name: onboardForm.name || 'User',
        phone: onboardForm.phone || null,
        account_number: onboardForm.account_number || null,
        bank_code: onboardForm.bank_code || null,
        role,
        area: coords ? 'lagos' : 'surulere',
        trust_score: 0,
        sabi_score: 0
      };
      localStorage.setItem('sabiwork_user', JSON.stringify(session));
      setUser(session);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  // Handle worker onboarding submission
  async function handleWorkerOnboard(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      let coords = null;
      try {
        coords = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => resolve(null),
            { timeout: 5000 }
          );
        });
      } catch (_) {}

      const payload = {
        ...onboardForm,
        location_lat: coords?.lat,
        location_lng: coords?.lng,
        onboarding_channel: 'pwa',
        gps_verified: !!coords
      };

      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/workers/onboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();

      if (!res.ok) throw new Error(result.error || 'Registration failed');

      completeLogin({
        id: result.worker_id,
        name: result.name || onboardForm.name,
        phone: onboardForm.phone,
        primary_trade: onboardForm.primary_trade,
        service_areas: onboardForm.service_areas,
        trust_score: result.trust_score || 0,
        sabi_score: 0,
        account_number: onboardForm.account_number,
        bank_code: onboardForm.bank_code,
        role: 'worker'
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleAccountInput(value) {
    const digits = value.replace(/\D/g, '');
    setAccountNumber(digits);
    setError('');
    setResolvedName('');
  }

  const selectedBank = BANKS.find(b => b.code === bankCode);
  const filteredBanks = BANKS.filter(b => b.name.toLowerCase().includes(bankSearch.toLowerCase()));

  // === STEP: Choose identity method ===
  if (step === 'choose') {
    return (
      <div className="h-screen w-screen bg-white flex flex-col">
        <div className="flex-1 flex flex-col justify-center px-6">
          <div className="text-center mb-10">
            <div className="w-16 h-16 rounded-2xl bg-sabi-green/10 flex items-center justify-center mx-auto mb-4">
              <img src="/logo.png" alt="SabiWork" className="w-10 h-10 rounded-lg" onError={(e) => { e.target.style.display = 'none'; }} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome to SabiWork</h1>
            <p className="text-sm text-gray-500 mt-1">Sign in or create your account</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => setStep('bank_login')}
              className="w-full p-5 bg-sabi-green/5 border-2 border-sabi-green/30 rounded-2xl text-left flex items-start gap-4 active:scale-[0.98] transition-transform"
            >
              <div className="w-12 h-12 rounded-xl bg-sabi-green/20 flex items-center justify-center shrink-0">
                <CreditCard className="w-6 h-6 text-sabi-green" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Bank Account</h3>
                <p className="text-sm text-gray-500 mt-0.5">Enter account number — we detect your bank and verify your name automatically.</p>
                <span className="inline-block mt-2 px-2.5 py-0.5 bg-sabi-green/10 text-sabi-green text-xs font-semibold rounded-full">Recommended</span>
              </div>
            </button>

            <button
              onClick={() => setStep('phone_login')}
              className="w-full p-5 bg-gray-50 border-2 border-gray-200 rounded-2xl text-left flex items-start gap-4 active:scale-[0.98] transition-transform"
            >
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                <User className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Phone Number</h3>
                <p className="text-sm text-gray-500 mt-0.5">Sign in with your registered phone number.</p>
              </div>
            </button>
          </div>
        </div>

        <div className="px-6 pb-8 text-center">
          <p className="text-xs text-gray-400">By continuing, you agree to SabiWork's Terms of Service</p>
        </div>
      </div>
    );
  }

  // === STEP: Phone login ===
  if (step === 'phone_login') {
    return (
      <div className="h-screen w-screen bg-white flex flex-col">
        <div className="px-5 pt-14 pb-4">
          <button onClick={() => { setStep('choose'); setError(''); }} className="text-sm text-sabi-green font-medium">← Back</button>
          <h1 className="text-xl font-bold text-gray-900 mt-3">Sign in with Phone</h1>
          <p className="text-sm text-gray-500 mt-1">Enter your registered phone number</p>
        </div>

        <div className="flex-1 px-5 pt-4">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setError(''); }}
              placeholder="08012345678"
              className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-base outline-none focus:border-sabi-green focus:ring-1 focus:ring-sabi-green/30"
              autoFocus
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 mt-3 px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span className="text-sm text-red-600">{error}</span>
            </div>
          )}

          <button
            onClick={handlePhoneLogin}
            disabled={loading || phone.length < 10}
            className="w-full mt-6 py-4 rounded-xl bg-sabi-green text-white font-semibold text-base disabled:opacity-40 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            {loading ? 'Checking...' : 'Continue'}
          </button>
        </div>
      </div>
    );
  }

  // === STEP: Bank login (with auto-detect) ===
  if (step === 'bank_login') {
    return (
      <div className="h-screen w-screen bg-white flex flex-col">
        <div className="px-5 pt-14 pb-4">
          <button onClick={() => { setStep('choose'); setError(''); setResolvedName(''); setAccountNumber(''); setBankCode(''); setAutoDetected(false); }} className="text-sm text-sabi-green font-medium">← Back</button>
          <h1 className="text-xl font-bold text-gray-900 mt-3">Sign in with Bank</h1>
          <p className="text-sm text-gray-500 mt-1">Enter your account number — we'll detect your bank automatically</p>
        </div>

        <div className="flex-1 px-5 pt-4 space-y-4">
          {/* Account number FIRST (so auto-detect works) */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Account Number</label>
            <input
              type="tel"
              maxLength={10}
              value={accountNumber}
              onChange={(e) => handleAccountInput(e.target.value)}
              placeholder="Enter 10-digit account number"
              className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-lg font-medium outline-none focus:border-sabi-green focus:ring-1 focus:ring-sabi-green/30 tracking-wider"
              autoFocus
            />
            <p className="text-xs text-gray-400 mt-1.5">
              {accountNumber.length}/10 digits {autoDetected && '· Bank auto-detected'}
            </p>
          </div>

          {/* Bank selector (auto-filled or manual) */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">
              Bank
              {autoDetected && <span className="text-sabi-green ml-1">(auto-detected)</span>}
            </label>
            <button
              type="button"
              onClick={() => setBankSelectorOpen(true)}
              className="w-full flex items-center justify-between px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-left"
            >
              <span className={`text-base ${selectedBank ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                {selectedBank ? selectedBank.name : 'Select Bank (or enter account to auto-detect)'}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Resolving state */}
          {resolving && (
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-xl">
              <Loader2 className="w-4 h-4 text-sabi-green animate-spin" />
              <span className="text-sm text-gray-500">Verifying account...</span>
            </div>
          )}

          {/* Resolved name */}
          {resolvedName && !resolving && (
            <div className="flex items-center gap-2 px-4 py-3 bg-sabi-green/5 border border-sabi-green/20 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-sabi-green" />
              <span className="text-sm font-medium text-gray-900">{resolvedName}</span>
            </div>
          )}

          {error && !resolving && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span className="text-sm text-red-600">{error}</span>
            </div>
          )}

          <button
            onClick={handleBankLogin}
            disabled={loading || !resolvedName || resolving}
            className="w-full py-4 rounded-xl bg-sabi-green text-white font-semibold text-base disabled:opacity-40 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            {loading ? 'Signing in...' : 'Continue'}
          </button>
        </div>

        {/* Bank selector bottom sheet */}
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
                    onClick={() => { setBankCode(bank.code); setAutoDetected(false); setBankSelectorOpen(false); setBankSearch(''); }}
                    className="w-full flex items-center justify-between py-3.5 border-b border-gray-50 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                        <span className="text-xs font-bold text-gray-500">{bank.name.slice(0, 2).toUpperCase()}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-800">{bank.name}</span>
                    </div>
                    {bankCode === bank.code && <CheckCircle2 className="w-5 h-5 text-sabi-green" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // === STEP: User type selection (worker vs buyer) ===
  if (step === 'user_type') {
    return (
      <div className="h-screen w-screen bg-white flex flex-col">
        <div className="px-5 pt-14 pb-4">
          <button onClick={() => { setStep('choose'); setError(''); }} className="text-sm text-sabi-green font-medium">← Back</button>
          <h1 className="text-xl font-bold text-gray-900 mt-3">What brings you here?</h1>
          <p className="text-sm text-gray-500 mt-1">
            {onboardForm.name ? `Welcome, ${onboardForm.name}!` : 'Tell us how you want to use SabiWork'}
          </p>
        </div>

        <div className="flex-1 px-5 pt-4 space-y-4">
          {/* Looking for services (buyer) */}
          <button
            onClick={() => handleUserTypeSelect('buyer')}
            disabled={loading}
            className="w-full p-5 bg-blue-50 border-2 border-blue-200 rounded-2xl text-left flex items-start gap-4 active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
              <Search className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">I need services</h3>
              <p className="text-sm text-gray-500 mt-0.5">Find plumbers, electricians, painters and other skilled workers near you.</p>
            </div>
          </button>

          {/* Providing services (worker) */}
          <button
            onClick={() => handleUserTypeSelect('worker')}
            disabled={loading}
            className="w-full p-5 bg-sabi-green/5 border-2 border-sabi-green/30 rounded-2xl text-left flex items-start gap-4 active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            <div className="w-12 h-12 rounded-xl bg-sabi-green/20 flex items-center justify-center shrink-0">
              <Wrench className="w-6 h-6 text-sabi-green" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">I provide services</h3>
              <p className="text-sm text-gray-500 mt-0.5">Get matched with customers, receive payments, and build your financial profile.</p>
            </div>
          </button>

          {/* Trader */}
          <button
            onClick={() => handleUserTypeSelect('trader')}
            disabled={loading}
            className="w-full p-5 bg-orange-50 border-2 border-orange-200 rounded-2xl text-left flex items-start gap-4 active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
              <CreditCard className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">I sell goods</h3>
              <p className="text-sm text-gray-500 mt-0.5">Log your sales, track revenue, and build a credit score for business loans.</p>
            </div>
          </button>

          {/* Seeker */}
          <button
            onClick={() => handleUserTypeSelect('seeker')}
            disabled={loading}
            className="w-full p-5 bg-purple-50 border-2 border-purple-200 rounded-2xl text-left flex items-start gap-4 active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
              <Search className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">I want to learn a trade</h3>
              <p className="text-sm text-gray-500 mt-0.5">Find apprenticeships, see what skills are in demand, and start your career.</p>
            </div>
          </button>

          {loading && (
            <div className="flex items-center justify-center pt-4">
              <Loader2 className="w-5 h-5 text-sabi-green animate-spin" />
              <span className="text-sm text-gray-500 ml-2">Setting up your account...</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span className="text-sm text-red-600">{error}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // === STEP: Worker onboarding (trade + areas) ===
  if (step === 'onboard') {
    return (
      <div className="h-screen w-screen bg-white flex flex-col overflow-y-auto">
        <div className="px-5 pt-14 pb-4">
          <button onClick={() => { setStep('user_type'); setError(''); }} className="text-sm text-sabi-green font-medium">← Back</button>
          <h1 className="text-xl font-bold text-gray-900 mt-3">Complete Your Profile</h1>
          <p className="text-sm text-gray-500 mt-1">
            {onboardForm.name ? `Almost done, ${onboardForm.name}!` : 'Tell us about your services'}
          </p>
        </div>

        <form onSubmit={handleWorkerOnboard} className="flex-1 px-5 pb-8 space-y-5">
          {/* Show verified identity */}
          {identityMethod === 'bank' && onboardForm.name && (
            <div className="flex items-center gap-2 px-4 py-3 bg-sabi-green/5 border border-sabi-green/20 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-sabi-green" />
              <span className="text-sm font-medium text-gray-900">{onboardForm.name}</span>
              <span className="text-xs text-gray-400 ml-auto">BVN verified</span>
            </div>
          )}

          {/* Name (for phone flow only) */}
          {identityMethod === 'phone' && (
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Full Name</label>
              <input
                type="text"
                required
                value={onboardForm.name}
                onChange={(e) => setOnboardForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Enter your full name"
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-sabi-green focus:ring-1 focus:ring-sabi-green/30"
              />
            </div>
          )}

          {/* Phone for bank flow */}
          {identityMethod === 'bank' && (
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Phone Number (for job alerts)</label>
              <input
                type="tel"
                value={onboardForm.phone}
                onChange={(e) => setOnboardForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="08012345678"
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-sabi-green focus:ring-1 focus:ring-sabi-green/30"
              />
            </div>
          )}

          {/* Trade */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-2 block">What do you do?</label>
            <div className="grid grid-cols-2 gap-2">
              {TRADES.map((trade) => (
                <button
                  key={trade}
                  type="button"
                  onClick={() => setOnboardForm(f => ({ ...f, primary_trade: trade }))}
                  className={`h-11 rounded-xl text-xs font-medium capitalize transition-colors ${
                    onboardForm.primary_trade === trade
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
            <label className="text-xs font-medium text-gray-500 mb-2 block">Where do you work?</label>
            <div className="flex flex-wrap gap-2">
              {AREAS.map((area) => (
                <button
                  key={area}
                  type="button"
                  onClick={() => {
                    setOnboardForm(f => ({
                      ...f,
                      service_areas: f.service_areas.includes(area)
                        ? f.service_areas.filter(a => a !== area)
                        : [...f.service_areas, area]
                    }));
                  }}
                  className={`px-3 py-2 rounded-full text-xs capitalize transition-colors ${
                    onboardForm.service_areas.includes(area)
                      ? 'bg-sabi-green text-white'
                      : 'bg-gray-50 text-gray-700 border border-gray-200'
                  }`}
                >
                  {area.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span className="text-sm text-red-600">{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !onboardForm.primary_trade || onboardForm.service_areas.length === 0 || (identityMethod === 'phone' && !onboardForm.name)}
            className="w-full py-4 bg-sabi-green text-white font-semibold text-base rounded-xl disabled:opacity-40 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            {loading ? 'Creating account...' : 'Get Started'}
          </button>
        </form>
      </div>
    );
  }

  return null;
}
