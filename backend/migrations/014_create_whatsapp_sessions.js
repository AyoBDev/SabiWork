// backend/migrations/014_create_whatsapp_sessions.js
exports.up = function(knex) {
  return knex.schema.createTable('whatsapp_sessions', (table) => {
    table.string('key').primary();
    table.jsonb('data').notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('whatsapp_sessions');
};
