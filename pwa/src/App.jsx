// pwa/src/App.jsx
import { Routes, Route } from 'react-router-dom';
import MapPage from './pages/MapPage';
import PulsePage from './pages/PulsePage';
import ProfilePage from './pages/ProfilePage';
import BottomNav from './components/ui/BottomNav';

export default function App() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-warm-bg relative">
      <Routes>
        <Route path="/" element={<MapPage />} />
        <Route path="/pulse" element={<PulsePage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
      <BottomNav />
    </div>
  );
}
