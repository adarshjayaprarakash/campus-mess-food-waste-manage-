const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from backend/.env if available
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const healthRoutes = require('./routes/healthRoutes');
const studentRoutes = require('./routes/studentRoutes');
const managerRoutes = require('./routes/managerRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Routes (at root and under /api/v1)
app.use('/', healthRoutes);
app.use('/api/v1', healthRoutes);

// Core Business Domain Routes
app.use('/api/v1', studentRoutes);
app.use('/api/v1/manager', managerRoutes);

// 404 Handler for Unrecognized Endpoints
app.use((req, res) => {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

// Start server if executed directly
let server;
if (require.main === module) {
  server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(` Campus Mess Food Waste Reduction API`);
    console.log(` Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
    console.log(` Health check available at: http://localhost:${PORT}/health`);
    console.log(` Student meals available at: http://localhost:${PORT}/api/v1/meals/today`);
    console.log(`=======================================================`);
  });
}

module.exports = { app, server };
