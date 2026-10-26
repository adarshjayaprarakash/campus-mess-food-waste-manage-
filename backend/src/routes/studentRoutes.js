const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');

// GET /api/v1/meals/today
router.get('/meals/today', studentController.getTodayMeals);

// POST /api/v1/meals/:mealId/response
router.post('/meals/:mealId/response', studentController.submitMealResponse);

// GET /api/v1/students/profile
router.get('/students/profile', studentController.getStudentProfile);

module.exports = router;
