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
