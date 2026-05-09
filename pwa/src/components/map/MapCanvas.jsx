// pwa/src/components/map/MapCanvas.jsx
import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import useAppStore from '../../stores/appStore';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

const TRUST_COLORS = {
  emerging: '#4CAF50',   // green
  trusted: '#1B7A3D',    // dark green
  verified: '#1976D2',   // blue
  elite: '#F9A825'       // gold
};

function getTrustTier(score) {
  if (score >= 0.8) return 'elite';
  if (score >= 0.6) return 'verified';
  if (score >= 0.3) return 'trusted';
  return 'emerging';
}

export default function MapCanvas() {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const { workers, mapCenter, mapZoom, setMapView } = useAppStore();

  // Initialize map once
  useEffect(() => {
    if (mapRef.current || !mapContainer.current) return;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: mapCenter,
      zoom: mapZoom,
      attributionControl: false,
      logoPosition: 'top-left'
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.addControl(
      new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true } }),
      'top-right'
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

      const tier = getTrustTier(worker.trust_score);
      const color = TRUST_COLORS[tier];

      const el = document.createElement('div');
      el.className = 'worker-marker';
      el.style.cssText = `
        width: 32px; height: 32px; border-radius: 50%;
        background: ${color}; border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        cursor: pointer; transition: transform 0.2s;
        display: flex; align-items: center; justify-content: center;
      `;
      el.innerHTML = `<span style="color:white;font-size:12px;font-weight:bold;">${worker.name.charAt(0)}</span>`;
      el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.3)'; });
      el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; });

      const popup = new mapboxgl.Popup({ offset: 20, closeButton: false }).setHTML(`
        <div style="padding:4px 8px;">
          <strong>${worker.name}</strong><br/>
          <span style="color:${color};font-size:12px;">● ${tier}</span> · ${worker.primary_trade}<br/>
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
