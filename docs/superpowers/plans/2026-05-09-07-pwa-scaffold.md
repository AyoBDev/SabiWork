# Plan 7: PWA Scaffold (Vite + React + Mapbox + Service Worker)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the PWA with Vite + React 19, configure Mapbox GL JS with a custom warm-light style, implement the 3-tab navigation (Map/Pulse/Profile), Zustand store, API service layer, service worker for offline, and PWA manifest. By the end, `npm run dev` shows a full-bleed map of Lagos with worker markers from the seeded backend.

**Architecture:** Map-first design — MapPage is the default route and the map canvas never unmounts (stays mounted across tab switches via CSS visibility). Three bottom-nav tabs. Zustand manages global state. Service worker caches map tiles and API responses for offline resilience.

**Tech Stack:** React 19, Vite 6, Mapbox GL JS v3, Zustand, Tailwind CSS v4, vite-plugin-pwa

**Depends on:** Plan 1 (backend running with seeded data)

---

## File Structure

```
pwa/
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── package.json
├── Dockerfile
├── public/
│   ├── manifest.json
│   ├── icon-192.png
│   ├── icon-512.png
│   └── favicon.ico
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── index.css
│   ├── pages/
│   │   ├── MapPage.jsx
│   │   ├── PulsePage.jsx
│   │   └── ProfilePage.jsx
│   ├── components/
│   │   ├── map/
│   │   │   ├── MapCanvas.jsx
│   │   │   └── LayerToggle.jsx
│   │   └── ui/
│   │       └── BottomNav.jsx
│   ├── stores/
│   │   └── appStore.js
│   └── services/
│       └── api.js
```

---

### Task 1: Initialize Vite + React Project

**Files:**
- Create: `pwa/package.json`
- Create: `pwa/vite.config.js`
- Create: `pwa/index.html`
- Create: `pwa/tailwind.config.js`
- Create: `pwa/postcss.config.js`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "sabiwork-pwa",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "mapbox-gl": "^3.4.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.1.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^4.0.0",
    "vite": "^6.0.0",
    "vite-plugin-pwa": "^0.21.0"
  }
}
```

- [ ] **Step 2: Create vite.config.js**

```javascript
// pwa/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'SabiWork',
        short_name: 'SabiWork',
        description: 'AI-powered economic intelligence for informal workers',
        theme_color: '#1B7A3D',
        background_color: '#FAFAF8',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.mapbox\.com/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mapbox-tiles',
              expiration: { maxEntries: 500, maxAgeSeconds: 7 * 24 * 60 * 60 }
            }
          },
          {
            urlPattern: /\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 5 * 60 }
            }
          }
        ]
      }
    })
  ],
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
});
```

- [ ] **Step 3: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <meta name="theme-color" content="#1B7A3D" />
  <meta name="description" content="SabiWork - AI-powered economic intelligence" />
  <link rel="icon" href="/favicon.ico" />
  <link rel="apple-touch-icon" href="/icon-192.png" />
  <link href="https://api.mapbox.com/mapbox-gl-js/v3.4.0/mapbox-gl.css" rel="stylesheet" />
  <title>SabiWork</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
```

- [ ] **Step 4: Create tailwind.config.js**

```javascript
// pwa/tailwind.config.js
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'sabi-green': '#1B7A3D',
        'sabi-green-light': '#2DA055',
        'work-orange': '#E8630A',
        'work-orange-light': '#FF8534',
        'cash-gold': '#F9A825',
        'alert-red': '#D32F2F',
        'warm-bg': '#FAFAF8',
        'warm-surface': '#FFFFFF',
        'warm-border': '#E8E4DF',
        'warm-text': '#1A1A1A',
        'warm-muted': '#6B6B6B'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
};
```

- [ ] **Step 5: Create postcss.config.js**

```javascript
// pwa/postcss.config.js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
};
```

- [ ] **Step 6: Install dependencies**

Run: `cd pwa && npm install`

