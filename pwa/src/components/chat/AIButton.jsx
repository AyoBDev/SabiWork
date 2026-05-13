// pwa/src/components/chat/AIButton.jsx
import useAppStore from '../../stores/appStore';

export default function AIButton() {
  const { chatOpen, setChatOpen, activeJob } = useAppStore();

  if (chatOpen) return null;

  return (
    <button
      onClick={() => setChatOpen(true)}
      className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-sabi-green to-sabi-green-light shadow-lg shadow-sabi-green/30 flex items-center justify-center transition-all active:scale-90 hover:shadow-xl hover:shadow-sabi-green/40"
      aria-label="Open AI Chat"
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>

      {/* Status dot when active job exists */}
      {activeJob && (
        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-work-orange rounded-full border-2 border-white animate-pulse" />
      )}

      {/* Pulse ring */}
      <span className="absolute inset-0 rounded-full bg-sabi-green/20 animate-ping" style={{ animationDuration: '3s' }} />
    </button>
  );
}
