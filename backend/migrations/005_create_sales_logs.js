// backend/migrations/005_create_sales_logs.js
exports.up = async function(knex) {
  await knex.schema.createTable('sales_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('trader_id').notNullable().references('id').inTable('traders');
    table.integer('amount').notNullable();
    table.string('item_name', 100);
    table.integer('quantity');
    table.string('category', 50);
    table.string('payment_method', 20).defaultTo('cash');
    table.string('squad_ref', 100);
    table.timestamp('logged_at').defaultTo(knex.fn.now());
  });

  await knex.raw('CREATE INDEX idx_sales_trader_date ON sales_logs (trader_id, logged_at DESC)');
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('sales_logs');
};
