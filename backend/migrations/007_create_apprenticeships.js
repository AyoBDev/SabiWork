// backend/migrations/007_create_apprenticeships.js
exports.up = async function(knex) {
  await knex.schema.createTable('apprenticeships', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('master_worker_id').notNullable().references('id').inTable('workers');
    table.uuid('apprentice_id').notNullable().references('id').inTable('seekers');
    table.string('trade', 50).notNullable();
    table.integer('duration_weeks');
    table.integer('weekly_stipend');
    table.string('status', 20).defaultTo('active');
    table.integer('milestones_completed').defaultTo(0);
    table.integer('total_milestones').defaultTo(8);
    table.timestamp('started_at').defaultTo(knex.fn.now());
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('apprenticeships');
};
