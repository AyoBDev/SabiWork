// dashboard/src/components/LiveMap.jsx
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Flame } from 'lucide-react';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

// Lagos area coordinates for demo events
const AREA_COORDS = {
  'Ikeja': [3.3515, 6.6018],
  'Lekki': [3.4741, 6.4474],
  'Surulere': [3.3569, 6.5059],
  'Oshodi': [3.3411, 6.5569],
  'Mile 12': [3.3897, 6.5879],
  'Trade Fair': [3.2631, 6.4631],
  'Balogun': [3.3888, 6.4531],
  'Lagos': [3.3792, 6.5244],
  'Yaba': [3.3752, 6.5107],
  'Victoria Island': [3.4226, 6.4281],
  'Ajah': [3.5852, 6.4677],
  'Ikorodu': [3.5105, 6.6194]
};

// Map persona names to areas for arc resolution
const PERSONA_AREA_MAP = {
  'Mama Chioma': 'Balogun',
  'Emeka': 'Oshodi',
  'Adamu': 'Ikeja',
  'Blessing': 'Lekki',
  'Kunle': 'Victoria Island',
  'Fatima': 'Mile 12'
};

export default function LiveMap({ events }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const heatCoordsRef = useRef([]);
  const arcsRef = useRef([]);
  const arcIdRef = useRef(0);
  const [heatmapOn, setHeatmapOn] = useState(false);

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [3.3792, 6.5244],
      zoom: 11,
      attributionControl: false,
      interactive: true
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

    map.on('load', () => {
      map.addSource('heatmap-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      map.addLayer({
        id: 'heatmap-layer',
        type: 'heatmap',
        source: 'heatmap-source',
        paint: {
          'heatmap-weight': 1,
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 9, 1, 13, 3],
          'heatmap-color': [
            'interpolate', ['linear'], ['heatmap-density'],
            0, 'rgba(0,0,0,0)',
            0.2, 'rgba(103,169,207,0.4)',
            0.4, 'rgba(209,229,143,0.5)',
            0.6, 'rgba(253,219,69,0.6)',
            0.8, 'rgba(239,138,44,0.7)',
            1, 'rgba(234,51,36,0.8)'
          ],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 9, 20, 13, 40],
          'heatmap-opacity': 0
        }
      });

      // Arc animation source and layer
      map.addSource('arcs-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      map.addLayer({
        id: 'arcs-layer',
        type: 'line',
        source: 'arcs-source',
        paint: {
          'line-color': ['coalesce', ['get', 'color'], '#F9A825'],
          'line-width': 2,
          'line-opacity': ['coalesce', ['get', 'opacity'], 1]
        },
        layout: {
          'line-cap': 'round',
          'line-join': 'round'
        }
      });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Toggle heatmap visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    if (!map.getLayer('heatmap-layer')) return;

    map.setPaintProperty('heatmap-layer', 'heatmap-opacity', heatmapOn ? 0.8 : 0);

    // Toggle markers visibility
    markersRef.current.forEach(m => {
      m.getElement().style.display = heatmapOn ? 'none' : 'block';
    });
  }, [heatmapOn]);

  // Add markers + heatmap data for new events
  useEffect(() => {
    if (!mapRef.current || !events || events.length === 0) return;

    const latest = events[events.length - 1];
    const coords = getCoords(latest);
    if (!coords) return;

    // Update heatmap source
    heatCoordsRef.current.push(coords);
    if (heatCoordsRef.current.length > 200) {
      heatCoordsRef.current = heatCoordsRef.current.slice(-200);
    }

    const map = mapRef.current;
    if (map.isStyleLoaded() && map.getSource('heatmap-source')) {
      map.getSource('heatmap-source').setData({
        type: 'FeatureCollection',
        features: heatCoordsRef.current.map(c => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: c }
        }))
      });
    }

    // Create animated marker
    const el = document.createElement('div');
    el.className = 'ping-marker';
    el.style.background = getEventColor(latest.event_type);
    if (heatmapOn) el.style.display = 'none';

    const marker = new mapboxgl.Marker({ element: el })
      .setLngLat(coords)
      .addTo(map);

    markersRef.current.push(marker);

    // Keep max 30 markers
    if (markersRef.current.length > 30) {
      const old = markersRef.current.shift();
      old.remove();
    }

    // Arc animation for payment events
    if (latest.event_type === 'payment_received' || latest.event_type === 'payout_sent') {
      const arcCoords = resolveArcEndpoints(latest);
      if (arcCoords) {
        const { source: srcCoord, dest: destCoord } = arcCoords;
        const arcLine = generateArc(srcCoord, destCoord);
        const arcId = ++arcIdRef.current;
        const color = latest.event_type === 'payment_received' ? '#F9A825' : '#1B7A3D';

        const feature = {
          type: 'Feature',
          properties: { id: arcId, opacity: 1, color },
          geometry: { type: 'LineString', coordinates: arcLine }
        };

        arcsRef.current.push(feature);
        updateArcsSource(map, arcsRef.current);

        // Fade out and remove after 3 seconds
        const fadeStart = Date.now();
        const fadeDuration = 3000;
        const fadeInterval = setInterval(() => {
          const elapsed = Date.now() - fadeStart;
          const progress = Math.min(elapsed / fadeDuration, 1);
          const opacity = 1 - progress;

          const arc = arcsRef.current.find(f => f.properties.id === arcId);
          if (arc) {
            arc.properties.opacity = opacity;
            updateArcsSource(map, arcsRef.current);
          }

          if (progress >= 1) {
            clearInterval(fadeInterval);
            arcsRef.current = arcsRef.current.filter(f => f.properties.id !== arcId);
            updateArcsSource(map, arcsRef.current);
          }
        }, 50);
      }
    }
  }, [events, heatmapOn]);

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />
      <button
        onClick={() => setHeatmapOn(prev => !prev)}
        className={`absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
          heatmapOn
            ? 'bg-orange-500/90 text-white shadow-lg shadow-orange-500/20'
            : 'bg-background/80 text-muted-foreground border border-border/50 hover:bg-background'
        }`}
      >
        <Flame className="w-3.5 h-3.5" />
        Heatmap
      </button>
    </div>
  );
}

