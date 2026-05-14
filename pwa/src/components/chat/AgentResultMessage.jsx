// pwa/src/components/chat/AgentResultMessage.jsx
// Final result card from the AI agent — prominent and visible

const ACTION_CONFIGS = {
  show_map: {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
      </svg>
    ),
    bg: 'bg-blue-500',
    label: 'Workers Found'
  },
  sale_logged: {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ),
    bg: 'bg-green-500',
    label: 'Sale Recorded'
  },
  navigate_create_round: {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
      </svg>
    ),
    bg: 'bg-purple-500',
    label: 'Investment Round'
  },
  score_display: {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/>
      </svg>
    ),
    bg: 'bg-amber-500',
    label: 'Sabi Score'
  },
  score_insufficient: {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
    bg: 'bg-amber-500',
    label: 'Score Required'
  },
  wallet_display: {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
      </svg>
    ),
    bg: 'bg-emerald-500',
    label: 'Wallet'
  },
  help: {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
    bg: 'bg-sabi-green',
    label: 'How I Can Help'
  }
};

export default function AgentResultMessage({ message }) {
  const actionType = message.actionType || 'help';
  const config = ACTION_CONFIGS[actionType] || ACTION_CONFIGS.help;

  return (
    <div className="flex justify-start animate-fade-in">
      <div className="w-full max-w-[92%] bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-md">
        {/* Action header */}
        <div className={`${config.bg} px-4 py-2.5 flex items-center gap-2.5`}>
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            {config.icon}
          </div>
          <span className="text-sm font-semibold text-white">{config.label}</span>
          <span className="ml-auto text-xs text-white/70">Just now</span>
        </div>

        {/* Content */}
        <div className="px-4 py-4">
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{message.text}</p>
        </div>
      </div>
    </div>
  );
}
