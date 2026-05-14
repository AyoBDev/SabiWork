// pwa/src/components/chat/AgentStepMessage.jsx
// Animated step indicator showing the AI agent working — visible process steps

const STEP_CONFIGS = {
  thinking: {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
      </svg>
    ),
    color: 'text-gray-600',
    bg: 'bg-gray-100',
    border: 'border-gray-200',
    pulse: true
  },
  searching: {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
      </svg>
    ),
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    pulse: true
  },
  action: {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
    ),
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    pulse: true
  },
  success: {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    ),
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
    pulse: false
  },
  complete: {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ),
    color: 'text-green-700',
    bg: 'bg-green-100',
    border: 'border-green-300',
    pulse: false
  },
  warning: {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    pulse: false
  }
};

export default function AgentStepMessage({ message }) {
  const stepType = message.stepType || 'thinking';
  const config = STEP_CONFIGS[stepType] || STEP_CONFIGS.thinking;

  return (
    <div className="flex justify-start animate-fade-in">
      {/* Connector line */}
      <div className="flex flex-col items-center mr-3">
        <div className={`w-8 h-8 rounded-full ${config.bg} border ${config.border} flex items-center justify-center ${config.color} ${config.pulse ? 'animate-pulse' : ''}`}>
          {config.icon}
        </div>
        <div className="w-0.5 h-3 bg-gray-200 mt-1" />
      </div>

      {/* Step content */}
      <div className={`flex-1 px-4 py-3 rounded-xl border ${config.border} ${config.bg} ${config.color}`}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{message.text}</span>
          {config.pulse && (
            <span className="flex gap-0.5 ml-auto">
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60 animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
