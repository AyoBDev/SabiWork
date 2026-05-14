// pwa/src/components/chat/AgentResultMessage.jsx
// Final result card from the AI agent

export default function AgentResultMessage({ message }) {
  const actionType = message.actionType;

  const getIcon = () => {
    switch (actionType) {
      case 'show_map':
        return (
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
        );
      case 'sale_logged':
        return (
          <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
        );
      case 'navigate_create_round':
        return (
          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
            </svg>
          </div>
        );
      case 'score_display':
        return (
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/>
            </svg>
          </div>
        );
      case 'wallet_display':
        return (
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-lg bg-sabi-green/10 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1B7A3D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"/>
            </svg>
          </div>
        );
    }
  };

  return (
    <div className="flex justify-start">
      <div className="max-w-[88%] bg-white border border-gray-200 rounded-2xl rounded-bl-md p-4 shadow-sm">
        <div className="flex items-start gap-3">
          {getIcon()}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{message.text}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
