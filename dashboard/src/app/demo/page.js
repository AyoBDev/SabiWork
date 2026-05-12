// dashboard/src/app/demo/page.js
'use client';

import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { createWSConnection } from '../../lib/ws';
import LiveMap from '../../components/LiveMap';
import AgentFeed from '../../components/AgentFeed';
import DemoMetrics from '../../components/DemoMetrics';
import PersonaCard from '../../components/PersonaCard';
import AgentThinking from '../../components/AgentThinking';
import AudienceQR from '../../components/AudienceQR';
import ChapterTitle from '../../components/ChapterTitle';
import DemoControls from '../../components/DemoControls';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Play, Sparkles } from 'lucide-react';

const SCENARIO_MAP = {
  "Mama Chioma's Day": 'story',
  'Market Day': 'market-day',
  'Buyer & Worker': 'buyer-worker',
  'Full Demo': 'full',
};

// Web Audio API sound effects — no files needed
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function playSound(type) {
  try {
    const ctx = getAudioCtx();
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    switch (type) {
      case 'payment':
        // Ka-ching: two quick ascending notes
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.08);
        break;
      case 'score':
        // Soft chime: high gentle tone
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1600, ctx.currentTime + 0.15);
        break;
      case 'match':
        // Whoosh: descending frequency sweep
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        break;
      case 'sale':
        // Soft pop: quick blip
        osc.type = 'sine';
        osc.frequency.setValueAtTime(500, ctx.currentTime);
        osc.frequency.setValueAtTime(700, ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        break;
      default:
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
    }

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {}
}

function getSoundType(eventType) {
  switch (eventType) {
    case 'payment_received':
    case 'payout_sent':
      return 'payment';
    case 'score_updated':
    case 'verification_granted':
      return 'score';
    case 'job_matched':
    case 'supplier_matched':
      return 'match';
    case 'sale_logged':
    case 'message_parsed':
      return 'sale';
    default:
      return null;
  }
}

export default function DemoPage() {
  const [events, setEvents] = useState([]);
  const [participantCount, setParticipantCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundEnabledRef = useRef(true);
  const wsRef = useRef(null);

  // Keep ref in sync with state
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    const ws = createWSConnection((event) => {
      setEvents((prev) => [...prev, event].slice(-200));
      if (event.metadata?.is_audience) {
        setParticipantCount((prev) => prev + 1);
      }
      // Play sound effect
      if (soundEnabledRef.current) {
        const soundType = getSoundType(event.event_type);
        if (soundType) playSound(soundType);
      }
    });
    wsRef.current = ws;
    return () => ws.close();
  }, []);

  const latestEvent = useMemo(() => {
    return events.length > 0 ? events[events.length - 1] : null;
  }, [events]);

  const triggerDemo = async (scenario) => {
    const mapped = SCENARIO_MAP[scenario] || scenario;
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/demo/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: mapped })
      });
    } catch (e) {
      console.error('Failed to trigger demo:', e);
    }
  };

  const handleReset = () => {
    setEvents([]);
    setParticipantCount(0);
  };

  const handleSpeedChange = (speed) => {
    console.log('Speed changed to:', speed);
  };

  return (
    <div className="h-screen flex dark bg-background">
      {/* Left Panel: Map + Branding + QR */}
      <div className="w-[55%] flex flex-col p-4 gap-3">
        {/* Header row */}
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground">SabiWork</h1>
              <p className="text-[10px] text-muted-foreground">Economic Intelligence Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => triggerDemo('story')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20 transition-colors"
            >
              <Play className="w-3 h-3" />
              Story
            </button>
            <button
              onClick={() => triggerDemo('full')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/30 hover:bg-purple-500/20 transition-colors"
            >
              <Sparkles className="w-3 h-3" />
              Full Demo
            </button>
            <DemoControls
              onTrigger={triggerDemo}
              onReset={handleReset}
              onSpeedChange={handleSpeedChange}
            />
            <button
              onClick={() => setSoundEnabled((prev) => !prev)}
              className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                soundEnabled
                  ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                  : 'bg-muted text-muted-foreground border-border/50'
              }`}
            >
              {soundEnabled ? '🔊' : '🔇'}
            </button>
            <Badge variant="outline" className="text-green-400 border-green-400/30 bg-green-400/10 font-mono text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse mr-1.5 inline-block" />
              LIVE
            </Badge>
          </div>
        </div>

        <Separator className="opacity-30" />

        {/* Map with Chapter Title + Persona Card overlays */}
        <div className="flex-[2] min-h-0 rounded-xl overflow-hidden border border-border/30 relative">
          <LiveMap events={events} />
          <ChapterTitle event={latestEvent} />
          <PersonaCard event={latestEvent} />
        </div>

        {/* Bottom row: QR + Agent Thinking */}
        <div className="flex-[1] min-h-0 grid grid-cols-2 gap-3">
          <AudienceQR participantCount={participantCount} />
          <AgentThinking event={latestEvent} />
        </div>
      </div>

      {/* Divider */}
      <div className="w-px bg-border/30" />

      {/* Right Panel: Agent Feed + Metrics */}
      <div className="w-[45%] flex flex-col p-4 gap-3">
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
