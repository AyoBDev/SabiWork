// backend/migrations/008_create_demand_signals.js
exports.up = async function(knex) {
  // Enable TimescaleDB extension (only if available)
  const hasTimescale = await knex.raw(`SELECT EXISTS(SELECT 1 FROM pg_available_extensions WHERE name = 'timescaledb') as available`);
  if (hasTimescale.rows[0]?.available) {
    await knex.raw('CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE');
  }

  await knex.schema.createTable('demand_signals', (table) => {
    table.uuid('id').defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('trade_category', 50).notNullable();
    table.string('area', 50);
    table.decimal('location_lat', 9, 6);
    table.decimal('location_lng', 9, 6);
    table.string('request_type', 20).defaultTo('buyer_request');
    table.integer('amount');
    table.boolean('matched').defaultTo(false);
    table.string('payment_channel', 20);
    table.timestamp('recorded_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  // Convert to TimescaleDB hypertable (only if extension loaded)
  if (hasTimescale.rows[0]?.available) {
    await knex.raw("SELECT create_hypertable('demand_signals', 'recorded_at')");
  }

  await knex.raw('CREATE INDEX idx_demand_trade_area ON demand_signals (trade_category, area)');
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('demand_signals');
};
