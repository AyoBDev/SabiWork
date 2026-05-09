// backend/migrations/010_create_webhook_events.js
exports.up = async function(knex) {
  await knex.schema.createTable('webhook_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('transaction_ref', 100).notNullable();
    table.string('event_type', 50);
    table.jsonb('payload');
    table.boolean('processed').defaultTo(false);
    table.timestamp('received_at').defaultTo(knex.fn.now());
  });

  await knex.raw('CREATE UNIQUE INDEX idx_webhook_ref ON webhook_events (transaction_ref)');
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('webhook_events');
};
