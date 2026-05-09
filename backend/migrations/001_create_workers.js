// backend/migrations/001_create_workers.js
exports.up = async function(knex) {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  await knex.schema.createTable('workers', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('name', 100).notNullable();
    table.string('phone', 15).notNullable().unique();
    table.string('primary_trade', 50).notNullable();
    table.specificType('secondary_trades', 'TEXT[]').defaultTo('{}');
    table.specificType('service_areas', 'TEXT[]').defaultTo('{}');
    table.decimal('location_lat', 9, 6);
    table.decimal('location_lng', 9, 6);
    table.string('bank_code', 10);
    table.string('account_number', 10);
    table.string('account_name', 100);
    table.string('virtual_account_number', 10);
    table.decimal('trust_score', 4, 3).defaultTo(0.0);
    table.integer('sabi_score').defaultTo(0);
    table.integer('total_jobs').defaultTo(0);
    table.integer('total_income').defaultTo(0);
    table.boolean('accepts_apprentices').defaultTo(false);
    table.integer('apprentice_slots').defaultTo(0);
    table.boolean('is_available').defaultTo(true);
    table.string('onboarding_channel', 20).defaultTo('whatsapp');
    table.uuid('onboarded_by');
    table.string('photo_url', 255);
    table.boolean('gps_verified').defaultTo(false);
    table.timestamp('last_active_at').defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.raw('CREATE INDEX idx_workers_trade ON workers (primary_trade)');
  await knex.raw('CREATE INDEX idx_workers_trust ON workers (trust_score DESC)');
  await knex.raw('CREATE INDEX idx_workers_areas ON workers USING GIN (service_areas)');
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('workers');
};