function getCoords(event) {
  // Try explicit coordinates
  if (event.location_lat && event.location_lng) {
    return [event.location_lng, event.location_lat];
  }
  if (event.metadata?.location_lat && event.metadata?.location_lng) {
    return [event.metadata.location_lng, event.metadata.location_lat];
  }

  // Resolve from area name
  const area = event.metadata?.area || event.area;
  if (area && AREA_COORDS[area]) {
    // Add slight randomness so markers don't stack
    const [lng, lat] = AREA_COORDS[area];
    return [lng + (Math.random() - 0.5) * 0.01, lat + (Math.random() - 0.5) * 0.01];
  }

  // Random Lagos location as fallback
  return [3.3792 + (Math.random() - 0.5) * 0.08, 6.5244 + (Math.random() - 0.5) * 0.06];
}

function getEventColor(type) {
  switch (type) {
    case 'payment_received': return '#F9A825';
    case 'payout_sent': return '#1B7A3D';
    case 'worker_onboarded': return '#3B82F6';
    case 'sale_logged': return '#E8630A';
    case 'job_matched': return '#8B5CF6';
    case 'job_completed': return '#22C55E';
    case 'score_updated': return '#06B6D4';
    case 'message_parsed': return '#EC4899';
    default: return '#22C55E';
  }
}

// Resolve the area name for a persona
function resolvePersonaArea(name) {
  if (!name) return null;
  const area = PERSONA_AREA_MAP[name];
  return area || null;
}

// Get coordinates for an area name
function getCoordsForArea(area) {
  if (!area || !AREA_COORDS[area]) return null;
  return AREA_COORDS[area];
}

// Determine source and destination coordinates from a payment event
function resolveArcEndpoints(event) {
  const meta = event.metadata || {};

  // Try explicit from/to fields
  let fromArea = meta.from || null;
  let toArea = meta.to || null;

  // If from/to are persona names, resolve to areas
  if (fromArea && !AREA_COORDS[fromArea]) {
    fromArea = resolvePersonaArea(fromArea) || fromArea;
  }
  if (toArea && !AREA_COORDS[toArea]) {
    toArea = resolvePersonaArea(toArea) || toArea;
  }

  // Fallback: use area + persona names to infer endpoints
  if (!fromArea || !toArea) {
    const eventArea = meta.area || event.area;
    const persona = meta.trader_name || meta.worker_name || meta.supplier_name;
    const personaArea = resolvePersonaArea(persona);

    if (eventArea && personaArea && eventArea !== personaArea) {
      if (!fromArea) fromArea = eventArea;
      if (!toArea) toArea = personaArea;
    }
  }

  const sourceCoords = getCoordsForArea(fromArea);
  const destCoords = getCoordsForArea(toArea);

  if (!sourceCoords || !destCoords) return null;
  // Don't draw arcs to the same point
  if (fromArea === toArea) return null;

  return { source: sourceCoords, dest: destCoords };
}

// Generate a curved arc (bezier-like) between two points
function generateArc(source, dest, numPoints = 30) {
  const [lng1, lat1] = source;
  const [lng2, lat2] = dest;

  // Calculate midpoint
  const midLng = (lng1 + lng2) / 2;
  const midLat = (lat1 + lat2) / 2;

  // Calculate perpendicular offset for the curve
  const dx = lng2 - lng1;
  const dy = lat2 - lat1;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Offset perpendicular to the line (bow outward)
  const offsetMagnitude = dist * 0.3;
  const perpLng = midLng + (-dy / dist) * offsetMagnitude;
  const perpLat = midLat + (dx / dist) * offsetMagnitude;

  // Generate points along a quadratic bezier curve
  const points = [];
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const invT = 1 - t;

    // Quadratic bezier: B(t) = (1-t)^2*P0 + 2(1-t)t*P1 + t^2*P2
    const lng = invT * invT * lng1 + 2 * invT * t * perpLng + t * t * lng2;
    const lat = invT * invT * lat1 + 2 * invT * t * perpLat + t * t * lat2;

    points.push([lng, lat]);
  }

  return points;
}

// Update the arcs GeoJSON source on the map
function updateArcsSource(map, arcs) {
  if (!map || !map.isStyleLoaded() || !map.getSource('arcs-source')) return;

  map.getSource('arcs-source').setData({
    type: 'FeatureCollection',
    features: arcs.map(f => ({
      ...f,
      properties: { ...f.properties }
    }))
  });
}
