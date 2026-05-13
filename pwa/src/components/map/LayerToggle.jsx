// pwa/src/components/map/LayerToggle.jsx
import useAppStore from '../../stores/appStore';

const layers = [
  { id: 'workers', label: 'Worker', emoji: '⚡' },
  { id: 'jobs', label: 'Job', emoji: '💼' },
  { id: 'demand', label: 'Demand', emoji: '🔥' }
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
            <span className="text-base">{layer.emoji}</span>
            {layer.label}
          </button>
        );
      })}
    </div>
  );
}
