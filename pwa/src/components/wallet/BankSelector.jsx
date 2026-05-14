// pwa/src/components/wallet/BankSelector.jsx
import { useState } from 'react';
import { Search, Check, ChevronDown, X } from 'lucide-react';

const BANKS = [
  { name: 'Access Bank', code: '044' },
  { name: 'Citibank', code: '023' },
  { name: 'Ecobank', code: '050' },
  { name: 'Fidelity Bank', code: '070' },
  { name: 'First Bank', code: '011' },
  { name: 'First City Monument Bank', code: '214' },
  { name: 'GTBank', code: '058' },
  { name: 'Heritage Bank', code: '030' },
  { name: 'Keystone Bank', code: '082' },
  { name: 'Kuda', code: '090267' },
  { name: 'Moniepoint', code: '100022' },
  { name: 'OPay', code: '100004' },
  { name: 'PalmPay', code: '100033' },
  { name: 'Polaris Bank', code: '076' },
  { name: 'Stanbic IBTC', code: '221' },
  { name: 'Standard Chartered', code: '068' },
  { name: 'Sterling Bank', code: '232' },
  { name: 'UBA', code: '033' },
  { name: 'Union Bank', code: '032' },
  { name: 'Unity Bank', code: '215' },
  { name: 'Wema Bank', code: '035' },
  { name: 'Zenith Bank', code: '057' },
  { name: 'FairMoney', code: '090551' },
  { name: 'Carbon', code: '100026' },
  { name: 'VFD Microfinance Bank', code: '090110' }
];

export { BANKS };

export default function BankSelector({ selected, onSelect }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = BANKS.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-left"
      >
        <span className={`text-sm ${selected ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
          {selected ? selected.name : 'Select Bank'}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>

      {/* Bottom sheet */}
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative w-full bg-white rounded-t-3xl max-h-[70vh] flex flex-col animate-slide-up">
            {/* Handle */}
            <div className="flex items-center justify-center pt-3 pb-1">
              <div className="w-10 h-1.5 rounded-full bg-gray-200" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Select Bank</h3>
              <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Search */}
            <div className="px-5 py-3">
              <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search bank..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
                  autoFocus
                />
              </div>
            </div>

            {/* Bank list */}
            <div className="flex-1 overflow-y-auto px-5 pb-8">
              {filtered.map((bank) => (
                <button
                  key={bank.code}
                  onClick={() => { onSelect(bank); setOpen(false); setSearch(''); }}
                  className="w-full flex items-center justify-between py-3.5 border-b border-gray-50 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                      <span className="text-xs font-bold text-gray-500">{bank.name.slice(0, 2).toUpperCase()}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-800">{bank.name}</span>
                  </div>
                  {selected?.code === bank.code && (
                    <Check className="w-5 h-5 text-sabi-green" />
                  )}
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">No banks found</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
