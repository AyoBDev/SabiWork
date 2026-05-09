// backend/migrations/009_create_trust_events.js
exports.up = async function(knex) {
  await knex.schema.createTable('trust_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('worker_id').notNullable().references('id').inTable('workers');
    table.string('event_type', 30).notNullable();
    table.decimal('score_delta', 5, 4).notNullable();
    table.decimal('score_after', 4, 3).notNullable();
    table.uuid('job_id').references('id').inTable('jobs');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.raw('CREATE INDEX idx_trust_worker ON trust_events (worker_id, created_at DESC)');
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('trust_events');
};
