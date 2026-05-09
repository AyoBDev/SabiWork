// pwa/src/components/cards/RatingCard.jsx
import { useState } from 'react';
import { useChat } from '../../hooks/useChat';

export default function RatingCard({ job }) {
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const { submitRating } = useChat();

  const handleSubmit = () => {
    if (rating === 0) return;
    submitRating(job.id, rating);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="bg-white rounded-xl border border-warm-border p-3 shadow-sm text-center">
        <p className="text-2xl mb-1">🎉</p>
        <p className="text-sm font-medium text-warm-text">Thank you!</p>
        <p className="text-xs text-warm-muted">Your rating helps build trust in the community.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-warm-border p-3 shadow-sm">
      <p className="text-sm font-medium text-warm-text mb-1">How was {job.worker_name}?</p>
      <p className="text-xs text-warm-muted mb-3">Your rating updates their trust score</p>

      <div className="flex justify-center gap-2 mb-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setRating(star)}
            className="text-2xl transition-transform active:scale-125"
          >
            {star <= rating ? '⭐' : '☆'}
          </button>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={rating === 0}
        className="w-full h-9 bg-sabi-green text-white text-sm font-medium rounded-lg disabled:opacity-40"
      >
        Submit Rating
      </button>
    </div>
  );
}
