// pwa/src/stores/appStore.js
import { create } from 'zustand';

// Hydrate user from localStorage on init
function getPersistedUser() {
  try {
    const stored = localStorage.getItem('sabiwork_user');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

const useAppStore = create((set, get) => ({
  // User state (hydrated from localStorage)
  user: getPersistedUser(),
  setUser: (user) => {
    if (user) {
      localStorage.setItem('sabiwork_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('sabiwork_user');
    }
    set({ user });
  },
  logout: () => {
    localStorage.removeItem('sabiwork_user');
    set({ user: null });
  },

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

  // Agent highlighting (for animated marker evaluation)
  highlightedWorkerId: null,
  setHighlightedWorkerId: (id) => set({ highlightedWorkerId: id }),

  // Loading states
  loading: false,
  setLoading: (loading) => set({ loading })
}));

export default useAppStore;
