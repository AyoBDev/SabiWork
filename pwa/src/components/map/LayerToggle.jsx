// pwa/src/components/map/LayerToggle.jsx
import useAppStore from '../../stores/appStore';

const layers = [
  { id: 'workers', label: 'Workers' },
  { id: 'demand', label: 'Demand' },
  { id: 'gaps', label: 'Gaps' }
];

export default function LayerToggle() {
  const { activeLayer, setActiveLayer } = useAppStore();

  return (
    <div className="absolute top-4 left-4 z-30 flex gap-1.5">
      {layers.map((layer) => (
        <button
          key={layer.id}
          onClick={() => setActiveLayer(layer.id)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium shadow-md transition-all ${
            activeLayer === layer.id
              ? 'bg-sabi-green text-white'
              : 'bg-white text-warm-muted border border-warm-border'
          }`}
        >
          {layer.label}
        </button>
      ))}
    </div>
  );
}
