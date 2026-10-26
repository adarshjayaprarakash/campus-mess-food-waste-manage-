const { testConnection, dbConfig } = require('../config/db');

/**
 * Health check endpoint.
 * Validates API process and MySQL database connectivity.
 */
async function getHealth(req, res) {
  const dbHealth = await testConnection();

  const response = {
    status: dbHealth.ok ? 'OK' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    uptime_seconds: process.uptime(),
    node_version: process.version,
    database: {
      status: dbHealth.ok ? 'CONNECTED' : 'DISCONNECTED',
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      message: dbHealth.message,
      ...(dbHealth.serverTime && { server_time: dbHealth.serverTime }),
      ...(dbHealth.code && { error_code: dbHealth.code }),
    },
  };

  const statusCode = dbHealth.ok ? 200 : 503;
  res.status(statusCode).json(response);
}

module.exports = { getHealth };
