// pwa/src/pages/ProfilePage.jsx
import { Star, ChevronRight, Pencil } from 'lucide-react';

const MENU_ITEMS = [
  { label: 'Personal Info' },
  { label: 'Verification' },
  { label: 'Download Data' },
  { label: 'Terms and Conditions' },
  { label: 'Language' },
  { label: 'Notification Setting' },
  { label: 'Contact Us' }
];

export default function ProfilePage() {
  return (
    <div className="h-full pb-16 overflow-y-auto bg-white">
      {/* Header */}
      <div className="pt-14 pb-2 text-center">
        <h1 className="text-lg font-bold text-gray-900">My Settings</h1>
      </div>

      {/* Avatar section */}
      <div className="flex flex-col items-center px-5 pt-4 pb-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 overflow-hidden border-4 border-white shadow-lg flex items-center justify-center">
            <span className="text-3xl font-bold text-white">A</span>
          </div>
          {/* Edit badge */}
          <button className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-sabi-green flex items-center justify-center border-2 border-white">
            <Pencil className="w-3 h-3 text-white" />
          </button>
        </div>

        <h2 className="text-xl font-bold text-gray-900 mt-4">Adekeye Olaoluwa</h2>
        <p className="text-sm text-gray-500 mt-0.5">Customer · Surulere, Lagos</p>

        {/* Badges */}
        <div className="flex items-center gap-3 mt-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-100">
            <Star className="w-3.5 h-3.5 text-yellow-500" fill="#F9A825" />
            <span className="text-sm font-medium text-gray-700">4.7 Rating</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-100">
            <span className="w-2 h-2 rounded-full bg-sabi-green" />
            <span className="text-sm font-medium text-gray-700">12 Jobs done</span>
          </div>
        </div>
      </div>

      {/* My Scores */}
      <div className="px-5 mb-6">
        <h3 className="text-base font-bold text-gray-900 mb-3">My Scores</h3>
        <div className="grid grid-cols-2 gap-3">
          {/* Trust Score */}
          <div className="border border-sabi-green/30 rounded-xl p-4 bg-sabi-green/5">
            <p className="text-xs text-gray-500 mb-1">Trust Score</p>
            <p className="text-2xl font-bold text-sabi-green">0.74</p>
            <p className="text-xs text-gray-600 mt-0.5">Verified Buyer</p>
            <div className="w-full h-1.5 bg-gray-200 rounded-full mt-2">
              <div className="h-full bg-sabi-green-dark rounded-full" style={{ width: '74%' }} />
            </div>
          </div>
          {/* Sabi Score */}
          <div className="border border-orange-200 rounded-xl p-4 bg-orange-50/50">
            <p className="text-xs text-gray-500 mb-1">Sabi Score</p>
            <p className="text-2xl font-bold text-orange-500">42</p>
            <p className="text-xs text-gray-600 mt-0.5">Credit booking eligible</p>
            <div className="w-full h-1.5 bg-gray-200 rounded-full mt-2">
              <div className="h-full bg-orange-400 rounded-full" style={{ width: '42%' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Menu items */}
      <div className="px-5 space-y-2">
        {MENU_ITEMS.map((item) => (
          <button
            key={item.label}
            className="w-full flex items-center justify-between px-4 py-4 bg-gray-50 rounded-xl"
          >
            <span className="text-sm font-medium text-gray-800">{item.label}</span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        ))}

        {/* Danger actions */}
        <button className="w-full flex items-center justify-between px-4 py-4 bg-red-50 rounded-xl mt-4">
          <span className="text-sm font-medium text-red-400">Deactivate Account</span>
          <ChevronRight className="w-4 h-4 text-red-400" />
        </button>
        <button className="w-full flex items-center justify-between px-4 py-4 bg-red-50 rounded-xl">
          <span className="text-sm font-medium text-red-500">Log Out</span>
          <ChevronRight className="w-4 h-4 text-red-500" />
        </button>
      </div>

      <div className="h-8" />
    </div>
  );
}
