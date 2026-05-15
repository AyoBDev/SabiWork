import { useEffect, useRef } from 'react';
import useAppStore from '../../stores/appStore';

const STEP_STYLES = {
  thinking: { bg: 'bg-gray-800/90', icon: '🔍', animate: true },
  searching: { bg: 'bg-blue-900/90', icon: '📡', animate: true },
  action: { bg: 'bg-orange-900/90', icon: '⚡', animate: true },
  success: { bg: 'bg-green-900/90', icon: '✓', animate: false },
  complete: { bg: 'bg-green-800/90', icon: '✓', animate: false },
};

export default function AgentOverlay() {
  const steps = useAppStore((s) => s.agentOverlaySteps);
  const visible = useAppStore((s) => s.agentOverlayVisible);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [steps]);

  if (!visible || steps.length === 0) return null;

  const latestStep = steps[steps.length - 1];
  const style = STEP_STYLES[latestStep.stepType] || STEP_STYLES.thinking;

  return (
    <div className="fixed top-[60px] left-4 right-4 z-[90] pointer-events-none">
      <div className={`${style.bg} backdrop-blur-md rounded-2xl px-4 py-3 shadow-2xl border border-white/10`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <span className="text-sm">{style.icon}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{latestStep.text}</p>
            {steps.length > 1 && (
              <p className="text-white/50 text-xs mt-0.5">{steps.length} steps completed</p>
            )}
          </div>
          {style.animate && (
            <span className="flex gap-0.5 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          )}
        </div>

        {/* Step progress dots */}
        {steps.length > 1 && (
          <div className="flex gap-1 mt-2 justify-center">
            {steps.map((s, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  i === steps.length - 1 ? 'bg-white scale-125' : 'bg-white/40'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
