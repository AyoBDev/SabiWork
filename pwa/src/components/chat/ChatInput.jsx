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
      className="flex items-center gap-2 px-3 py-2 border-t border-warm-border bg-white safe-area-pb"
    >
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Wetin you dey find?"
        disabled={loading}
        className="flex-1 h-10 px-4 rounded-full bg-warm-bg border border-warm-border text-sm focus:outline-none focus:border-sabi-green disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={!text.trim() || loading}
        className="w-10 h-10 rounded-full bg-sabi-green flex items-center justify-center disabled:opacity-40 transition-opacity"
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        )}
      </button>
    </form>
  );
}
