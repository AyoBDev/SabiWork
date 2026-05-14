// backend/migrations/014_create_whatsapp_sessions.js
exports.up = function(knex) {
  return knex.raw(`
    CREATE TABLE IF NOT EXISTS whatsapp_sessions (
      key VARCHAR(255) PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('whatsapp_sessions');
};
