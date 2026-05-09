// pwa/src/App.jsx
import { Routes, Route } from 'react-router-dom';
import MapPage from './pages/MapPage';
import PulsePage from './pages/PulsePage';
import ProfilePage from './pages/ProfilePage';
import BottomNav from './components/ui/BottomNav';
import ChatSheet from './components/chat/ChatSheet';
import OnboardPage from './components/agent/OnboardPage';
import AgentStats from './components/agent/AgentStats';
import AgentNav from './components/agent/AgentNav';
import useAppStore from './stores/appStore';

export default function App() {
  const { user } = useAppStore();
  const isAgent = user?.role === 'agent';

  return (
    <div className="h-screen w-screen overflow-hidden bg-warm-bg relative">
      <Routes>
        <Route path="/" element={<MapPage />} />
        <Route path="/pulse" element={<PulsePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/onboard" element={<OnboardPage />} />
        <Route path="/stats" element={<AgentStats />} />
      </Routes>
      <ChatSheet />
      {isAgent ? <AgentNav /> : <BottomNav />}
    </div>
  );
}
