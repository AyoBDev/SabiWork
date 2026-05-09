// backend/migrations/011_create_agents.js
exports.up = async function(knex) {
  await knex.schema.createTable('agents', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('name', 100).notNullable();
    table.string('phone', 15).notNullable().unique();
    table.string('area_assigned', 50);
    table.integer('workers_onboarded').defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('agents');
};
