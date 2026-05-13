// pwa/src/components/map/MapCanvas.jsx
import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import useAppStore from '../../stores/appStore';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.placeholder';

const TRADE_STYLES = {
  plumbing: { color: '#4FC3F7', icon: '🔧' },
  electrical: { color: '#FFB74D', icon: '⚡' },
  carpentry: { color: '#A1887F', icon: '🪚' },
  cleaning: { color: '#81C784', icon: '🧹' },
  tailoring: { color: '#CE93D8', icon: '✂️' },
  hairdressing: { color: '#F48FB1', icon: '💇' },
  painting: { color: '#FFB74D', icon: '🎨' },
  catering: { color: '#FF8A65', icon: '👨‍🍳' },
  welding: { color: '#90A4AE', icon: '⚙️' },
  tiling: { color: '#4DB6AC', icon: '🧱' }
};

const DEFAULT_STYLE = { color: '#8BC34A', icon: '👷' };

export default function MapCanvas() {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const { workers, mapCenter, mapZoom, setMapView } = useAppStore();

  // Initialize map once
  useEffect(() => {
    if (mapRef.current || !mapContainer.current) return;
    if (!import.meta.env.VITE_MAPBOX_TOKEN) {
      console.warn('[Map] No VITE_MAPBOX_TOKEN set, skipping map init');
      return;
    }

    let map;
    try {
      map = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: mapCenter,
        zoom: mapZoom,
        attributionControl: false,
        logoPosition: 'top-left'
      });
    } catch (err) {
      console.error('[Map] Failed to initialize:', err.message);
      return;
    }

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');
    map.addControl(
      new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }),
      'bottom-right'
    );

    map.on('moveend', () => {
      const center = map.getCenter();
      setMapView([center.lng, center.lat], map.getZoom());
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers when workers change
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    workers.forEach((worker) => {
      if (!worker.location_lat || !worker.location_lng) return;

      const style = TRADE_STYLES[worker.primary_trade] || DEFAULT_STYLE;

      const el = document.createElement('div');
      el.className = 'worker-marker';
      el.style.cssText = `
        width: 44px; height: 44px; border-radius: 50%;
        background: ${style.color};
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; transition: transform 0.2s;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        position: relative;
      `;
      el.innerHTML = `<span style="font-size:20px;">${style.icon}</span>`;

      // Online indicator dot
      if (worker.is_available) {
        const dot = document.createElement('span');
        dot.style.cssText = `
          position: absolute; bottom: 0; right: 0;
          width: 12px; height: 12px; border-radius: 50%;
          background: #4CAF50; border: 2px solid white;
        `;
        el.appendChild(dot);
      }

      el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.2)'; });
      el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; });

      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false, className: 'sw-popup' }).setHTML(`
        <div style="padding:8px 12px; font-family: -apple-system, system-ui, sans-serif;">
          <strong style="font-size:14px;">${worker.name}</strong><br/>
          <span style="color:${style.color};font-size:12px;">${style.icon} ${worker.primary_trade}</span><br/>
          <span style="font-size:11px;color:#666;">${worker.total_jobs} jobs · ₦${(worker.total_income / 1000).toFixed(0)}k earned</span>
        </div>
      `);

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([worker.location_lng, worker.location_lat])
        .setPopup(popup)
        .addTo(mapRef.current);

      markersRef.current.push(marker);
    });
  }, [workers]);

  return (
    <div
      ref={mapContainer}
      className="absolute inset-0"
      style={{ width: '100%', height: '100%' }}
    />
  );
}
