// pwa/src/pages/ProfilePage.jsx
import { ChevronRight, Pencil, LogOut, Share2 } from 'lucide-react';
import { useState } from 'react';
import useAppStore from '../stores/appStore';

function getSabiTier(score) {
  if (score >= 70) return { label: 'Full Financial Suite', color: '#F9A825', badge: 'trophy' };
  if (score >= 50) return { label: 'Microloan Eligible', color: '#1565C0', badge: 'trending-up' };
  if (score >= 30) return { label: 'Savings Unlocked', color: '#1B7A3D', badge: 'shield-check' };
  return { label: 'Building Score', color: '#81C784', badge: 'seedling' };
}

const TIER_BADGE_SVGS = {
  trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
  'trending-up': '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
  'shield-check': '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  seedling: '<path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>'
};

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
  const sabiScore = user?.sabi_score || 0;
  const tier = getSabiTier(sabiScore);
  const trade = user?.primary_trade || '';
  const areas = user?.service_areas || [];

  const handleShareProfile = () => {
    const profileId = user?.phone || user?.id;
    const shareUrl = `${window.location.origin}/p/${profileId}`;

    // Always use execCommand as primary - works on all browsers without HTTPS
    const textarea = document.createElement('textarea');
    textarea.value = shareUrl;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, 99999); // For mobile
    document.execCommand('copy');
    document.body.removeChild(textarea);
    setShareText('Link Copied!');
    setTimeout(() => setShareText('Share Profile'), 2500);
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
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border" style={{ borderColor: `${tier.color}40`, backgroundColor: `${tier.color}10` }}>
            <span
              className="inline-flex items-center justify-center w-5 h-5 rounded-full"
              style={{ backgroundColor: tier.color }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: TIER_BADGE_SVGS[tier.badge] }} />
            </span>
            <span className="text-sm font-medium" style={{ color: tier.color }}>Sabi {sabiScore}</span>
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

      {/* Sabi Score */}
      <div className="px-5 mb-6">
        <h3 className="text-base font-bold text-gray-900 mb-3">Sabi Score</h3>
        <div className="border rounded-2xl p-5" style={{ borderColor: `${tier.color}30`, backgroundColor: `${tier.color}08` }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-1">Your Score</p>
              <div className="flex items-center gap-2">
                <p className="text-3xl font-bold" style={{ color: tier.color }}>
                  {sabiScore} <span className="text-base font-normal text-gray-400">/ 100</span>
                </p>
                <span
                  className="inline-flex items-center justify-center w-8 h-8 rounded-full"
                  style={{ backgroundColor: tier.color }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: TIER_BADGE_SVGS[tier.badge] }} />
                </span>
              </div>
            </div>
          </div>
          <p className="text-sm font-medium mt-2" style={{ color: tier.color }}>{tier.label}</p>
          <div className="w-full h-2 bg-gray-200 rounded-full mt-3 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${sabiScore}%`, backgroundColor: tier.color }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {sabiScore >= 50 ? 'Microloan eligible' : `${50 - sabiScore} points to microloan eligibility`}
          </p>
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
