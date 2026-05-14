// migrations/013_create_wallet_transactions.js
exports.up = function(knex) {
  return knex.schema.createTable('wallet_transactions', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.string('sender_phone').index();
    table.string('bank_code');
    table.string('account_number');
    table.string('account_name');
    table.integer('amount').notNullable();
    table.string('type').defaultTo('send'); // 'send' or 'withdraw'
    table.string('reference').unique();
    table.string('status').defaultTo('pending'); // 'pending', 'success', 'failed', 'demo_success'
    table.string('nip_ref');
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('wallet_transactions');
};
