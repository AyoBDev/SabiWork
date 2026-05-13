// pwa/src/components/chat/ChatBubble.jsx
export default function ChatBubble({ text, sender }) {
  const isUser = sender === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sabi-green to-sabi-green-light flex items-center justify-center mr-2 mt-1 shrink-0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
            <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" />
          </svg>
        </div>
      )}
      <div
        className={`max-w-[78%] px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-sabi-green text-white rounded-2xl rounded-br-md shadow-sm'
            : 'bg-warm-bg text-warm-text rounded-2xl rounded-bl-md border border-warm-border/60'
        }`}
      >
        {text}
      </div>
    </div>
  );
}
