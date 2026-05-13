// pwa/src/components/chat/AIButton.jsx
import useAppStore from '../../stores/appStore';

export default function AIButton() {
  const { chatOpen, setChatOpen, activeJob } = useAppStore();

  if (chatOpen) return null;

  return (
    <button
      onClick={() => setChatOpen(true)}
      className="fixed bottom-24 right-5 z-40 w-16 h-16 rounded-full bg-sabi-green shadow-lg shadow-sabi-green/30 flex items-center justify-center transition-all active:scale-90 hover:shadow-xl hover:shadow-sabi-green/40"
      aria-label="Open AI Chat"
    >
      {/* Sparkle icon matching Figma */}
      <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
        <path d="M12 2L13.09 7.26L18 6L14.74 9.74L20 12L14.74 14.26L18 18L13.09 16.74L12 22L10.91 16.74L6 18L9.26 14.26L4 12L9.26 9.74L6 6L10.91 7.26L12 2Z" />
      </svg>

      {/* Status dot when active job exists */}
      {activeJob && (
        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-orange-400 rounded-full border-2 border-white animate-pulse" />
      )}
    </button>
  );
}
