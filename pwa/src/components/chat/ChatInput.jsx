// pwa/src/components/chat/ChatInput.jsx
import { useState } from 'react';
import useAppStore from '../../stores/appStore';
import { useChat } from '../../hooks/useChat';

export default function ChatInput() {
  const [text, setText] = useState('');
  const { loading } = useAppStore();
  const { send } = useChat();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim() || loading) return;
    send(text.trim());
    setText('');
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 px-4 py-3 border-t border-warm-border/60 bg-white"
      style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
    >
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type a message..."
        disabled={loading}
        className="flex-1 h-11 px-4 rounded-full bg-warm-bg border border-warm-border text-sm focus:outline-none focus:ring-2 focus:ring-sabi-green/30 focus:border-sabi-green disabled:opacity-50 transition-all"
      />
      <button
        type="submit"
        disabled={!text.trim() || loading}
        className="w-11 h-11 rounded-full bg-sabi-green flex items-center justify-center disabled:opacity-40 active:scale-90 transition-all shadow-sm"
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        )}
      </button>
    </form>
  );
}
