const express = require('express');
const router = express.Router();
const managerController = require('../controllers/managerController');

// GET /api/v1/manager/meals/:mealId/forecast
router.get('/meals/:mealId/forecast', managerController.getMealForecast);

// POST /api/v1/manager/attendance/scan
router.post('/attendance/scan', managerController.recordAttendance);

// POST /api/v1/manager/meals/:mealId/waste-log
router.post('/meals/:mealId/waste-log', managerController.recordWasteLog);

// GET /api/v1/manager/meals/today
router.get('/meals/today', managerController.getTodayOverview);

module.exports = router;
