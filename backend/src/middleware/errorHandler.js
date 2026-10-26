/**
 * Centralized error handling middleware.
 */
function errorHandler(err, req, res, next) {
  console.error('Unhandled Application Error:', err);

  // If response already committed, delegate to default express handler
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || err.status || 500;
  const response = {
    error: err.code || 'INTERNAL_SERVER_ERROR',
    message: err.message || 'An unexpected server error occurred',
  };

  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

module.exports = errorHandler;
