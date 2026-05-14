const knex = require('../database/knex');
const eventBus = require('../utils/eventBus');

async function handleReschedule(intent, { user_id }) {
  let job = null;
  if (user_id) {
    job = await knex('jobs')
      .where(function () {
        this.where('buyer_id', user_id).orWhere('buyer_phone', user_id);
      })
      .whereIn('status', ['pending', 'in_progress'])
      .orderBy('created_at', 'desc')
      .first();
  }

  if (job) {
    eventBus.emit('reschedule_requested', {
      actor: 'AI Engine',
      description: `Reschedule requested for job #${job.id}: "${intent.description}"`,
      metadata: { job_id: job.id, channel: 'chat' }
    });

    return {
      type: 'reschedule_requested',
      message: 'Reschedule request noted. The worker will be notified.',
      data: { job_id: job.id }
    };
  }

  return {
    type: 'reschedule_requested',
    message: 'I don\'t see an active booking to reschedule. Want to find a new worker instead?',
    data: null
  };
}

module.exports = { handleReschedule };
