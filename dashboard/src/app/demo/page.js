// dashboard/src/app/demo/page.js
'use client';

import { useEffect, useState, useRef } from 'react';
import { createWSConnection } from '../../lib/ws';
import LiveMap from '../../components/LiveMap';
import AgentFeed from '../../components/AgentFeed';
import DemoMetrics from '../../components/DemoMetrics';

export default function DemoPage() {
  const [events, setEvents] = useState([]);
  const wsRef = useRef(null);

  useEffect(() => {
    const ws = createWSConnection((event) => {
      setEvents((prev) => [...prev, event].slice(-200));
    });
    wsRef.current = ws;
    return () => ws.close();
  }, []);

  return (
    <div className="h-screen flex bg-[#010409]">
      {/* Left Panel: Dashboard View */}
      <div className="w-1/2 flex flex-col p-3 gap-3 border-r border-[#30363d]">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-green-500 flex items-center justify-center">
              <span className="text-white font-bold text-xs">S</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-white">SabiWork</h1>
              <p className="text-[9px] text-gray-500">Economic Intelligence</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] text-green-400 font-mono">LIVE</span>
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 min-h-0 rounded-xl overflow-hidden">
          <LiveMap events={events} />
        </div>
      </div>

      {/* Right Panel: Agent Feed + Metrics */}
      <div className="w-1/2 flex flex-col p-3 gap-3">
        {/* Agent Feed (takes most space) */}
        <div className="flex-1 min-h-0">
          <AgentFeed events={events} />
        </div>

        {/* Metrics (fixed bottom) */}
        <div className="shrink-0">
          <DemoMetrics events={events} />
        </div>
      </div>
    </div>
  );
}
