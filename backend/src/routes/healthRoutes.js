const express = require('express');
const router = express.Router();
const healthController = require('../controllers/healthController');

// GET /health and GET /api/v1/health
router.get('/health', healthController.getHealth);

module.exports = router;
