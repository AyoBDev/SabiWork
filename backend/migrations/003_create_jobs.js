// backend/migrations/003_create_jobs.js
exports.up = async function(knex) {
  await knex.schema.createTable('jobs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('buyer_id').notNullable().references('id').inTable('buyers');
    table.uuid('worker_id').references('id').inTable('workers');
    table.string('service_category', 50).notNullable();
    table.text('description');
    table.string('area', 50);
    table.decimal('location_lat', 9, 6);
    table.decimal('location_lng', 9, 6);
    table.integer('agreed_amount');
    table.string('status', 20).defaultTo('created');
    table.string('transaction_ref', 100);
    table.string('payment_channel', 20);
    table.timestamp('paid_at');
    table.string('payout_ref', 100);
    table.integer('payout_amount');
    table.string('payout_status', 20);
    table.string('payout_nip_ref', 100);
    table.smallint('buyer_rating');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('completed_at');
  });

  await knex.raw('CREATE INDEX idx_jobs_status ON jobs (status)');
  await knex.raw('CREATE INDEX idx_jobs_worker ON jobs (worker_id)');
  await knex.raw('CREATE INDEX idx_jobs_buyer ON jobs (buyer_id)');
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('jobs');
};
