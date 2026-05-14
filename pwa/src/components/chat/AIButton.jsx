// pwa/src/components/chat/AIButton.jsx
import useAppStore from '../../stores/appStore';

export default function AIButton() {
  const { chatOpen, setChatOpen, activeJob, unreadCount } = useAppStore();

  if (chatOpen) return null;

  return (
    <button
      onClick={() => setChatOpen(true)}
      className={`fixed bottom-24 right-5 z-40 w-16 h-16 rounded-full bg-sabi-green shadow-lg shadow-sabi-green/30 flex items-center justify-center transition-all active:scale-90 hover:shadow-xl hover:shadow-sabi-green/40 ${unreadCount > 0 ? 'animate-bounce' : ''}`}
      aria-label="Open AI Chat"
    >
      {/* Sparkle icon */}
      <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
        <path d="M12 2L13.09 7.26L18 6L14.74 9.74L20 12L14.74 14.26L18 18L13.09 16.74L12 22L10.91 16.74L6 18L9.26 14.26L4 12L9.26 9.74L6 6L10.91 7.26L12 2Z" />
      </svg>

      {/* Unread message badge */}
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1.5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
          <span className="text-[10px] font-bold text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>
        </span>
      )}

      {/* Active job dot */}
      {activeJob && !unreadCount && (
        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-orange-400 rounded-full border-2 border-white animate-pulse" />
      )}
    </button>
  );
}
