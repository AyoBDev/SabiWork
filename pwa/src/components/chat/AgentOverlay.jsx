import { useEffect, useRef } from 'react';
import useAppStore from '../../stores/appStore';

const STEP_STYLES = {
  thinking: { bg: 'from-gray-800/95 to-gray-900/95', icon: '🧠', animate: true },
  searching: { bg: 'from-blue-800/95 to-blue-900/95', icon: '📡', animate: true },
  action: { bg: 'from-orange-800/95 to-orange-900/95', icon: '⚡', animate: true },
  success: { bg: 'from-green-800/95 to-green-900/95', icon: '✓', animate: false },
  complete: { bg: 'from-green-700/95 to-green-800/95', icon: '✓', animate: false },
};

function WorkerCard({ worker, highlight }) {
  if (!worker) return null;
  const trust = worker.trust_score ? `${(parseFloat(worker.trust_score) * 100).toFixed(0)}%` : '—';
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 ${highlight ? 'bg-white/20 border-sabi-green scale-[1.02] shadow-lg shadow-green-500/20' : 'bg-white/10 border-white/10'}`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${highlight ? 'bg-sabi-green' : 'bg-white/20'}`}>
        {worker.name?.[0] || 'W'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-semibold truncate">{worker.name}</p>
        <p className="text-white/60 text-xs">{worker.primary_trade} · {worker.distance_km}km · {trust} trust</p>
      </div>
      {highlight && <span className="text-sabi-green text-xs font-bold">BEST</span>}
    </div>
  );
}

function SaleField({ label, value, active }) {
  return (
    <div className={`p-3 rounded-xl border transition-all duration-300 ${active ? 'border-sabi-green bg-white/20 ring-2 ring-sabi-green/40' : value ? 'border-white/20 bg-white/10' : 'border-white/10 bg-white/5'}`}>
      <p className="text-white/50 text-[10px] uppercase tracking-wide mb-0.5">{label}</p>
      <p className={`text-sm font-medium ${value ? 'text-white' : 'text-white/30'}`}>
        {value || '—'}
        {active && <span className="inline-block w-0.5 h-4 bg-sabi-green ml-0.5 animate-pulse" />}
      </p>
    </div>
  );
}

export default function AgentOverlay() {
  const steps = useAppStore((s) => s.agentOverlaySteps);
  const visible = useAppStore((s) => s.agentOverlayVisible);
  const agentAction = useAppStore((s) => s.agentAction);
  const workers = useAppStore((s) => s.workers);
  const highlightedWorkerId = useAppStore((s) => s.highlightedWorkerId);

  if (!visible || steps.length === 0) return null;

  const latestStep = steps[steps.length - 1];
  const style = STEP_STYLES[latestStep.stepType] || STEP_STYLES.thinking;

  // Determine if we're in a worker-finding or sale-logging visual mode
  const isWorkerFlow = steps.some(s => s.text.includes('Looking for') || s.text.includes('Checking'));
  const isSaleFlow = steps.some(s => s.text.includes('sale') || s.text.includes('Filling') || s.text.includes('inventory'));

  return (
    <div className="fixed inset-0 z-[95] pointer-events-none flex flex-col">
      {/* Dark overlay background */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Content */}
      <div className="relative flex-1 flex flex-col px-5 pt-16 pb-20">
        {/* Step indicator at top */}
        <div className={`bg-gradient-to-r ${style.bg} rounded-2xl px-4 py-3 shadow-2xl border border-white/10 mb-6`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <span className="text-sm">{style.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium">{latestStep.text}</p>
            </div>
            {style.animate && (
              <span className="flex gap-0.5 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            )}
          </div>
        </div>

        {/* Worker cards during find_worker flow */}
        {isWorkerFlow && workers.length > 0 && (
          <div className="space-y-2 animate-fade-in">
            {workers.slice(0, 3).map((w) => {
              const wId = w.id || w.phone || `${w.location_lat}_${w.location_lng}`;
              return (
                <WorkerCard
                  key={wId}
                  worker={w}
                  highlight={highlightedWorkerId === wId}
                />
              );
            })}
          </div>
        )}

        {/* Sale form visualization during log_sale flow */}
        {isSaleFlow && agentAction && (
          <div className="space-y-3 animate-fade-in">
            <div className="bg-white/10 rounded-2xl border border-white/10 p-4">
              <p className="text-white/70 text-xs font-semibold uppercase tracking-wide mb-3">Log a Sale</p>
              <div className="space-y-2">
                <SaleField
                  label="Item"
                  value={agentAction.data?.item_name}
                  active={agentAction.type === 'fill_sale' && !agentAction.data?.quantity}
                />
                <SaleField
                  label="Quantity"
                  value={agentAction.data?.quantity ? String(agentAction.data.quantity) : ''}
                  active={agentAction.type === 'fill_sale' && agentAction.data?.quantity && !agentAction.data?.amount}
                />
                <SaleField
                  label="Amount (₦)"
                  value={agentAction.data?.amount ? `₦${Number(agentAction.data.amount).toLocaleString()}` : ''}
                  active={agentAction.type === 'fill_sale' && agentAction.data?.amount}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step progress */}
        <div className="mt-auto flex gap-1.5 justify-center">
          {steps.map((s, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === steps.length - 1 ? 'w-6 bg-sabi-green' : 'w-1.5 bg-white/30'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
