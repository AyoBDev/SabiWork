// backend/src/database/knex.js
const knexLib = require('knex');
const knexfile = require('./knexfile');

const env = process.env.NODE_ENV || 'development';
const knex = knexLib(knexfile[env]);

module.exports = knex;
