// pwa/src/pages/PulsePage.jsx
import useAppStore from '../stores/appStore';
import WorkerPulse from '../components/pulse/WorkerPulse';
import TraderPulse from '../components/pulse/TraderPulse';
import SeekerPulse from '../components/pulse/SeekerPulse';
import BuyerPulse from '../components/pulse/BuyerPulse';

export default function PulsePage() {
  const { user, agentAction, salesLog } = useAppStore();

  // Show trader view if: user is trader, OR agent is logging a sale, OR sales have been logged this session
  const isSaleContext = agentAction?.type?.includes('sale') || salesLog.length > 0;
  const role = (user?.role === 'trader' || isSaleContext) ? 'trader' : (user?.role || 'worker');

  // Mock user data for demo if no user logged in
  const demoUser = user || {
    role: 'worker',
    name: 'Emeka Okafor',
    sabi_score: 0.76,
    sabi_score: 62,
    total_jobs: 34,
    total_income: 510000,
    service_areas: ['surulere', 'yaba', 'mushin'],
    primary_trade: 'plumbing'
  };

  if (role === 'trader') {
    return (
      <div className="h-full pb-14 overflow-y-auto">
        <TraderPulse user={demoUser} />
      </div>
    );
  }

  return (
    <div className="h-full pb-14 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-warm-bg/95 backdrop-blur-sm z-10 px-4 pt-4 pb-2 border-b border-warm-border">
        <h1 className="text-lg font-bold text-warm-text">Pulse</h1>
        <p className="text-xs text-warm-muted">Your economic dashboard</p>
      </div>

      <div className="p-4">
        {role === 'buyer' && <BuyerPulse user={demoUser} />}
        {role === 'worker' && <WorkerPulse user={demoUser} />}
        {role === 'seeker' && <SeekerPulse user={demoUser} />}
      </div>
    </div>
  );
}
