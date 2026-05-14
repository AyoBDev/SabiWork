// pwa/src/components/chat/ChatSheet.jsx
import { useRef, useEffect, useState } from 'react';
import useAppStore from '../../stores/appStore';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { useAgentChat } from '../../hooks/useAgentChat';

const QUICK_ACTIONS = [
  { label: 'Find a plumber', msg: 'Find me a plumber nearby' },
  { label: 'Log a sale', msg: 'I sold 5 bags of rice for 75000' },
  { label: 'My Sabi Score', msg: 'What is my Sabi Score?' },
  { label: 'Help', msg: 'What can you do?' },
];

export default function ChatSheet() {
  const { chatOpen, setChatOpen, messages } = useAppStore();
  const scrollRef = useRef(null);
  const [suggestions, setSuggestions] = useState([]);
  const { send } = useAgentChat();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend(text) {
    setSuggestions([]);
    const response = await send(text);
    if (response?.suggestions) {
      setSuggestions(response.suggestions);
    }
  }

  return (
    <div
      className={`fixed inset-0 z-[100] transition-transform duration-300 ease-out ${
        chatOpen ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={() => setChatOpen(false)}
      />

      {/* Sheet */}
      <div className="absolute inset-x-0 bottom-0 top-[8vh] bg-white rounded-t-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Handle */}
        <div className="flex items-center justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 rounded-full bg-warm-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-warm-border/60">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="SabiWork" className="w-10 h-10 rounded-full shadow-md" />
            <div>
              <p className="text-base font-bold text-warm-text">SabiWork AI</p>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sabi-green animate-pulse" />
                <p className="text-xs text-sabi-green font-medium">Online</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setChatOpen(false)}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-warm-bg hover:bg-warm-border transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center text-center mt-6 px-4">
              <div className="w-16 h-16 rounded-full bg-sabi-green/10 flex items-center justify-center mb-4">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1B7A3D" strokeWidth="1.5">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <p className="text-lg font-bold text-warm-text mb-1">Wetin you need?</p>
              <p className="text-sm text-warm-muted mb-6">Tell me what you need — voice or text. I'll find workers, log sales, and more.</p>

              <div className="flex flex-wrap gap-2 justify-center">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => handleSend(action.msg)}
                    className="px-3.5 py-2 rounded-full bg-sabi-green/10 text-sabi-green text-xs font-medium border border-sabi-green/20 hover:bg-sabi-green/20 active:scale-95 transition-all"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg, idx) => (
            <ChatMessage key={idx} message={msg} />
          ))}
        </div>

        {/* Suggestion chips */}
        {suggestions.length > 0 && (
          <div className="px-4 py-2 border-t border-warm-border/40 flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => handleSend(s)}
                className="px-3 py-1.5 rounded-full bg-sabi-green/10 text-sabi-green text-xs font-medium border border-sabi-green/20 hover:bg-sabi-green/20 active:scale-95 transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <ChatInput onSend={handleSend} />
      </div>
    </div>
  );
}
