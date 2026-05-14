// pwa/src/components/chat/AgentStepMessage.jsx
// Animated step indicator showing the AI agent working

const STEP_ICONS = {
  thinking: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 6v6l4 2"/>
    </svg>
  ),
  searching: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
    </svg>
  ),
  action: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  success: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  complete: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  warning: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  )
};

const STEP_COLORS = {
  thinking: 'text-gray-500 border-gray-200 bg-gray-50',
  searching: 'text-blue-600 border-blue-200 bg-blue-50',
  action: 'text-orange-600 border-orange-200 bg-orange-50',
  success: 'text-green-600 border-green-200 bg-green-50',
  complete: 'text-green-700 border-green-300 bg-green-50',
  warning: 'text-amber-600 border-amber-200 bg-amber-50'
};

export default function AgentStepMessage({ message }) {
  const stepType = message.stepType || 'thinking';
  const colorClass = STEP_COLORS[stepType] || STEP_COLORS.thinking;
  const icon = STEP_ICONS[stepType] || STEP_ICONS.thinking;
  const isActive = stepType === 'thinking' || stepType === 'searching' || stepType === 'action';

  return (
    <div className="flex justify-start">
      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium ${colorClass}`}>
        <span className={isActive ? 'animate-spin' : ''}>
          {icon}
        </span>
        <span>{message.text}</span>
        {isActive && (
          <span className="flex gap-0.5 ml-1">
            <span className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
          </span>
        )}
      </div>
    </div>
  );
}
