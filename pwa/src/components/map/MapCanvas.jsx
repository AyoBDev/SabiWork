// pwa/src/components/map/MapCanvas.jsx
import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import useAppStore from '../../stores/appStore';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.placeholder';

const TRADE_STYLES = {
  plumbing: { color: '#4FC3F7', icon: 'wrench' },
  electrical: { color: '#FFB74D', icon: 'zap' },
  carpentry: { color: '#A1887F', icon: 'hammer' },
  cleaning: { color: '#81C784', icon: 'sparkles' },
  tailoring: { color: '#CE93D8', icon: 'scissors' },
  hairdressing: { color: '#F48FB1', icon: 'scissors' },
  painting: { color: '#FFB74D', icon: 'paintbrush' },
  catering: { color: '#FF8A65', icon: 'chef-hat' },
  welding: { color: '#90A4AE', icon: 'cog' },
  tiling: { color: '#4DB6AC', icon: 'grid' }
};

const DEFAULT_STYLE = { color: '#8BC34A', icon: 'user' };

// SVG icon paths for markers (subset of lucide)
const ICON_SVGS = {
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  hammer: '<path d="m15 12-8.5 8.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0a2.12 2.12 0 0 1 0-3L12 9"/><path d="M17.64 15 22 10.64"/><path d="m20.91 11.7-1.25-1.25c-.6-.6-.93-1.4-.93-2.25v-.86L16.01 4.6a5.56 5.56 0 0 0-3.94-1.64H9l.92.82A6.18 6.18 0 0 1 12 8.4v1.56l2 2h2.47l2.26 1.91"/>',
  sparkles: '<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>',
  scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/>',
  paintbrush: '<path d="M18.37 2.63 14 7l-1.59-1.59a2 2 0 0 0-2.82 0L8 7l9 9 1.59-1.59a2 2 0 0 0 0-2.82L17 10l4.37-4.37a2.12 2.12 0 1 0-3-3Z"/><path d="M9 8c-2 3-4 3.5-7 4l8 10c2.5-2.5 3-4.5 4-7Z"/>',
  'chef-hat': '<path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/><line x1="6" y1="17" x2="18" y2="17"/>',
  cog: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'
};

export default function MapCanvas({ onMarkerClick }) {
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
      const iconSvg = ICON_SVGS[style.icon] || ICON_SVGS.user;

      const el = document.createElement('div');
      el.className = 'worker-marker';
      el.style.cssText = `
        width: 44px; height: 44px; border-radius: 50%;
        background: ${style.color};
        display: flex; align-items: center; justify-content: center;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      `;
      el.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconSvg}</svg>`;

      // Online indicator dot
      if (worker.is_available) {
        const dot = document.createElement('span');
        dot.style.cssText = `
          position: absolute; bottom: 0; right: 0;
          width: 12px; height: 12px; border-radius: 50%;
          background: #4CAF50; border: 2px solid white;
        `;
        el.style.position = 'relative';
        el.appendChild(dot);
      }

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onMarkerClick?.(worker);
      });

      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([parseFloat(worker.location_lng), parseFloat(worker.location_lat)])
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
