// pwa/src/components/chat/ChatBubble.jsx
export default function ChatBubble({ text, sender }) {
  const isUser = sender === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-sabi-green text-white rounded-br-sm'
            : 'bg-warm-bg text-warm-text rounded-bl-sm'
        }`}
      >
        {text}
      </div>
    </div>
  );
}
