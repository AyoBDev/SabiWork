// pwa/src/App.jsx
import { Routes, Route } from 'react-router-dom';
import MapPage from './pages/MapPage';
import JobsPage from './pages/JobsPage';
import WalletPage from './pages/WalletPage';
import ProfilePage from './pages/ProfilePage';
import PulsePage from './pages/PulsePage';
import LocationCapture from './pages/LocationCapture';
import InvestPage from './pages/InvestPage';
import BottomNav from './components/ui/BottomNav';
import ChatSheet from './components/chat/ChatSheet';
import AIButton from './components/chat/AIButton';
import OnboardPage from './components/agent/OnboardPage';
import AgentStats from './components/agent/AgentStats';
import AgentNav from './components/agent/AgentNav';
import useAppStore from './stores/appStore';

export default function App() {
  const { user } = useAppStore();
  const isAgent = user?.role === 'agent';

  return (
    <div className="h-screen w-screen overflow-hidden bg-white relative">
      <Routes>
        <Route path="/" element={<MapPage />} />
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/wallet" element={<WalletPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/pulse" element={<PulsePage />} />
        <Route path="/onboard" element={<OnboardPage />} />
        <Route path="/join/:phone" element={<LocationCapture />} />
        <Route path="/stats" element={<AgentStats />} />
        <Route path="/invest/:roundId" element={<InvestPage />} />
      </Routes>
      <ChatSheet />
      <AIButton />
      {isAgent ? <AgentNav /> : <BottomNav />}
    </div>
  );
}