Expected: Dependencies installed, node_modules created, no errors.

- [ ] **Step 7: Commit**

```bash
git add pwa/package.json pwa/vite.config.js pwa/index.html pwa/tailwind.config.js pwa/postcss.config.js pwa/package-lock.json
git commit -m "feat: initialize PWA with Vite, React, Mapbox, Tailwind, PWA plugin"
```

---

### Task 2: App Shell (Entry, Router, CSS, Store)

**Files:**
- Create: `pwa/src/main.jsx`
- Create: `pwa/src/App.jsx`
- Create: `pwa/src/index.css`
- Create: `pwa/src/stores/appStore.js`

- [ ] **Step 1: Create main.jsx**

```jsx
// pwa/src/main.jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
```

- [ ] **Step 2: Create App.jsx with routing**

```jsx
// pwa/src/App.jsx
import { Routes, Route } from 'react-router-dom';
import MapPage from './pages/MapPage';
import PulsePage from './pages/PulsePage';
import ProfilePage from './pages/ProfilePage';
import BottomNav from './components/ui/BottomNav';

export default function App() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-warm-bg relative">
      <Routes>
        <Route path="/" element={<MapPage />} />
        <Route path="/pulse" element={<PulsePage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
      <BottomNav />
    </div>
  );
}
```

- [ ] **Step 3: Create index.css**

```css
/* pwa/src/index.css */
@import "tailwindcss";

@layer base {
  * {
    -webkit-tap-highlight-color: transparent;
  }

  body {
    @apply bg-warm-bg text-warm-text font-sans m-0 p-0;
    overscroll-behavior: none;
    -webkit-font-smoothing: antialiased;
  }

  #root {
    height: 100dvh;
    width: 100vw;
  }
}

/* Mapbox overrides */
.mapboxgl-ctrl-bottom-left,
.mapboxgl-ctrl-bottom-right {
  display: none !important;
}

.mapboxgl-canvas {
  outline: none;
}
```

- [ ] **Step 4: Create Zustand store**

```javascript
// pwa/src/stores/appStore.js
import { create } from 'zustand';

const useAppStore = create((set, get) => ({
  // User state
  user: null,
  setUser: (user) => set({ user }),

  // Workers on map
  workers: [],
  setWorkers: (workers) => set({ workers }),

  // Map state
  mapCenter: [3.3792, 6.5244], // Lagos [lng, lat]
  mapZoom: 12,
  setMapView: (center, zoom) => set({ mapCenter: center, mapZoom: zoom }),
  activeLayer: 'workers', // 'workers' | 'demand' | 'gaps'
  setActiveLayer: (layer) => set({ activeLayer: layer }),

  // Chat state
  chatOpen: false,
  setChatOpen: (open) => set({ chatOpen: open }),
  messages: [],
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  clearMessages: () => set({ messages: [] }),

  // Active job tracking
  activeJob: null,
  setActiveJob: (job) => set({ activeJob: job }),

  // Loading states
  loading: false,
  setLoading: (loading) => set({ loading })
}));

export default useAppStore;
```

- [ ] **Step 5: Commit**

```bash
git add pwa/src/main.jsx pwa/src/App.jsx pwa/src/index.css pwa/src/stores/appStore.js
git commit -m "feat: add app shell with routing, Zustand store, base CSS"
```

---

### Task 3: Bottom Navigation

**Files:**
- Create: `pwa/src/components/ui/BottomNav.jsx`

- [ ] **Step 1: Create BottomNav component**

```jsx
// pwa/src/components/ui/BottomNav.jsx
import { useLocation, useNavigate } from 'react-router-dom';

const tabs = [
  { path: '/', label: 'Map', icon: MapIcon },
  { path: '/pulse', label: 'Pulse', icon: PulseIcon },
  { path: '/profile', label: 'Profile', icon: ProfileIcon }
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-warm-border safe-area-pb">
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center w-full h-full min-w-[48px] min-h-[48px] transition-colors ${
                active ? 'text-sabi-green' : 'text-warm-muted'
              }`}
            >
              <tab.icon active={active} />
              <span className="text-[10px] mt-0.5 font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function MapIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
      <path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z" />
      <path d="M8 2v16" />
      <path d="M16 6v16" />
    </svg>
  );
}

function PulseIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function ProfileIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add pwa/src/components/ui/BottomNav.jsx
git commit -m "feat: add bottom navigation with Map/Pulse/Profile tabs"
```

---

### Task 4: API Service Layer

**Files:**
- Create: `pwa/src/services/api.js`

- [ ] **Step 1: Create API service**

```javascript
// pwa/src/services/api.js
const BASE_URL = '/api';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const config = {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `Request failed: ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Workers
  getWorkers: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/workers${query ? `?${query}` : ''}`);
  },
  getWorker: (id) => request(`/workers/${id}`),

  // Chat / AI
  sendChat: (message, context = {}) =>
    request('/chat', {
      method: 'POST',
      body: JSON.stringify({ message, ...context })
    }),

  // Jobs
  createJob: (data) =>
    request('/jobs', { method: 'POST', body: JSON.stringify(data) }),
  getJob: (id) => request(`/jobs/${id}`),
  rateJob: (id, rating) =>
    request(`/jobs/${id}/rate`, { method: 'POST', body: JSON.stringify({ rating }) }),

  // Payments
  initiatePayment: (data) =>
    request('/payments/initiate', { method: 'POST', body: JSON.stringify(data) }),
  verifyPayment: (ref) => request(`/payments/verify/${ref}`),

  // Intelligence (for Pulse)
  getStats: () => request('/intelligence/stats'),
  getDemandHeat: (bounds) => {
    const query = new URLSearchParams(bounds).toString();
    return request(`/intelligence/demand-heat?${query}`);
  },
  getGaps: () => request('/intelligence/gaps'),

  // Profile
  getProfile: (phone) => request(`/workers/phone/${phone}`),
  updateAvailability: (id, available) =>
    request(`/workers/${id}/availability`, {
      method: 'PATCH',
      body: JSON.stringify({ is_available: available })
    }),

  // Traders
  logSale: (data) =>
    request('/traders/sales', { method: 'POST', body: JSON.stringify(data) }),
  getTraderReport: (id) => request(`/traders/${id}/report`)
};

