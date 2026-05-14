// pwa/src/pages/ProfilePage.jsx
import { Star, ChevronRight, Pencil, LogOut, Share2 } from 'lucide-react';
import { useState } from 'react';
import useAppStore from '../stores/appStore';

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
  const { user, logout } = useAppStore();
  const [shareText, setShareText] = useState('Share Profile');

  const name = user?.name || 'User';
  const initial = name.charAt(0).toUpperCase();
  const trustScore = user?.trust_score || 0;
  const sabiScore = user?.sabi_score || 0;
  const trade = user?.primary_trade || '';
  const areas = user?.service_areas || [];

  const handleShareProfile = async () => {
    const shareUrl = `${window.location.origin}/p/${user?.id}`;
    const shareData = {
      title: `${name} on SabiWork`,
      text: `Check out ${name}'s profile on SabiWork`,
      url: shareUrl
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    } else if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setShareText('Copied!');
        setTimeout(() => setShareText('Share Profile'), 2000);
      } catch (err) {
        console.error('Copy failed:', err);
      }
    }
  };

  return (
    <div className="h-full pb-16 overflow-y-auto bg-white">
      {/* Header */}
      <div className="pt-14 pb-2 text-center">
        <h1 className="text-lg font-bold text-gray-900">My Settings</h1>
      </div>

      {/* Avatar section */}
      <div className="flex flex-col items-center px-5 pt-4 pb-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-sabi-green to-sabi-green-dark overflow-hidden border-4 border-white shadow-lg flex items-center justify-center">
            <span className="text-3xl font-bold text-white">{initial}</span>
          </div>
          <button className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-sabi-green flex items-center justify-center border-2 border-white">
            <Pencil className="w-3 h-3 text-white" />
          </button>
        </div>

        <h2 className="text-xl font-bold text-gray-900 mt-4">{name}</h2>
        <p className="text-sm text-gray-500 mt-0.5 capitalize">
          {trade || 'Member'} {areas.length > 0 ? `· ${areas[0].replace('_', ' ')}` : ''}
        </p>

        {/* Badges */}
        <div className="flex items-center gap-3 mt-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-100">
            <Star className="w-3.5 h-3.5 text-yellow-500" fill="#F9A825" />
            <span className="text-sm font-medium text-gray-700">{(trustScore * 5).toFixed(1)} Rating</span>
          </div>
          {user?.phone && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-100">
              <span className="w-2 h-2 rounded-full bg-sabi-green" />
              <span className="text-sm font-medium text-gray-700">{user.phone}</span>
            </div>
          )}
        </div>

        {/* Share Profile Button */}
        <button
          onClick={handleShareProfile}
          className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full border border-gray-100 mt-3 hover:bg-gray-100 transition-colors"
        >
          <Share2 className="w-3.5 h-3.5 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">{shareText}</span>
        </button>
      </div>

      {/* My Scores */}
      <div className="px-5 mb-6">
        <h3 className="text-base font-bold text-gray-900 mb-3">My Scores</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="border border-sabi-green/30 rounded-xl p-4 bg-sabi-green/5">
            <p className="text-xs text-gray-500 mb-1">Trust Score</p>
            <p className="text-2xl font-bold text-sabi-green">{Number(trustScore).toFixed(2)}</p>
            <p className="text-xs text-gray-600 mt-0.5">
              {trustScore >= 0.8 ? 'Elite' : trustScore >= 0.6 ? 'Verified' : trustScore >= 0.3 ? 'Trusted' : 'Emerging'}
            </p>
            <div className="w-full h-1.5 bg-gray-200 rounded-full mt-2">
              <div className="h-full bg-sabi-green-dark rounded-full" style={{ width: `${trustScore * 100}%` }} />
            </div>
          </div>
          <div className="border border-orange-200 rounded-xl p-4 bg-orange-50/50">
            <p className="text-xs text-gray-500 mb-1">Sabi Score</p>
            <p className="text-2xl font-bold text-orange-500">{sabiScore}</p>
            <p className="text-xs text-gray-600 mt-0.5">
              {sabiScore >= 50 ? 'Loan eligible' : `${50 - sabiScore} pts to loan`}
            </p>
            <div className="w-full h-1.5 bg-gray-200 rounded-full mt-2">
              <div className="h-full bg-orange-400 rounded-full" style={{ width: `${sabiScore}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Bank identity */}
      {user?.account_number && (
        <div className="px-5 mb-6">
          <div className="px-4 py-3 bg-gray-50 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Bank Identity</p>
              <p className="text-sm font-medium text-gray-900">****{user.account_number.slice(-4)}</p>
            </div>
            <span className="px-2 py-0.5 bg-sabi-green/10 text-sabi-green text-xs font-semibold rounded-full">Verified</span>
          </div>
        </div>
      )}

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

        {/* Log Out */}
        <button
          onClick={logout}
          className="w-full flex items-center justify-between px-4 py-4 bg-red-50 rounded-xl mt-4"
        >
          <div className="flex items-center gap-2">
            <LogOut className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium text-red-500">Log Out</span>
          </div>
          <ChevronRight className="w-4 h-4 text-red-400" />
        </button>
      </div>

      <div className="h-8" />
    </div>
  );
}
