const { Pool } = require('pg');
require('dotenv').config();

const DEFAULT_DB_URL = 'postgresql://dada_user:dada_pass@localhost:8000/dada_db';
// Use container-safe URL when running inside docker (from .env), otherwise your required DSN
const DB_URL = process.env.DB_URL || DEFAULT_DB_URL;

const pool = new Pool({ connectionString: DB_URL });

pool.on('error', (err) => {
  console.error('Unexpected PG pool error', err);
  process.exit(1);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};
