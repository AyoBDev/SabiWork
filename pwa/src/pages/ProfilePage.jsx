// pwa/src/pages/ProfilePage.jsx
import { useState } from 'react';
import useAppStore from '../stores/appStore';
import ScoreSection from '../components/profile/ScoreSection';
import BankSection from '../components/profile/BankSection';
import api from '../services/api';

export default function ProfilePage() {
  const { user } = useAppStore();

  // Demo user for display
  const profile = user || {
    name: 'Emeka Okafor',
    phone: '08031000001',
    primary_trade: 'plumbing',
    service_areas: ['surulere', 'yaba', 'mushin'],
    trust_score: 0.76,
    sabi_score: 62,
    total_jobs: 34,
    total_income: 510000,
    is_available: true,
    account_name: 'EMEKA OKAFOR',
    account_number: '0123456701',
    bank_code: '058',
    virtual_account_number: '9900000001',
    onboarding_channel: 'whatsapp',
    gps_verified: true
  };

  const [available, setAvailable] = useState(profile.is_available);

  const toggleAvailability = async () => {
    const newVal = !available;
    setAvailable(newVal);
    try {
      if (user?.id) {
        await api.updateAvailability(user.id, newVal);
      }
    } catch (err) {
      setAvailable(!newVal); // revert
    }
  };

  return (
    <div className="h-full pb-14 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-warm-bg/95 backdrop-blur-sm z-10 px-4 pt-4 pb-2 border-b border-warm-border">
        <h1 className="text-lg font-bold text-warm-text">Profile</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* User card */}
        <div className="bg-white rounded-xl border border-warm-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-sabi-green flex items-center justify-center text-white text-xl font-bold">
              {profile.name.charAt(0)}
            </div>
            <div className="flex-1">
              <h2 className="text-base font-semibold text-warm-text">{profile.name}</h2>
              <p className="text-xs text-warm-muted capitalize">{profile.primary_trade} · {profile.phone}</p>
              <div className="flex items-center gap-1 mt-1">
                {profile.gps_verified && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-sabi-green/10 text-sabi-green rounded-full">GPS ✓</span>
                )}
                <span className="text-[9px] px-1.5 py-0.5 bg-warm-bg text-warm-muted rounded-full capitalize">
                  via {profile.onboarding_channel}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Availability toggle */}
        <div className="bg-white rounded-xl border border-warm-border p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-warm-text">Available for Jobs</p>
            <p className="text-[10px] text-warm-muted">Toggle to appear in search results</p>
          </div>
          <button
            onClick={toggleAvailability}
            className={`w-12 h-7 rounded-full transition-colors relative ${
              available ? 'bg-sabi-green' : 'bg-warm-border'
            }`}
          >
            <div
              className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                available ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Scores */}
        <ScoreSection trustScore={profile.trust_score} sabiScore={profile.sabi_score} />

        {/* Service areas */}
        <div className="bg-white rounded-xl border border-warm-border p-4">
          <h3 className="text-sm font-semibold text-warm-text mb-2">Service Areas</h3>
          <div className="flex flex-wrap gap-2">
            {(profile.service_areas || []).map((area) => (
              <span key={area} className="px-2.5 py-1 text-xs bg-warm-bg text-warm-text rounded-full capitalize">
                {area.replace('_', ' ')}
              </span>
            ))}
          </div>
        </div>

        {/* Bank */}
        <BankSection user={profile} />

        {/* Stats */}
        <div className="bg-white rounded-xl border border-warm-border p-4">
          <h3 className="text-sm font-semibold text-warm-text mb-2">Lifetime Stats</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center bg-warm-bg rounded-lg p-3">
              <p className="text-lg font-bold text-warm-text">{profile.total_jobs}</p>
              <p className="text-[10px] text-warm-muted">Jobs Done</p>
            </div>
            <div className="text-center bg-warm-bg rounded-lg p-3">
              <p className="text-lg font-bold text-sabi-green">₦{(profile.total_income / 1000).toFixed(0)}k</p>
              <p className="text-[10px] text-warm-muted">Total Earned</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
