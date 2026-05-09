// dashboard/src/components/LiveMap.jsx
'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

export default function LiveMap({ events }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [3.3792, 6.5244], // Lagos
      zoom: 11.5,
      attributionControl: false
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Pulse effect on new events
  useEffect(() => {
    if (!mapRef.current || !events || events.length === 0) return;

    const latest = events[events.length - 1];
    if (!latest?.location_lat || !latest?.location_lng) return;

    // Create pulse marker
    const el = document.createElement('div');
    el.className = 'event-pulse';
    el.style.cssText = `
      width: 20px; height: 20px; border-radius: 50%;
      background: ${getEventColor(latest.event_type)};
      opacity: 0.8;
    `;

    const marker = new mapboxgl.Marker({ element: el })
      .setLngLat([latest.location_lng, latest.location_lat])
      .addTo(mapRef.current);

    // Remove after animation
    setTimeout(() => marker.remove(), 3000);
  }, [events]);

  return (
    <div ref={containerRef} className="w-full h-full rounded-xl overflow-hidden" />
  );
}

function getEventColor(type) {
  switch (type) {
    case 'payment_received': return '#F9A825';
    case 'payout_sent': return '#1B7A3D';
    case 'worker_onboarded': return '#1976D2';
    case 'sale_logged': return '#E8630A';
    default: return '#AAAAAA';
  }
}
