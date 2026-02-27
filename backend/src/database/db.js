import pg from 'pg';
import config from '../config/index.js';
import logger from '../utils/logger.js';

const { Pool } = pg;

const pool = new Pool({
  connectionString: config.database.url,
  min: config.database.poolMin,
  max: config.database.poolMax,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected database pool error');
});

pool.on('connect', () => {
  logger.debug('New database connection established');
});

/**
 * Execute a query with automatic connection management.
 * @param {string} text - SQL query text
 * @param {any[]} params - Query parameters
 * @returns {Promise<pg.QueryResult>}
 */
export async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;

  logger.debug({
    query: text.substring(0, 100),
    duration,
    rows: result.rowCount,
  }, 'Executed query');

  return result;
}

/**
 * Get a client from the pool for transaction use.
 * Caller MUST call client.release() when done.
 * @returns {Promise<pg.PoolClient>}
 */
export async function getClient() {
  const client = await pool.query ? pool.connect() : pool.connect();
  return client;
}

/**
 * Execute a function within a database transaction.
 * @param {(client: pg.PoolClient) => Promise<T>} fn 
 * @returns {Promise<T>}
 */
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export default pool;
