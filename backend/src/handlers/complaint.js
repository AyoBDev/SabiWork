const knex = require('../database/knex');
const eventBus = require('../utils/eventBus');

async function handleComplaint(intent, { user_id }) {
  let job = null;
  if (user_id) {
    job = await knex('jobs')
      .where(function () {
        this.where('buyer_id', user_id).orWhere('buyer_phone', user_id);
      })
      .where('status', 'in_progress')
      .orderBy('created_at', 'desc')
      .first();
  }

  if (job) {
    await knex('trust_events').insert({
      worker_id: job.worker_id,
      event_type: 'complaint',
      delta: -0.05,
      reason: intent.description || 'Customer complaint',
      source: 'customer',
      created_at: new Date()
    });

    await knex('workers')
      .where({ id: job.worker_id })
      .decrement('trust_score', 0.05);

    eventBus.emit('complaint_filed', {
      actor: 'AI Engine',
      description: `Complaint filed against worker for job #${job.id}`,
      metadata: { job_id: job.id, worker_id: job.worker_id, channel: 'chat' }
    });

    return {
      type: 'complaint_logged',
      message: 'Your complaint has been recorded. We take this seriously.',
      data: { job_id: job.id, worker_id: job.worker_id }
    };
  }

  return {
    type: 'complaint_logged',
    message: 'Your complaint has been recorded. We will follow up.',
    data: null
  };
}

module.exports = { handleComplaint };
