// pwa/src/App.jsx
import { useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import MapPage from './pages/MapPage';
import JobsPage from './pages/JobsPage';
import WalletPage from './pages/WalletPage';
import ProfilePage from './pages/ProfilePage';
import PulsePage from './pages/PulsePage';
import LocationCapture from './pages/LocationCapture';
import InvestPage from './pages/InvestPage';
import InvestDiscoveryPage from './pages/InvestDiscoveryPage';
import CreateRoundPage from './pages/CreateRoundPage';
import PublicProfilePage from './pages/PublicProfilePage';
import AuthPage from './pages/AuthPage';
import BottomNav from './components/ui/BottomNav';
import ChatSheet from './components/chat/ChatSheet';
import AIButton from './components/chat/AIButton';
import AgentOverlay from './components/chat/AgentOverlay';
import OnboardPage from './components/agent/OnboardPage';
import AgentStats from './components/agent/AgentStats';
import AgentNav from './components/agent/AgentNav';
import useAppStore from './stores/appStore';

function NavigationListener() {
  const navigate = useNavigate();
  const pendingNavigation = useAppStore((s) => s.pendingNavigation);
  const clearPendingNavigation = useAppStore((s) => s.clearPendingNavigation);

  useEffect(() => {
    if (pendingNavigation) {
      navigate(pendingNavigation);
      clearPendingNavigation();
    }
  }, [pendingNavigation, navigate, clearPendingNavigation]);

  return null;
}

export default function App() {
  const { user } = useAppStore();
  const isAgent = user?.role === 'agent';

  // Public routes (no auth required)
  // LocationCapture and PublicProfile are accessed via shared links — must remain public
  if (!user) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-white relative">
        <Routes>
          <Route path="/join/:phone" element={<LocationCapture />} />
          <Route path="/p/:userId" element={<PublicProfilePage />} />
          <Route path="*" element={<AuthPage />} />
        </Routes>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-white relative">
      <Routes>
        <Route path="/" element={<MapPage />} />
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/wallet" element={<WalletPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/pulse" element={<PulsePage />} />
        <Route path="/invest" element={<InvestDiscoveryPage />} />
        <Route path="/invest/create" element={<CreateRoundPage />} />
        <Route path="/invest/:roundId" element={<InvestPage />} />
        <Route path="/p/:userId" element={<PublicProfilePage />} />
        <Route path="/onboard" element={<OnboardPage />} />
        <Route path="/join/:phone" element={<LocationCapture />} />
        <Route path="/stats" element={<AgentStats />} />
      </Routes>
      <NavigationListener />
      <AgentOverlay />
      <ChatSheet />
      <AIButton />
      {isAgent ? <AgentNav /> : <BottomNav />}
    </div>
  );
}
