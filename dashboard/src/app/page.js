// dashboard/src/app/page.js
'use client';

import { useEffect, useState, useRef } from 'react';
import StatsRow from '../components/StatsRow';
import LiveMap from '../components/LiveMap';
import LiveFeed from '../components/LiveFeed';
import DemandPanel from '../components/DemandPanel';
import ChannelChart from '../components/ChannelChart';
import InclusionMetrics from '../components/InclusionMetrics';
import { dashboardAPI } from '../lib/api';
import { createWSConnection } from '../lib/ws';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [gaps, setGaps] = useState(null);
  const [channels, setChannels] = useState(null);
  const [inclusion, setInclusion] = useState(null);
  const [events, setEvents] = useState([]);
  const wsRef = useRef(null);

  // Fetch initial data
  useEffect(() => {
    async function loadData() {
      try {
        const [statsData, gapsData, channelsData, inclusionData] = await Promise.all([
          dashboardAPI.getStats(),
          dashboardAPI.getGaps(),
          dashboardAPI.getChannels(),
          dashboardAPI.getFinancialInclusion()
        ]);
        setStats(statsData);
        setGaps(gapsData.gaps || gapsData);
        setChannels(channelsData.channels || channelsData);
        setInclusion(inclusionData);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      }
    }
    loadData();
  }, []);

  // WebSocket connection
  useEffect(() => {
    const ws = createWSConnection((event) => {
      setEvents((prev) => [event, ...prev].slice(0, 50)); // Keep last 50

      // Increment stats on certain events
      if (event.event_type === 'payment_received' && stats) {
        setStats((s) => ({
          ...s,
          volume_today: (s?.volume_today || 0) + (event.amount || 0),
          jobs_today: (s?.jobs_today || 0) + 1
        }));
      }
    });

    wsRef.current = ws;
    return () => ws.close();
  }, []);

  return (
    <div className="h-screen p-4 flex flex-col gap-3 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sabi-green flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <div>
            <h1 className="text-sm font-bold text-dash-text">SabiWork Intelligence</h1>
            <p className="text-[10px] text-dash-muted">Economic Command Centre</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-sabi-green animate-pulse" />
          <span className="text-[10px] text-dash-muted">Live</span>
        </div>
      </div>

      {/* Stats Row */}
      <div className="shrink-0">
        <StatsRow stats={stats} />
      </div>

      {/* Main Content Grid */}
      <div className="flex-1 grid grid-cols-3 gap-3 min-h-0">
        {/* Left: Map + Feed (2/3 width) */}
        <div className="col-span-2 grid grid-rows-[3fr_2fr] gap-3 min-h-0">
          {/* Map */}
          <div className="min-h-0">
            <LiveMap events={events} />
          </div>
          {/* Feed */}
          <div className="min-h-0">
            <LiveFeed events={events} />
          </div>
        </div>

        {/* Right: Intelligence (1/3 width) */}
        <div className="flex flex-col gap-3 overflow-y-auto min-h-0">
          <DemandPanel gaps={gaps} />
          <ChannelChart channels={channels} />
          <InclusionMetrics data={inclusion} />
        </div>
      </div>
    </div>
  );
}
