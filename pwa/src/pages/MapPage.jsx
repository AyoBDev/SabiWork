// pwa/src/pages/MapPage.jsx
import { useEffect } from 'react';
import MapCanvas from '../components/map/MapCanvas';
import LayerToggle from '../components/map/LayerToggle';
import AIButton from '../components/chat/AIButton';
import useAppStore from '../stores/appStore';
import api from '../services/api';

export default function MapPage() {
  const { setWorkers, setLoading } = useAppStore();

  useEffect(() => {
    async function loadWorkers() {
      setLoading(true);
      try {
        const data = await api.getWorkers({ available: true });
        setWorkers(data.workers || data);
      } catch (err) {
        console.error('Failed to load workers:', err);
      } finally {
        setLoading(false);
      }
    }
    loadWorkers();
  }, []);

  return (
    <div className="absolute inset-0 pb-14">
      <MapCanvas />
      <LayerToggle />
      <AIButton />
    </div>
  );
}
