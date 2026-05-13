// pwa/src/hooks/useChat.js
import useAppStore from '../stores/appStore';
import api from '../services/api';

export function useChat() {
  const { addMessage, setLoading, setActiveJob } = useAppStore();

  async function send(text) {
    // Add user message
    addMessage({ type: 'text', text, sender: 'user' });
    setLoading(true);

    try {
      const [lng, lat] = useAppStore.getState().mapCenter;
      const response = await api.sendChat(text, {
        user_lat: lat,
        user_lng: lng
      });

      // Process AI response — may contain multiple messages
      const messages = response.messages || [response];

      for (const msg of messages) {
        addMessage({
          type: msg.type || 'text',
          text: msg.text || msg.message,
          data: msg.data,
          sender: 'ai'
        });
      }

      // If response contains a job, track it
      if (response.job) {
        setActiveJob(response.job);
      }
    } catch (err) {
      addMessage({
        type: 'text',
        text: 'Sorry, something went wrong. Try again?',
        sender: 'ai'
      });
    } finally {
      setLoading(false);
    }
  }

  async function bookWorker(worker) {
    addMessage({
      type: 'text',
      text: `Booking ${worker.name}...`,
      sender: 'user'
    });
    setLoading(true);

    try {
      const response = await api.sendChat(`BOOK ${worker.id}`, {
        action: 'book',
        worker_id: worker.id
      });

      const messages = response.messages || [response];
      for (const msg of messages) {
        addMessage({
          type: msg.type || 'text',
          text: msg.text,
          data: msg.data,
          sender: 'ai'
        });
      }

      if (response.job) {
        setActiveJob(response.job);
      }
    } catch (err) {
      addMessage({
        type: 'text',
        text: 'Booking failed. Please try again.',
        sender: 'ai'
      });
    } finally {
      setLoading(false);
    }
  }

  async function submitRating(jobId, rating) {
    try {
      const response = await api.rateJob(jobId, rating);

      if (response.messages) {
        for (const msg of response.messages) {
          addMessage({
            type: msg.type || 'text',
            text: msg.text,
            data: msg.data,
            sender: 'ai'
          });
        }
      }

      setActiveJob(null);
    } catch (err) {
      console.error('Rating failed:', err);
    }
  }

  return { send, bookWorker, submitRating };
}
