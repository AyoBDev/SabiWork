// pwa/src/pages/JobsPage.jsx
import { useState } from 'react';
import { Briefcase, Coins, Star } from 'lucide-react';

const MOCK_JOBS = [
  {
    id: 1,
    worker_name: 'David Emeka',
    worker_initials: null,
    worker_photo: true,
    trade: 'Plumber',
    area: 'Surulere',
    service: 'Tap Repair',
    date: 'May 8th',
    amount: 5000,
    status: 'in_escrow',
    rating: 0
  },
  {
    id: 2,
    worker_name: 'Tunde Afolabi',
    worker_initials: 'JT',
    worker_photo: false,
    avatar_bg: '#F48FB1',
    trade: 'Bricklayer',
    area: 'Surulere',
    service: 'Tap Repair',
    date: 'May 8th',
    amount: 18000,
    status: 'completed',
    rating: 5
  },
  {
    id: 3,
    worker_name: 'Chinedu Okoro',
    worker_initials: null,
    worker_photo: true,
    trade: 'Tiler',
    area: 'Surulere',
    service: 'Tap Repair',
    date: 'May 8th',
    amount: 9000,
    status: 'completed',
    rating: 5
  },
  {
    id: 4,
    worker_name: 'Ibrahim Musa',
    worker_initials: 'JT',
    worker_photo: false,
    avatar_bg: '#F48FB1',
    trade: 'Welder',
    area: 'Surulere',
    service: 'Tap Repair',
    date: 'May 8th',
    amount: 5500,
    status: 'completed',
    rating: 5
  }
];

export default function JobsPage() {
  const [filter, setFilter] = useState('all');

  const filteredJobs = MOCK_JOBS.filter((job) => {
    if (filter === 'all') return true;
    if (filter === 'active') return job.status === 'in_escrow';
    if (filter === 'completed') return job.status === 'completed';
    return true;
  });

  return (
    <div className="h-full pb-16 overflow-y-auto bg-gray-50">
      {/* Green header */}
      <div className="bg-sabi-green px-5 pt-14 pb-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-white">My Jobs</h1>
          <div className="w-12 h-12 rounded-full bg-gray-200 border-2 border-white overflow-hidden relative">
            <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white font-bold text-lg">A</div>
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-sabi-green rounded-full border-2 border-white" />
          </div>
        </div>
        <p className="text-white/80 text-sm mb-4">All your bookings, past and present</p>

        {/* Stats row */}
        <div className="flex gap-2">
          <div className="flex items-center gap-2 bg-white/15 rounded-xl px-3 py-2 flex-1">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" stroke="white" strokeWidth="2" fill="none" /></svg>
            </div>
            <div>
              <p className="text-white font-bold text-base">12</p>
              <p className="text-white/70 text-[10px]">Total Jobs</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/15 rounded-xl px-3 py-2 flex-1">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Coins className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-base">₦87k</p>
              <p className="text-white/70 text-[10px]">Total Spent</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/15 rounded-xl px-3 py-2 flex-1">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Star className="w-4 h-4 text-white" fill="white" />
            </div>
            <div>
              <p className="text-white font-bold text-base">4.8</p>
              <p className="text-white/70 text-[10px]">Avg Rating</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 px-5 py-4">
        {['all', 'active', 'completed'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-5 py-2 rounded-full text-sm font-medium capitalize transition-all ${
              filter === f
                ? 'bg-sabi-green text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            {f === 'all' ? 'All' : f === 'active' ? 'Active' : 'Completed'}
          </button>
        ))}
      </div>

      {/* Job cards */}
      <div className="px-5 space-y-3">
        {filteredJobs.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>
    </div>
  );
}

function JobCard({ job }) {
  const statusColors = {
    in_escrow: { bg: 'bg-sabi-green/10', text: 'text-sabi-green', label: 'In Escrow' },
    completed: { bg: 'bg-sabi-green/10', text: 'text-sabi-green', label: 'Completed' },
    cancelled: { bg: 'bg-red-50', text: 'text-red-500', label: 'Cancelled' }
  };

  const status = statusColors[job.status] || statusColors.completed;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 overflow-hidden"
          style={{ background: job.worker_photo ? '#e0e0e0' : (job.avatar_bg || '#7CB342') }}
        >
          {job.worker_photo ? (
            <div className="w-full h-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white font-bold">
              {job.worker_name.charAt(0)}
            </div>
          ) : (
            job.worker_initials || job.worker_name.charAt(0)
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">{job.worker_name}</h3>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${status.bg} ${status.text}`}>
              {status.label}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{job.trade} · {job.area}</p>

          {/* Tags */}
          <div className="flex gap-2 mt-2">
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{job.service}</span>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{job.date}</span>
          </div>

          {/* Amount and rating */}
          <div className="flex items-center justify-between mt-3">
            <p className="text-lg font-bold text-gray-900">₦{job.amount.toLocaleString()}</p>
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500">Your Rating:</span>
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg key={star} width="14" height="14" viewBox="0 0 24 24" fill={star <= job.rating ? '#F9A825' : '#E0E0E0'}>
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                  </svg>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
