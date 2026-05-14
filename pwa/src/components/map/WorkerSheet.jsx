// pwa/src/components/map/WorkerSheet.jsx
import { useState } from 'react';
import { X, Star, MapPin, Clock, Phone } from 'lucide-react';

const MOCK_REVIEWS = [
  { name: 'Funke A.', rating: 5, text: 'Very respectful and hardworking. The work was done perfectly with no issues.' },
  { name: 'Olaoluwa T.', rating: 5, text: 'Excellent finishing and very neat work. My living room looks brand new.' },
  { name: 'Ahmed A.', rating: 5, text: 'Arrived on time and completed the work faster than expected.' },
  { name: 'Temi F.', rating: 4, text: 'Transformed my apartment completely. The finishing looks premium.' }
];

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

export default function WorkerSheet({ worker, onClose, onBook }) {
  if (!worker) return null;

  const sabiScore = worker.sabi_score || 0;
  const tier = getSabiTier(sabiScore);
  const rating = worker.avg_rating || 4.7;
  const totalJobs = worker.total_jobs || 0;
  const distance = worker.distance || '1.3';
  const eta = worker.eta || '18';

  return (
    <div className="fixed inset-0 z-[200] flex items-end pointer-events-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 pointer-events-auto"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative w-full bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto pointer-events-auto animate-slide-up">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2 sticky top-0 bg-white rounded-t-3xl z-10">
          <div className="w-10 h-1.5 rounded-full bg-gray-300" />
        </div>

        {/* Worker header */}
        <div className="px-5 pb-4">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-sabi-green to-sabi-green-dark flex items-center justify-center text-white text-2xl font-bold shrink-0 overflow-hidden">
              {worker.photo_url ? (
                <img src={worker.photo_url} alt={worker.name} className="w-full h-full object-cover" />
              ) : (
                <span>{(worker.name || 'W').charAt(0)}</span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{worker.name}</h2>
                  <p className="text-sm text-gray-500 capitalize">
                    {worker.primary_trade} · {worker.service_areas?.[0]?.replace('_', ' ') || 'Lagos'}
                  </p>
                </div>
                {worker.is_available && (
                  <span className="text-xs font-semibold text-sabi-green bg-sabi-green/10 px-2.5 py-1 rounded-full">
                    Available
                  </span>
                )}
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-yellow-500" fill="#F9A825" />
                  <span className="font-medium text-gray-700">{rating.toFixed(1)} ({totalJobs})</span>
                </div>
                <span className="text-gray-300">|</span>
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  <span>{distance}Km away</span>
                </div>
                <span className="text-gray-300">|</span>
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  <span>{eta} Min</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sabi Score section */}
        <div className="mx-5 mb-5 p-4 bg-gray-50 rounded-2xl">
          <p className="text-xs text-gray-500 mb-1">Sabi Score</p>
          <p className="text-2xl font-bold" style={{ color: tier.color }}>
            {sabiScore} <span className="text-base font-normal text-gray-400">/ 100</span>
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="inline-flex items-center justify-center w-7 h-7 rounded-full"
              style={{ backgroundColor: tier.color }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: TIER_BADGE_SVGS[tier.badge] }} />
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full mt-2.5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${sabiScore}%`, backgroundColor: tier.color }}
            />
          </div>
        </div>

        {/* Recent Reviews */}
        <div className="px-5 pb-6">
          <h3 className="text-base font-bold text-gray-900 mb-3">Recent Reviews</h3>
          <div className="space-y-3">
            {MOCK_REVIEWS.map((review, i) => (
              <div key={i} className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-900">{review.name}</span>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className="w-3.5 h-3.5"
                        fill={s <= review.rating ? '#F9A825' : '#E0E0E0'}
                        stroke="none"
                      />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">"{review.text}"</p>
              </div>
            ))}
          </div>
        </div>

        {/* Sticky action buttons */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-4 flex gap-3">
          <button
            onClick={() => worker.phone && window.open(`tel:${worker.phone}`, '_self')}
            className="flex-1 py-3.5 rounded-xl border-2 border-gray-200 flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
          >
            <Phone className="w-4.5 h-4.5 text-gray-700" />
            <span className="text-sm font-semibold text-gray-700">Call</span>
          </button>
          <button
            onClick={() => onBook?.(worker)}
            className="flex-1 py-3.5 rounded-xl bg-sabi-green text-white font-semibold text-sm active:scale-[0.97] transition-transform"
          >
            Book
          </button>
        </div>
      </div>
    </div>
  );
}
