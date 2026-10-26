const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

async function initDb() {
  console.log('Initializing database schema...');

  const schemaPath = path.resolve(__dirname, '../../schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  // Remove full-line SQL comments, then split statements.
  const cleanedSql = sql
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');

  const statements = cleanedSql
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);

  const connection = await pool.getConnection();

  try {
    for (const statement of statements) {
      await connection.query(statement);
    }

    const [tables] = await connection.query('SHOW TABLES');

    console.log('Tables found in connected database:');
    console.table(tables);

    if (tables.length < 6) {
      throw new Error(
        `Expected at least 6 tables, but found ${tables.length}.`
      );
    }

    console.log('Database schema created and verified successfully.');
  } catch (err) {
    console.error('Failed to initialize database schema:', err.message);
    throw err;
  } finally {
    connection.release();
  }
}

if (require.main === module) {
  initDb()
    .then(() => {
      console.log('Schema initialization complete.');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { initDb };