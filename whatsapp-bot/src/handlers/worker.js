// whatsapp-bot/src/handlers/worker.js
import { backendAPI } from '../services/api.js';

export async function handleWorkerCommand(phone, command, state, conversations) {
  switch (command) {
    case 'READY':
      try {
        const worker = await backendAPI.getWorkerByPhone(phone);
        await backendAPI.updateAvailability(worker.id, true);
        backendAPI.notifyEvent('worker_availability_changed', {
          actor: worker.name,
          description: `${worker.name} is now AVAILABLE via WhatsApp`,
          metadata: { worker_name: worker.name, is_available: true, channel: 'whatsapp' }
        });
        return `✅ *You're now READY!*

You'll receive job alerts for your area. Stay close to your phone! 📱

🛡️ Trust Score: ${(parseFloat(worker.trust_score || 0) * 100).toFixed(0)}%
📊 SabiScore: ${worker.sabi_score || 0}/100`;
      } catch (err) {
        return `⚠️ Could not update status. Are you registered? Send "register" to start.`;
      }

    case 'BUSY':
      try {
        const worker = await backendAPI.getWorkerByPhone(phone);
        await backendAPI.updateAvailability(worker.id, false);
        backendAPI.notifyEvent('worker_availability_changed', {
          actor: worker.name,
          description: `${worker.name} is now BUSY via WhatsApp`,
          metadata: { worker_name: worker.name, is_available: false, channel: 'whatsapp' }
        });
        return `⏸️ *Status: BUSY*

You won't receive new job alerts until you send READY again.

Rest well! 💤`;
      } catch (err) {
        return `⚠️ Could not update status.`;
      }

    case 'SCORE':
      try {
        const worker = await backendAPI.getWorkerByPhone(phone);
        return formatScores(worker);
      } catch (err) {
        return `⚠️ Could not fetch your scores. Are you registered?`;
      }

    case 'ACCEPT':
      try {
        const ctx = state?.jobAlert;
        if (!ctx) return `No pending job alert. Wait for a new one!`;

        backendAPI.notifyEvent('job_status_changed', {
          actor: phone,
          description: `Worker accepted job via WhatsApp`,
          metadata: { job_id: ctx.job_id, status: 'accepted', channel: 'whatsapp' }
        });

        conversations.set(phone, { ...state, jobAlert: null });
        return `✅ Job accepted! Head to the location. The buyer has been notified.`;
      } catch (err) {
        return `⚠️ Could not accept job: ${err.message}`;
      }

    case 'DECLINE':
      try {
        const ctx = state?.jobAlert;
        if (!ctx) return `No pending job alert.`;

        conversations.set(phone, { ...state, jobAlert: null });
        return `❌ Job declined. You'll get the next one that matches you.`;
      } catch (err) {
        return `⚠️ Error processing decline.`;
      }

    default:
      return null;
  }
}

function formatScores(worker) {
  if (!worker) return 'No score data available.';

  const trustScore = parseFloat(worker.trust_score || 0);
  const sabiScore = worker.sabi_score || 0;
  const trustBar = '█'.repeat(Math.round(trustScore * 10)) + '░'.repeat(10 - Math.round(trustScore * 10));
  const sabiBar = '█'.repeat(Math.round(sabiScore / 10)) + '░'.repeat(10 - Math.round(sabiScore / 10));

  let tier = '🌱 Emerging';
  if (trustScore >= 0.8) tier = '🥇 Elite';
  else if (trustScore >= 0.6) tier = '✅ Verified';
  else if (trustScore >= 0.3) tier = '⭐ Trusted';

  return `📊 *Your SabiWork Scores*

🛡️ *Trust Score:* ${(trustScore * 100).toFixed(0)}%
[${trustBar}]
Tier: ${tier}

💳 *SabiScore:* ${sabiScore}/100
[${sabiBar}]
${sabiScore >= 50 ? '✅ Microloan eligible!' : `📍 ${50 - sabiScore} points to loan`}

📈 *Stats:*
• Jobs completed: ${worker.total_jobs || 0}
• Total earned: ₦${(worker.total_income || 0).toLocaleString()}

Keep working, keep growing! 💪`;
}
