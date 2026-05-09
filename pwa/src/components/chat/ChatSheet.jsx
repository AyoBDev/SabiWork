// pwa/src/components/chat/ChatSheet.jsx
import { useRef, useEffect } from 'react';
import useAppStore from '../../stores/appStore';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';

export default function ChatSheet() {
  const { chatOpen, setChatOpen, messages } = useAppStore();
  const scrollRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ease-out ${
        chatOpen ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{ height: '65vh' }}
    >
      {/* Backdrop */}
      {chatOpen && (
        <div
          className="fixed inset-0 bg-black/20 -z-10"
          onClick={() => setChatOpen(false)}
        />
      )}

      {/* Sheet */}
      <div className="h-full bg-white rounded-t-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Handle */}
        <div className="flex items-center justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-warm-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-2 border-b border-warm-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-work-orange flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-warm-text">SabiWork AI</p>
              <p className="text-[10px] text-sabi-green">Ready to help</p>
            </div>
          </div>
          <button
            onClick={() => setChatOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-warm-bg"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-warm-muted text-sm mt-8">
              <p className="text-base mb-1">Wetin you need?</p>
              <p className="text-xs">Try: "I need a plumber in Surulere"</p>
            </div>
          )}
          {messages.map((msg, idx) => (
            <ChatMessage key={idx} message={msg} />
          ))}
        </div>

        {/* Input */}
        <ChatInput />
      </div>
    </div>
  );
}
