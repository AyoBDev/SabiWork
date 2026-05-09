// backend/migrations/004_create_traders.js
exports.up = async function(knex) {
  await knex.schema.createTable('traders', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('name', 100).notNullable();
    table.string('phone', 15).notNullable().unique();
    table.string('business_type', 50);
    table.string('area', 50);
    table.decimal('location_lat', 9, 6);
    table.decimal('location_lng', 9, 6);
    table.string('virtual_account_number', 10);
    table.integer('sabi_score').defaultTo(0);
    table.integer('total_logged_sales').defaultTo(0);
    table.integer('total_logged_revenue').defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('traders');
};
