// pwa/src/components/chat/ChatInput.jsx
import { useState, useRef } from 'react';
import useAppStore from '../../stores/appStore';

export default function ChatInput({ onSend }) {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const { loading } = useAppStore();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim() || loading) return;
    onSend(text.trim());
    setText('');
  };

  const startVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      // Fallback: show alert
      onSend('Voice input is not supported on this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-NG';
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(r => r[0].transcript)
        .join('');
      setText(transcript);

      // If final result, auto-send
      if (event.results[0].isFinal) {
        setIsListening(false);
        if (transcript.trim()) {
          onSend(transcript.trim());
          setText('');
        }
      }
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopVoice = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 px-4 py-3 border-t border-warm-border/60 bg-white shrink-0"
      style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
    >
      {/* Voice button */}
      <button
        type="button"
        onClick={isListening ? stopVoice : startVoice}
        className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-all ${
          isListening
            ? 'bg-red-500 shadow-lg shadow-red-500/30 animate-pulse'
            : 'bg-gray-100 hover:bg-gray-200'
        }`}
      >
        {isListening ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <rect x="6" y="6" width="12" height="12" rx="2"/>
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4B5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="22"/>
          </svg>
        )}
      </button>

      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={isListening ? 'Listening...' : 'Ask me anything...'}
        disabled={loading || isListening}
        className={`flex-1 h-11 px-4 rounded-full bg-warm-bg border text-sm focus:outline-none focus:ring-2 focus:ring-sabi-green/30 focus:border-sabi-green disabled:opacity-50 transition-all ${
          isListening ? 'border-red-300 bg-red-50' : 'border-warm-border'
        }`}
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
