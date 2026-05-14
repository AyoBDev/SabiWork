const knex = require('../database/knex');
const eventBus = require('../utils/eventBus');

async function handleFeedback(intent, { user_id }) {
  let job = null;
  if (user_id) {
    job = await knex('jobs')
      .where(function () {
        this.where('buyer_id', user_id).orWhere('buyer_phone', user_id);
      })
      .whereIn('status', ['completed', 'in_progress'])
      .orderBy('created_at', 'desc')
      .first();
  }

  if (job) {
    await knex('trust_events').insert({
      worker_id: job.worker_id,
      event_type: 'positive_review',
      delta: 0.03,
      reason: intent.description || 'Positive customer feedback',
      source: 'customer',
      created_at: new Date()
    });

    await knex('workers')
      .where({ id: job.worker_id })
      .increment('trust_score', 0.03);

    const worker = await knex('workers').where({ id: job.worker_id }).first();

    eventBus.emit('feedback_received', {
      actor: 'AI Engine',
      description: `Positive feedback for ${worker?.name || 'worker'}`,
      metadata: { job_id: job.id, worker_id: job.worker_id, channel: 'chat' }
    });

    return {
      type: 'feedback_logged',
      message: 'Feedback recorded. Thanks for rating!',
      data: { worker_name: worker?.name, worker_id: job.worker_id }
    };
  }

  return {
    type: 'feedback_logged',
    message: 'Thanks for the feedback! We appreciate you sharing.',
    data: null
  };
}

module.exports = { handleFeedback };
