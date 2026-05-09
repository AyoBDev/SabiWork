// pwa/src/components/agent/AgentNav.jsx
import { useLocation, useNavigate } from 'react-router-dom';

const tabs = [
  { path: '/', label: 'Map', icon: '🗺️' },
  { path: '/onboard', label: 'Onboard', icon: '➕' },
  { path: '/stats', label: 'Stats', icon: '📊' }
];

export default function AgentNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-warm-border">
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center w-full h-full min-w-[48px] min-h-[48px] transition-colors ${
                active ? 'text-work-orange' : 'text-warm-muted'
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span className="text-[10px] mt-0.5 font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
