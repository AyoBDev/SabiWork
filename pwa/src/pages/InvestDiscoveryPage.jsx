import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Users, Loader2, PiggyBank } from 'lucide-react';
import api from '../services/api';
import useAppStore from '../stores/appStore';

export default function InvestDiscoveryPage() {
  const navigate = useNavigate();
  const { user } = useAppStore();
  const [filter, setFilter] = useState('all');
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRounds();
  }, []);

  async function loadRounds() {
    try {
      setLoading(true);
      const data = await api.getOpenRounds();
      setRounds(data.rounds || []);
    } catch (err) {
      console.error('Failed to load rounds:', err);
    } finally {
      setLoading(false);
    }
  }

  const filteredRounds = rounds.filter((round) => {
    if (filter === 'all') return true;
    if (filter === 'high_score') return round.sabiScore >= 50;
    if (filter === 'almost_funded') {
      const percent = (round.raisedAmount / round.targetAmount) * 100;
      return percent >= 70;
    }
    return true;
  });

  const getSabiScoreTier = (score) => {
    if (score >= 70) return { color: 'bg-yellow-500', label: 'Full Suite' };
    if (score >= 50) return { color: 'bg-blue-500', label: 'Microloan' };
    if (score >= 30) return { color: 'bg-green-500', label: 'Savings' };
    return { color: 'bg-gray-400', label: 'Building' };
  };

  return (
    <div className="h-full pb-16 overflow-y-auto bg-gray-50">
      {/* Header */}
      <div className="bg-sabi-green px-5 pt-14 pb-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-white">Invest & Earn</h1>
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
        </div>
        <p className="text-white/80 text-sm">Fund verified traders, earn returns</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 px-5 py-4 overflow-x-auto">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
            filter === 'all'
              ? 'bg-sabi-green text-white shadow-sm'
              : 'bg-white text-gray-600 border border-gray-200'
          }`}
        >
          All Open
        </button>
        <button
          onClick={() => setFilter('high_score')}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
            filter === 'high_score'
              ? 'bg-sabi-green text-white shadow-sm'
              : 'bg-white text-gray-600 border border-gray-200'
          }`}
        >
          High Score (50+)
        </button>
        <button
          onClick={() => setFilter('almost_funded')}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
            filter === 'almost_funded'
              ? 'bg-sabi-green text-white shadow-sm'
              : 'bg-white text-gray-600 border border-gray-200'
          }`}
        >
          Almost Funded
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-sabi-green animate-spin" />
        </div>
      ) : filteredRounds.length === 0 ? (
        <EmptyRounds filter={filter} />
      ) : (
        <div className="px-5 space-y-3 pb-4">
          {filteredRounds.map((round) => {
            const progressPercent = (round.raisedAmount / round.targetAmount) * 100;
            const tier = getSabiScoreTier(round.sabiScore);

            return (
              <div
                key={round.id}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-gray-900">
                      {round.traderName}
                    </h3>
                    <p className="text-sm text-gray-500 mt-0.5 capitalize">
                      {(round.businessType || '').replace('_', ' ')}
                    </p>
                  </div>
                  <div
                    className={`${tier.color} text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1`}
                  >
                    {round.sabiScore}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-600 mb-1.5">
                    <span>Raised</span>
                    <span className="font-semibold">
                      ₦{((round.raisedAmount || 0) / 100).toLocaleString()} / ₦
                      {((round.targetAmount || 0) / 100).toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-sabi-green h-2.5 rounded-full transition-all"
                      style={{ width: `${Math.min(progressPercent, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <div>
                      <p className="text-xs text-gray-500">Interest Rate</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {round.interestRate}%
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <div>
                      <p className="text-xs text-gray-500">Repayment</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {round.repaymentSplit}
                      </p>
                    </div>
                  </div>
                </div>

                {/* View Details button */}
                <button
                  onClick={() => navigate(`/invest/${round.id}`)}
                  className="w-full bg-sabi-green text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-sabi-green-dark transition-colors"
                >
                  View Details
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyRounds({ filter }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-5">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <PiggyBank className="w-7 h-7 text-gray-400" />
      </div>
      <h3 className="text-base font-semibold text-gray-900 mb-1">
        {filter === 'high_score'
          ? 'No high-score rounds available'
          : filter === 'almost_funded'
          ? 'No rounds almost funded'
          : 'No open rounds'}
      </h3>
      <p className="text-sm text-gray-500 text-center max-w-xs">
        {filter === 'all'
          ? 'No investment rounds are currently accepting investors. Check back soon!'
          : 'Try viewing all open rounds to see available opportunities.'}
      </p>
    </div>
  );
}
