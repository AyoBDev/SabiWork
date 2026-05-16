// pwa/src/pages/PublicProfilePage.jsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, Shield, Award, MapPin, Briefcase, Users, Loader2, TrendingUp } from 'lucide-react';

const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const SABI_TIER_CONFIG = {
  Elite: { color: '#F9A825', bgColor: '#FFF9E6', icon: Award },
  Verified: { color: '#1565C0', bgColor: '#E3F2FD', icon: Shield },
  Trusted: { color: '#1B7A3D', bgColor: '#E8F5E9', icon: Shield },
  Emerging: { color: '#81C784', bgColor: '#F1F8F4', icon: Shield }
};

async function fetchPublicProfile(userId) {
  try {
    const workerRes = await fetch(`${BASE_URL}/workers/${userId}/public`);
    if (workerRes.ok) {
      return await workerRes.json();
    }
  } catch (err) {
    // Try trader endpoint
  }

  try {
    const traderRes = await fetch(`${BASE_URL}/traders/${userId}/public`);
    if (traderRes.ok) {
      return await traderRes.json();
    }
  } catch (err) {
    // Both failed
  }

  throw new Error('Profile not found');
}

function getSabiTier(score) {
  if (score >= 0.8) return 'Elite';
  if (score >= 0.6) return 'Verified';
  if (score >= 0.3) return 'Trusted';
  return 'Emerging';
}

export default function PublicProfilePage() {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchPublicProfile(userId);
        setProfile(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (userId) {
      loadProfile();
    }
  }, [userId]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 text-sabi-green animate-spin" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-white px-5 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <span className="text-3xl">😕</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Profile Not Found</h1>
        <p className="text-sm text-gray-500 mb-6">This profile doesn't exist or is no longer available.</p>
        <Link
          to="/"
          className="px-6 py-3 bg-sabi-green text-white rounded-xl font-medium"
        >
          Visit SabiWork
        </Link>
      </div>
    );
  }

  const name = profile.name || 'User';
  const initial = name.charAt(0).toUpperCase();
  const trustScore = profile.sabi_score || 0;
  const trustTier = getSabiTier(trustScore);
  const tierConfig = SABI_TIER_CONFIG[trustTier];
  const TierIcon = tierConfig.icon;
  const trade = profile.primary_trade || profile.business_type || 'Member';
  const areas = profile.service_areas || [];
  const totalJobs = profile.jobs_completed || 0;
  const avgRating = profile.average_rating || trustScore * 5;
  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
    : 'Recently';
  const apprenticeSlots = profile.apprentice_slots_open || 0;
  const hasApprenticeSlots = apprenticeSlots > 0;
  const investmentRound = profile.active_investment_round;

  return (
    <div className="min-h-screen w-screen bg-white overflow-y-auto pb-8">
      {/* Header */}
      <div className="pt-8 pb-6 px-5 bg-gradient-to-b from-sabi-green/5 to-transparent">
        <div className="flex flex-col items-center">
          {/* Avatar */}
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-sabi-green to-sabi-green-dark overflow-hidden border-4 border-white shadow-xl flex items-center justify-center">
            <span className="text-5xl font-bold text-white">{initial}</span>
          </div>

          {/* Name and Trade */}
          <h1 className="text-2xl font-bold text-gray-900 mt-5">{name}</h1>
          <p className="text-base text-gray-600 mt-1 capitalize flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            {trade.replace('_', ' ')}
          </p>

          {/* Trust Tier Badge */}
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-full mt-4 border-2"
            style={{
              backgroundColor: tierConfig.bgColor,
              borderColor: tierConfig.color
            }}
          >
            <TierIcon className="w-5 h-5" style={{ color: tierConfig.color }} />
            <span className="font-bold text-sm" style={{ color: tierConfig.color }}>
              {trustTier}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="px-5 py-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{totalJobs}</p>
            <p className="text-xs text-gray-500 mt-1">Jobs Completed</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Star className="w-4 h-4 text-yellow-500" fill="#F9A825" />
              <p className="text-2xl font-bold text-gray-900">{avgRating.toFixed(1)}</p>
            </div>
            <p className="text-xs text-gray-500 mt-1">Average Rating</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{memberSince}</p>
            <p className="text-xs text-gray-500 mt-1">Member Since</p>
          </div>
        </div>
      </div>

      {/* Service Areas */}
      {areas.length > 0 && (
        <div className="px-5 pb-6">
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Service Areas
          </h3>
          <div className="flex flex-wrap gap-2">
            {areas.map((area, idx) => (
              <span
                key={idx}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-full"
              >
                {area.replace('_', ' ')}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Apprentice Badge */}
      {hasApprenticeSlots && (
        <div className="px-5 pb-6">
          <div className="border-2 border-sabi-green rounded-xl p-4 bg-sabi-green/5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-sabi-green/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-sabi-green" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Trains Apprentices</h3>
                <p className="text-sm text-gray-600">
                  {apprenticeSlots} open slot{apprenticeSlots !== 1 ? 's' : ''} available
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Investment Round */}
      {investmentRound && (
        <div className="px-5 pb-6">
          <Link
            to={`/invest/${investmentRound.id}`}
            className="block border-2 border-orange-400 rounded-xl p-4 bg-orange-50 hover:bg-orange-100 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">Invest in this business</h3>
                <p className="text-sm text-gray-600 mt-0.5">{investmentRound.description}</p>
              </div>
              <TrendingUp className="w-5 h-5 text-orange-500 flex-shrink-0" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Target: ₦{investmentRound.target_amount?.toLocaleString()}</span>
                <span className="font-bold text-orange-600">
                  {Math.round((investmentRound.current_amount / investmentRound.target_amount) * 100)}%
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 rounded-full transition-all"
                  style={{
                    width: `${Math.min((investmentRound.current_amount / investmentRound.target_amount) * 100, 100)}%`
                  }}
                />
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* CTA Button */}
      <div className="px-5 pb-6">
        <Link
          to="/"
          className="block w-full py-4 bg-sabi-green text-white text-center font-bold rounded-xl shadow-lg hover:bg-sabi-green-dark transition-colors"
        >
          Book via SabiWork
        </Link>
      </div>

      {/* Branding */}
      <div className="px-5 text-center">
        <p className="text-xs text-gray-400">Powered by SabiWork</p>
        <p className="text-sm font-medium text-sabi-green mt-1">Sabi dey pay.</p>
      </div>
    </div>
  );
}
