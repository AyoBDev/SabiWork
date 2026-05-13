// pwa/src/components/map/LayerToggle.jsx
import { Zap, Briefcase, Flame } from 'lucide-react';
import useAppStore from '../../stores/appStore';

const layers = [
  { id: 'workers', label: 'Worker', Icon: Zap },
  { id: 'jobs', label: 'Job', Icon: Briefcase },
  { id: 'demand', label: 'Demand', Icon: Flame }
];

export default function LayerToggle() {
  const { activeLayer, setActiveLayer } = useAppStore();

  return (
    <div className="absolute top-[88px] left-4 z-30 flex items-center gap-2">
      {layers.map((layer) => {
        const isActive = activeLayer === layer.id;
        return (
          <button
            key={layer.id}
            onClick={() => setActiveLayer(layer.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              isActive
                ? 'bg-sabi-green text-white shadow-md'
                : 'bg-white text-gray-700 shadow-sm border border-gray-100'
            }`}
          >
            <layer.Icon className="w-4 h-4" />
            {layer.label}
          </button>
        );
      })}
    </div>
  );
}
