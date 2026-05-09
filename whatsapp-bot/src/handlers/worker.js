// whatsapp-bot/src/handlers/worker.js
import { backendAPI } from '../services/api.js';

export async function handleWorkerCommand(phone, command, state, conversations) {
  switch (command) {
    case 'READY':
      try {
        const worker = await backendAPI.getWorkerByPhone(phone);
        await backendAPI.updateAvailability(worker.id, true);
        return `✅ *You're now READY!*

You'll receive job alerts for your area. Stay close to your phone! 📱

Current Trust Score: ${(worker.trust_score * 100).toFixed(0)}%
SabiScore: ${worker.sabi_score}/100`;
      } catch (err) {
        return `⚠️ Could not update status. Are you registered? Send "register" to start.`;
      }

    case 'BUSY':
      try {
        const worker = await backendAPI.getWorkerByPhone(phone);
        await backendAPI.updateAvailability(worker.id, false);
        return `⏸️ *Status: BUSY*

You won't receive new job alerts until you send READY again.

Rest well! 💤`;
      } catch (err) {
        return `⚠️ Could not update status.`;
      }

    case 'SCORE':
      try {
        const scores = await backendAPI.getScores(phone);
        return formatScores(scores);
      } catch (err) {
        return `⚠️ Could not fetch your scores. Are you registered?`;
      }

    case 'ACCEPT':
      try {
        const ctx = state?.jobAlert;
        if (!ctx) return `No pending job alert. Wait for a new one!`;

        const response = await backendAPI.chat('ACCEPT', {
          action: 'accept_job',
          job_id: ctx.job_id,
          phone
        });

        conversations.set(phone, { ...state, jobAlert: null });
        return response.messages?.[0]?.text || `✅ Job accepted! Head to the location. The buyer has been notified.`;
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

function formatScores(scores) {
  if (!scores) return 'No score data available.';

  const trustBar = '█'.repeat(Math.round(scores.trust_score * 10)) + '░'.repeat(10 - Math.round(scores.trust_score * 10));
  const sabiBar = '█'.repeat(Math.round(scores.sabi_score / 10)) + '░'.repeat(10 - Math.round(scores.sabi_score / 10));

  let tier = 'Emerging';
  if (scores.trust_score >= 0.8) tier = '🥇 Elite';
  else if (scores.trust_score >= 0.6) tier = '✅ Verified';
  else if (scores.trust_score >= 0.3) tier = '⭐ Trusted';
  else tier = '🌱 Emerging';

  return `📊 *Your SabiWork Scores*

🛡️ *Trust Score:* ${(scores.trust_score * 100).toFixed(0)}%
[${trustBar}]
Tier: ${tier}

💳 *SabiScore:* ${scores.sabi_score}/100
[${sabiBar}]
${scores.sabi_score >= 50 ? '✅ Microloan eligible!' : `📍 ${50 - scores.sabi_score} points to loan`}

📈 *Stats:*
• Jobs completed: ${scores.total_jobs || 0}
• Total earned: ₦${(scores.total_income || 0).toLocaleString()}
• This month: ₦${(scores.monthly_income || 0).toLocaleString()}

Keep working, keep growing! 💪`;
}
