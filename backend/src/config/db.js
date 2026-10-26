const mysql = require('mysql2/promise');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from backend/.env if it exists
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT, 10) || 3307,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'campus_mess',
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
};

const pool = mysql.createPool(dbConfig);

/**
 * Executes a parameterized SQL query using the connection pool.
 * @param {string} sql - Parameterized SQL statement
 * @param {Array} params - Array of parameter values
 * @returns {Promise<[Array, Array]>} [rows, fields]
 */
async function query(sql, params = []) {
  return pool.execute(sql, params);
}

/**
 * Tests connection to the MySQL database.
 * @returns {Promise<{ ok: boolean, message: string, serverTime?: string }>}
 */
async function testConnection() {
  try {
    const [rows] = await pool.query('SELECT NOW() AS server_time, 1 + 1 AS test');
    return {
      ok: true,
      message: 'Database connection successful',
      serverTime: rows[0].server_time,
    };
  } catch (error) {
    return {
      ok: false,
      message: error.message,
      code: error.code,
    };
  }
}

module.exports = {
  pool,
  query,
  testConnection,
  dbConfig: {
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    database: dbConfig.database,
  },
};
