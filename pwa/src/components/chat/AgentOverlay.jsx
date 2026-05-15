import useAppStore from '../../stores/appStore';

const STEP_STYLES = {
  thinking: { bg: 'bg-gray-900/95', icon: '🧠', animate: true },
  searching: { bg: 'bg-blue-900/95', icon: '📡', animate: true },
  action: { bg: 'bg-orange-900/95', icon: '⚡', animate: true },
  success: { bg: 'bg-green-900/95', icon: '✓', animate: false },
  complete: { bg: 'bg-green-800/95', icon: '✓', animate: false },
};

export default function AgentOverlay() {
  const steps = useAppStore((s) => s.agentOverlaySteps);
  const visible = useAppStore((s) => s.agentOverlayVisible);

  if (!visible || steps.length === 0) return null;

  const latestStep = steps[steps.length - 1];
  const style = STEP_STYLES[latestStep.stepType] || STEP_STYLES.thinking;

  return (
    <div className="fixed top-0 left-0 right-0 z-[95] px-3 pt-3 pointer-events-none">
      <div className={`${style.bg} backdrop-blur-md rounded-2xl px-4 py-3 shadow-2xl border border-white/10 pointer-events-auto`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <span className="text-sm">{style.icon}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{latestStep.text}</p>
          </div>
          {style.animate && (
            <span className="flex gap-0.5 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          )}
        </div>
        {steps.length > 1 && (
          <div className="flex gap-1 justify-center mt-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === steps.length - 1 ? 'w-4 bg-sabi-green' : 'w-1.5 bg-white/30'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
