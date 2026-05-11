// backend/migrations/012_create_investment_rounds.js
exports.up = async function(knex) {
  await knex.schema.createTable('investment_rounds', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('trader_id').notNullable().references('id').inTable('traders');
    table.integer('target_amount').notNullable();
    table.integer('raised_amount').defaultTo(0);
    table.decimal('interest_rate', 5, 2).notNullable();
    table.decimal('repayment_split', 5, 2).notNullable();
    table.string('reference_prefix', 50).notNullable().unique();
    table.enu('status', ['open', 'funded', 'repaying', 'completed', 'cancelled']).defaultTo('open');
    table.enu('visibility', ['private', 'public']).defaultTo('private');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('funded_at').nullable();
    table.timestamp('completed_at').nullable();
  });

  await knex.schema.createTable('investments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('round_id').notNullable().references('id').inTable('investment_rounds');
    table.string('investor_name', 100).notNullable();
    table.string('investor_phone', 20).notNullable();
    table.string('investor_bank_code', 10).notNullable();
    table.string('investor_account_number', 20).notNullable();
    table.integer('amount').notNullable();
    table.integer('expected_return').notNullable();
    table.integer('repaid_amount').defaultTo(0);
    table.string('reference_code', 50).notNullable().unique();
    table.enu('status', ['active', 'completed']).defaultTo('active');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('completed_at').nullable();
  });

  await knex.schema.createTable('repayment_ledger', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('round_id').notNullable().references('id').inTable('investment_rounds');
    table.uuid('investment_id').notNullable().references('id').inTable('investments');
    table.uuid('sale_id').nullable().references('id').inTable('sales_logs');
    table.integer('amount').notNullable();
    table.string('transfer_ref', 100).nullable();
    table.enu('transfer_status', ['pending', 'success', 'failed']).defaultTo('pending');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.raw('CREATE INDEX idx_investments_round ON investments (round_id)');
  await knex.raw('CREATE INDEX idx_repayment_round ON repayment_ledger (round_id)');
  await knex.raw('CREATE INDEX idx_repayment_investment ON repayment_ledger (investment_id)');
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('repayment_ledger');
  await knex.schema.dropTableIfExists('investments');
  await knex.schema.dropTableIfExists('investment_rounds');
};
