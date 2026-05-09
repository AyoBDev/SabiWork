// pwa/src/components/chat/ChatMessage.jsx
import ChatBubble from './ChatBubble';
import WorkerCard from '../cards/WorkerCard';
import PaymentCard from '../cards/PaymentCard';
import TrackingCard from '../cards/TrackingCard';
import RatingCard from '../cards/RatingCard';
import PayoutCard from '../cards/PayoutCard';
import DemandCard from '../cards/DemandCard';

export default function ChatMessage({ message }) {
  switch (message.type) {
    case 'text':
      return <ChatBubble text={message.text} sender={message.sender} />;
    case 'worker_card':
      return <WorkerCard worker={message.data} />;
    case 'payment_card':
      return <PaymentCard payment={message.data} />;
    case 'tracking_card':
      return <TrackingCard job={message.data} />;
    case 'rating_card':
      return <RatingCard job={message.data} />;
    case 'payout_card':
      return <PayoutCard payout={message.data} />;
    case 'demand_card':
      return <DemandCard demand={message.data} />;
    default:
      return <ChatBubble text={message.text || 'Unknown message'} sender="ai" />;
  }
}
