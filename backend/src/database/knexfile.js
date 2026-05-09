// backend/src/database/knexfile.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

module.exports = {
  development: {
    client: 'pg',
    connection: process.env.DATABASE_URL || 'postgres://sabiwork:sabiwork_dev@localhost:5432/sabiwork',
    migrations: {
      directory: path.resolve(__dirname, '../../migrations')
    },
    pool: {
      min: 2,
      max: 10
    }
  },
  production: {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    migrations: {
      directory: path.resolve(__dirname, '../../migrations')
    },
    pool: {
      min: 2,
      max: 20
    }
  }
};
