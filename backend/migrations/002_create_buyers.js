// backend/migrations/002_create_buyers.js
exports.up = async function(knex) {
  await knex.schema.createTable('buyers', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('name', 100).notNullable();
    table.string('phone', 15).notNullable().unique();
    table.string('email', 100);
    table.string('area', 50);
    table.decimal('location_lat', 9, 6);
    table.decimal('location_lng', 9, 6);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('buyers');
};
