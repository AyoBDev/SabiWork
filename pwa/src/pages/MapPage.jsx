// pwa/src/pages/MapPage.jsx
import { useEffect, useState } from 'react';
import MapCanvas from '../components/map/MapCanvas';
import LayerToggle from '../components/map/LayerToggle';
import LocationBar from '../components/map/LocationBar';
import WorkerSheet from '../components/map/WorkerSheet';
import useAppStore from '../stores/appStore';
import api from '../services/api';

export default function MapPage() {
  const { setWorkers, setLoading, setChatOpen, agentSelectedWorker, setAgentSelectedWorker } = useAppStore();
  const [selectedWorker, setSelectedWorker] = useState(null);

  const workers = useAppStore((s) => s.workers);

  useEffect(() => {
    if (workers.length > 0) return;
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

  // Listen for agent-selected worker
  useEffect(() => {
    if (agentSelectedWorker) {
      setSelectedWorker(agentSelectedWorker);
      setAgentSelectedWorker(null);
    }
  }, [agentSelectedWorker]);

  function handleBook(worker) {
    setSelectedWorker(null);
    setChatOpen(true);
  }

  return (
    <div className="absolute inset-0 pb-16">
      <MapCanvas onMarkerClick={setSelectedWorker} />
      <LocationBar />
      <LayerToggle />
      {selectedWorker && (
        <WorkerSheet
          worker={selectedWorker}
          onClose={() => setSelectedWorker(null)}
          onBook={handleBook}
        />
      )}
    </div>
  );
}