export default api;
```

- [ ] **Step 2: Commit**

```bash
git add pwa/src/services/api.js
git commit -m "feat: add API service layer for all backend endpoints"
```

---

### Task 5: Map Canvas Component

**Files:**
- Create: `pwa/src/components/map/MapCanvas.jsx`

- [ ] **Step 1: Create MapCanvas with Mapbox GL**

```jsx
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
```

- [ ] **Step 2: Commit**

```bash
git add pwa/src/components/map/MapCanvas.jsx
git commit -m "feat: add MapCanvas with worker markers colored by trust tier"
```

---

### Task 6: Layer Toggle + Map Page

**Files:**
- Create: `pwa/src/components/map/LayerToggle.jsx`
- Create: `pwa/src/pages/MapPage.jsx`

- [ ] **Step 1: Create LayerToggle component**

```jsx
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
```

- [ ] **Step 2: Create MapPage**

```jsx
// pwa/src/pages/MapPage.jsx
import { useEffect } from 'react';
import MapCanvas from '../components/map/MapCanvas';
import LayerToggle from '../components/map/LayerToggle';
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
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add pwa/src/components/map/LayerToggle.jsx pwa/src/pages/MapPage.jsx
git commit -m "feat: add MapPage with layer toggle and worker loading"
```

---

### Task 7: Placeholder Pages (Pulse + Profile)

**Files:**
- Create: `pwa/src/pages/PulsePage.jsx`
- Create: `pwa/src/pages/ProfilePage.jsx`

- [ ] **Step 1: Create PulsePage placeholder**

```jsx
// pwa/src/pages/PulsePage.jsx
export default function PulsePage() {
  return (
    <div className="h-full pb-14 overflow-y-auto p-4">
      <h1 className="text-xl font-bold text-warm-text mb-2">Pulse</h1>
      <p className="text-warm-muted text-sm">Your economic dashboard is loading...</p>
      <div className="mt-6 space-y-4">
        <div className="bg-white rounded-xl p-4 border border-warm-border animate-pulse h-32" />
        <div className="bg-white rounded-xl p-4 border border-warm-border animate-pulse h-24" />
        <div className="bg-white rounded-xl p-4 border border-warm-border animate-pulse h-40" />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create ProfilePage placeholder**

```jsx
// pwa/src/pages/ProfilePage.jsx
export default function ProfilePage() {
  return (
    <div className="h-full pb-14 overflow-y-auto p-4">
      <h1 className="text-xl font-bold text-warm-text mb-2">Profile</h1>
      <p className="text-warm-muted text-sm">Set up your account to get started.</p>
      <div className="mt-6 space-y-4">
        <div className="bg-white rounded-xl p-4 border border-warm-border animate-pulse h-20" />
        <div className="bg-white rounded-xl p-4 border border-warm-border animate-pulse h-32" />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add pwa/src/pages/PulsePage.jsx pwa/src/pages/ProfilePage.jsx
git commit -m "feat: add placeholder Pulse and Profile pages"
```

---

### Task 8: PWA Manifest + Dockerfile

**Files:**
- Create: `pwa/public/manifest.json`
- Create: `pwa/Dockerfile`
- Create: `pwa/.dockerignore`

- [ ] **Step 1: Create manifest.json**

```json
{
  "name": "SabiWork",
  "short_name": "SabiWork",
  "description": "AI-powered economic intelligence for informal workers",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#1B7A3D",
  "background_color": "#FAFAF8",
  "icons": [
    { "src": "icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ],
  "categories": ["finance", "business", "productivity"]
}
```

- [ ] **Step 2: Create Dockerfile**

```dockerfile
# pwa/Dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_MAPBOX_TOKEN
ARG VITE_API_URL
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 5173
CMD ["nginx", "-g", "daemon off;"]
```

- [ ] **Step 3: Create nginx.conf for SPA routing**

Create `pwa/nginx.conf`:

```nginx
server {
    listen 5173;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

- [ ] **Step 4: Create .dockerignore**

```
node_modules
dist
.env
```

- [ ] **Step 5: Commit**

```bash
git add pwa/public/manifest.json pwa/Dockerfile pwa/nginx.conf pwa/.dockerignore
git commit -m "feat: add PWA manifest, Dockerfile with nginx, SPA routing"
```

---

### Task 9: Verify PWA Dev Server Starts

**Files:** None (verification only)

- [ ] **Step 1: Create a .env file for the PWA**

Create `pwa/.env`:
```
VITE_MAPBOX_TOKEN=pk.your_mapbox_token_here
VITE_API_URL=http://localhost:3000
```

- [ ] **Step 2: Start the dev server**

Run: `cd pwa && npm run dev`

Expected: Vite starts on port 5173, no compilation errors. Browser shows the map (or blank Mapbox canvas if token is placeholder) with bottom navigation visible.

- [ ] **Step 3: Verify routing works**

Open `http://localhost:5173/pulse` — should show Pulse placeholder.
Open `http://localhost:5173/profile` — should show Profile placeholder.
Open `http://localhost:5173/` — should show map.

- [ ] **Step 4: Stop dev server, commit .env to .gitignore**

The `.env` file should already be in the root `.gitignore` from Plan 1. Verify with:

Run: `grep ".env" ../.gitignore`

Expected: `.env` is listed.

- [ ] **Step 5: Commit any remaining files**

```bash
git add -A pwa/
git commit -m "feat: PWA scaffold complete — map renders, routing works, PWA installable"
```
