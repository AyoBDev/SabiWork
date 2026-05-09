// pwa/src/components/chat/AIButton.jsx
import useAppStore from '../../stores/appStore';

export default function AIButton() {
  const { chatOpen, setChatOpen, activeJob } = useAppStore();

  if (chatOpen) return null;

  return (
    <button
      onClick={() => setChatOpen(true)}
      className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-work-orange shadow-lg flex items-center justify-center transition-transform active:scale-90"
      style={{
        animation: 'breathe 3s ease-in-out infinite'
      }}
      aria-label="Open AI Chat"
    >
      {/* Sparkle icon */}
      <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
        <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" />
      </svg>

      {/* Status dot when active job exists */}
      {activeJob && (
        <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-sabi-green rounded-full border-2 border-white" />
      )}

      <style>{`
        @keyframes breathe {
          0%, 100% { box-shadow: 0 4px 16px rgba(232, 99, 10, 0.4); }
          50% { box-shadow: 0 4px 24px rgba(232, 99, 10, 0.7); }
        }
      `}</style>
    </button>
  );
}
