// pwa/src/pages/JobsPage.jsx
import { useState, useEffect } from 'react';
import { Briefcase, Coins, Star, Clock, CheckCircle2, Loader2, Search, Plus } from 'lucide-react';
import useAppStore from '../stores/appStore';
import api from '../services/api';

export default function JobsPage() {
  const { user } = useAppStore();
  const isBuyer = user?.role === 'buyer';

  return isBuyer ? <BuyerJobsPage user={user} /> : <WorkerJobsPage user={user} />;
}

// ─── Buyer View: "My Bookings" ────────────────────────────────────────────────
function BuyerJobsPage({ user }) {
  const [filter, setFilter] = useState('all');
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, completed: 0, total_spent: 0, avg_rating: null });
  const [loading, setLoading] = useState(true);
  const [ratingJob, setRatingJob] = useState(null);

  useEffect(() => {
    loadJobs();
  }, []);

  async function loadJobs() {
    try {
      const data = await api.getBuyerJobs(user.id);
      setJobs(data.jobs || []);
      setStats(data.stats || stats);
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setLoading(false);
    }
  }

  const filteredJobs = jobs.filter((job) => {
    if (filter === 'all') return true;
    if (filter === 'active') return ['created', 'in_progress', 'paid', 'in_escrow'].includes(job.status);
    if (filter === 'completed') return ['completed', 'payout_sent'].includes(job.status);
    return true;
  });

  async function handleRate(jobId, rating) {
    try {
      const result = await api.rateJob(jobId, rating);
      // Update local state
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, buyer_rating: rating, status: 'completed' } : j));
      setRatingJob(null);
      // Update user sabi score if returned
      if (result.buyer_sabi_score != null) {
        const stored = JSON.parse(localStorage.getItem('sabiwork_user') || '{}');
        stored.sabi_score = result.buyer_sabi_score;
        localStorage.setItem('sabiwork_user', JSON.stringify(stored));
      }
    } catch (err) {
      console.error('Rating failed:', err);
    }
  }

  return (
    <div className="h-full pb-16 overflow-y-auto bg-gray-50">
      {/* Header */}
      <div className="bg-sabi-green px-5 pt-14 pb-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-white">My Bookings</h1>
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-white font-bold">{(user?.name || 'U').charAt(0)}</span>
          </div>
        </div>
        <p className="text-white/80 text-sm mb-4">Services you've booked</p>

        {/* Stats */}
        <div className="flex gap-2">
          <StatPill icon={<Briefcase className="w-4 h-4 text-white" />} value={stats.total} label="Bookings" />
          <StatPill icon={<Coins className="w-4 h-4 text-white" />} value={`₦${(stats.total_spent || 0).toLocaleString()}`} label="Spent" />
          <StatPill icon={<Star className="w-4 h-4 text-white" fill="white" />} value={stats.avg_rating || '-'} label="Avg Rating" />
        </div>
      </div>

      {/* Filters */}
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
            {f === 'all' ? `All (${stats.total})` : f === 'active' ? `Active (${stats.active})` : `Done (${stats.completed})`}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-sabi-green animate-spin" />
        </div>
      ) : filteredJobs.length === 0 ? (
        <EmptyBookings filter={filter} />
      ) : (
        <div className="px-5 space-y-3 pb-4">
          {filteredJobs.map((job) => (
            <BuyerJobCard
              key={job.id}
              job={job}
              isRating={ratingJob === job.id}
              onStartRate={() => setRatingJob(job.id)}
              onRate={(rating) => handleRate(job.id, rating)}
              onCancelRate={() => setRatingJob(null)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BuyerJobCard({ job, isRating, onStartRate, onRate, onCancelRate }) {
  const [selectedRating, setSelectedRating] = useState(0);
  const statusConfig = {
    created: { bg: 'bg-blue-50', text: 'text-blue-600', label: 'Pending', icon: Clock },
    paid: { bg: 'bg-yellow-50', text: 'text-yellow-600', label: 'Paid', icon: Coins },
    in_escrow: { bg: 'bg-orange-50', text: 'text-orange-600', label: 'In Escrow', icon: Coins },
    in_progress: { bg: 'bg-blue-50', text: 'text-blue-600', label: 'In Progress', icon: Loader2 },
    completed: { bg: 'bg-green-50', text: 'text-green-600', label: 'Completed', icon: CheckCircle2 },
    payout_sent: { bg: 'bg-green-50', text: 'text-green-600', label: 'Completed', icon: CheckCircle2 },
    cancelled: { bg: 'bg-red-50', text: 'text-red-500', label: 'Cancelled', icon: Clock }
  };
  const st = statusConfig[job.status] || statusConfig.created;
  const StatusIcon = st.icon;
  const isComplete = ['completed', 'payout_sent'].includes(job.status);
  const needsRating = isComplete && !job.buyer_rating;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-start gap-3">
        {/* Worker avatar */}
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-sabi-green to-sabi-green-dark flex items-center justify-center text-white font-bold text-sm shrink-0">
          {(job.worker_name || 'W').charAt(0)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900 truncate">{job.worker_name || 'Worker'}</h3>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1 ${st.bg} ${st.text}`}>
              <StatusIcon className="w-3 h-3" />
              {st.label}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{job.worker_trade || job.service_category} · {job.area || 'Lagos'}</p>

          <div className="flex gap-2 mt-2">
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{job.service_category}</span>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
              {new Date(job.created_at).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}
            </span>
          </div>

          <div className="flex items-center justify-between mt-3">
            <p className="text-lg font-bold text-gray-900">₦{(parseFloat(job.agreed_amount) || 0).toLocaleString()}</p>
            {job.buyer_rating ? (
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500">Rated:</span>
                <div className="flex">{renderStars(job.buyer_rating)}</div>
              </div>
            ) : needsRating && !isRating ? (
              <button
                onClick={onStartRate}
                className="text-xs font-medium text-sabi-green bg-sabi-green/10 px-3 py-1.5 rounded-full"
              >
                Rate Worker
              </button>
            ) : null}
          </div>

          {/* Rating UI */}
          {isRating && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-2">How was this service?</p>
              <div className="flex items-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setSelectedRating(star)}
                    className="p-0.5"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill={star <= selectedRating ? '#F9A825' : '#E0E0E0'}>
                      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                    </svg>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => selectedRating > 0 && onRate(selectedRating)}
                  disabled={selectedRating === 0}
                  className="flex-1 py-2 rounded-lg text-sm font-medium bg-sabi-green text-white disabled:opacity-40"
                >
                  Submit Rating
                </button>
                <button onClick={onCancelRate} className="px-3 py-2 rounded-lg text-sm text-gray-500 border border-gray-200">
                  Cancel
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5">Rating improves your Sabi Score</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyBookings({ filter }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-5">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <Search className="w-7 h-7 text-gray-400" />
      </div>
      <h3 className="text-base font-semibold text-gray-900 mb-1">
        {filter === 'active' ? 'No active bookings' : filter === 'completed' ? 'No completed bookings yet' : 'No bookings yet'}
      </h3>
      <p className="text-sm text-gray-500 text-center max-w-xs">
        Use the chat to find and book a worker near you. Each booking improves your Sabi Score!
      </p>
    </div>
  );
}

// ─── Worker View: "My Jobs" ───────────────────────────────────────────────────
function WorkerJobsPage({ user }) {
  const [filter, setFilter] = useState('all');
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, completed: 0, total_earned: 0, avg_rating: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadJobs();
  }, []);

  async function loadJobs() {
    try {
      const data = await api.getWorkerJobs(user.id);
      setJobs(data.jobs || []);
      setStats(data.stats || stats);
    } catch (err) {
      console.error('Failed to load jobs:', err);
    } finally {
      setLoading(false);
    }
  }

  const filteredJobs = jobs.filter((job) => {
    if (filter === 'all') return true;
    if (filter === 'active') return ['created', 'in_progress', 'paid', 'in_escrow'].includes(job.status);
    if (filter === 'completed') return ['completed', 'payout_sent'].includes(job.status);
    return true;
  });

  return (
    <div className="h-full pb-16 overflow-y-auto bg-gray-50">
      {/* Header */}
      <div className="bg-sabi-green px-5 pt-14 pb-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-white">My Jobs</h1>
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-white font-bold">{(user?.name || 'W').charAt(0)}</span>
          </div>
        </div>
        <p className="text-white/80 text-sm mb-4">Jobs assigned to you</p>

        {/* Stats */}
        <div className="flex gap-2">
          <StatPill icon={<Briefcase className="w-4 h-4 text-white" />} value={stats.total} label="Total" />
          <StatPill icon={<Coins className="w-4 h-4 text-white" />} value={`₦${(stats.total_earned || 0).toLocaleString()}`} label="Earned" />
          <StatPill icon={<Star className="w-4 h-4 text-white" fill="white" />} value={stats.avg_rating || '-'} label="Rating" />
        </div>
      </div>

      {/* Filters */}
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
            {f === 'all' ? `All (${stats.total})` : f === 'active' ? `Active (${stats.active})` : `Done (${stats.completed})`}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-sabi-green animate-spin" />
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-5">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Briefcase className="w-7 h-7 text-gray-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">No jobs yet</h3>
          <p className="text-sm text-gray-500 text-center">Set yourself as available so buyers can find you!</p>
        </div>
      ) : (
        <div className="px-5 space-y-3 pb-4">
          {filteredJobs.map((job) => (
            <WorkerJobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}

function WorkerJobCard({ job }) {
  const statusConfig = {
    created: { bg: 'bg-blue-50', text: 'text-blue-600', label: 'New' },
    paid: { bg: 'bg-yellow-50', text: 'text-yellow-600', label: 'Paid' },
    in_escrow: { bg: 'bg-orange-50', text: 'text-orange-600', label: 'In Escrow' },
    in_progress: { bg: 'bg-blue-50', text: 'text-blue-600', label: 'In Progress' },
    completed: { bg: 'bg-green-50', text: 'text-green-600', label: 'Completed' },
    payout_sent: { bg: 'bg-green-50', text: 'text-green-600', label: 'Paid Out' },
    cancelled: { bg: 'bg-red-50', text: 'text-red-500', label: 'Cancelled' }
  };
  const st = statusConfig[job.status] || statusConfig.created;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-gray-900">{job.service_category || 'Service'}</h3>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${st.bg} ${st.text}`}>{st.label}</span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{job.area || 'Lagos'} · {job.description || ''}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
              {new Date(job.created_at).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}
            </span>
            {job.buyer_rating && (
              <div className="flex items-center gap-0.5">
                {renderStars(job.buyer_rating)}
              </div>
            )}
          </div>
        </div>
        <p className="text-lg font-bold text-gray-900">₦{(parseFloat(job.agreed_amount) || parseFloat(job.payout_amount) || 0).toLocaleString()}</p>
      </div>
    </div>
  );
}

// ─── Shared components ────────────────────────────────────────────────────────
function StatPill({ icon, value, label }) {
  return (
    <div className="flex items-center gap-2 bg-white/15 rounded-xl px-3 py-2 flex-1">
      <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="text-white font-bold text-sm">{value}</p>
        <p className="text-white/70 text-[10px]">{label}</p>
      </div>
    </div>
  );
}

function renderStars(rating) {
  return [1, 2, 3, 4, 5].map((star) => (
    <svg key={star} width="12" height="12" viewBox="0 0 24 24" fill={star <= rating ? '#F9A825' : '#E0E0E0'}>
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
    </svg>
  ));
}
