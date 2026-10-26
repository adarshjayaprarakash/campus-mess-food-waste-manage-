const crypto = require('crypto');
const { pool, query } = require('../config/db');
const { calculateMealTimes, formatDateKey, isCutoffPassed } = require('../utils/cutoff');

/**
 * Ensures meals exist in the database for a given date.
 * If not present, populates standard BREAKFAST, LUNCH, DINNER entries.
 */
async function ensureMealsForDate(dateStr) {
  const [existing] = await query('SELECT * FROM meals WHERE meal_date = ? ORDER BY start_time ASC', [dateStr]);
  if (existing.length > 0) {
    return existing;
  }

  const mealTypes = ['BREAKFAST', 'LUNCH', 'DINNER'];
  for (const type of mealTypes) {
    const { startTime, endTime, cutoffTime, menu } = calculateMealTimes(type, dateStr);
    const id = crypto.randomUUID();
    await query(
      `INSERT IGNORE INTO meals (id, meal_date, meal_type, start_time, end_time, cutoff_time, menu_description, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [id, dateStr, type, startTime, endTime, cutoffTime, menu]
    );
  }

  const [created] = await query('SELECT * FROM meals WHERE meal_date = ? ORDER BY start_time ASC', [dateStr]);
  return created;
}

/**
 * Resolves a student entity from query, body, or headers.
 */
async function resolveStudent(req) {
  const body = req.body || {};
  const queryParams = req.query || {};
  const headers = req.headers || {};

  const studentId =
    body.student_id ||
    queryParams.student_id ||
    headers['x-student-id'];

  const rollNumber =
    body.roll_number ||
    queryParams.roll_number ||
    headers['x-roll-number'];
    
  if (studentId) {
    const [rows] = await query('SELECT * FROM students WHERE id = ? LIMIT 1', [studentId]);
    if (rows.length > 0) return rows[0];
  }

  if (rollNumber) {
    const [rows] = await query('SELECT * FROM students WHERE roll_number = ? LIMIT 1', [rollNumber]);
    if (rows.length > 0) return rows[0];
  }

  // Fallback to first active student for ease of local demo if no ID specified
  const [firstStudent] = await query("SELECT * FROM students WHERE status = 'ACTIVE' LIMIT 1");
  return firstStudent.length > 0 ? firstStudent[0] : null;
}

/**
 * GET /api/v1/meals/today
 * Returns today's meals, menu, cutoff times, and student's personal response status.
 * Unanswered meals default to EATING.
 */
async function getTodayMeals(req, res, next) {
  try {
    const todayStr = formatDateKey(new Date());
    const meals = await ensureMealsForDate(todayStr);
    const student = await resolveStudent(req);

    // Map each meal and attach student response or default to EATING
    const formattedMeals = await Promise.all(
      meals.map(async (meal) => {
        let userResponse = {
          status: 'EATING',
          is_default: true,
          responded_at: null,
        };

        if (student) {
          const [responses] = await query(
            'SELECT status, is_default, responded_at FROM meal_responses WHERE student_id = ? AND meal_id = ? LIMIT 1',
            [student.id, meal.id]
          );

          if (responses.length > 0) {
            userResponse = {
              status: responses[0].status,
              is_default: Boolean(responses[0].is_default),
              responded_at: responses[0].responded_at ? new Date(responses[0].responded_at).toISOString() : null,
            };
          }
        }

        return {
          id: meal.id,
          meal_type: meal.meal_type,
          start_time: new Date(meal.start_time).toISOString(),
          end_time: new Date(meal.end_time).toISOString(),
          cutoff_time: new Date(meal.cutoff_time).toISOString(),
          is_cutoff_passed: isCutoffPassed(meal.cutoff_time),
          menu: meal.menu_description,
          user_response: userResponse,
        };
      })
    );

    res.json({
      date: todayStr,
      student: student
        ? {
            id: student.id,
            roll_number: student.roll_number,
            full_name: student.full_name,
            hostel_block: student.hostel_block,
          }
        : null,
      meals: formattedMeals,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/meals/:mealId/response
 * Submits or modifies a student's eating intent.
 * Gated by meal cutoff deadline.
 */
async function submitMealResponse(req, res, next) {
  try {
    const { mealId } = req.params;
    const { status } = req.body;

    // Validate status
    if (!status || !['EATING', 'SKIPPING'].includes(status.toUpperCase())) {
      return res.status(400).json({
        error: 'INVALID_STATUS',
        message: 'Response status must be either EATING or SKIPPING',
      });
    }
    const normalizedStatus = status.toUpperCase();

    // Verify student
    const student = await resolveStudent(req);
    if (!student) {
      return res.status(404).json({
        error: 'STUDENT_NOT_FOUND',
        message: 'Student record could not be identified. Please provide student_id or roll_number.',
      });
    }

    // Verify meal existence and cutoff
    const [meals] = await query('SELECT * FROM meals WHERE id = ? LIMIT 1', [mealId]);
    if (meals.length === 0) {
      return res.status(404).json({
        error: 'MEAL_NOT_FOUND',
        message: `Meal session with id ${mealId} was not found.`,
      });
    }
    const meal = meals[0];

   // Enforce cutoff time rule.
    // Demo override is permitted only when explicitly enabled in development.
    const demoMode =
      process.env.NODE_ENV === 'development' &&
      process.env.MEALSYNC_DEMO_MODE === 'true';

    if (!demoMode && isCutoffPassed(meal.cutoff_time)) {
      return res.status(400).json({
        error: 'MEAL_CUTOFF_PASSED',
        message: `The response window for this meal closed at ${new Date(meal.cutoff_time).toISOString()}. Changes are no longer allowed.`,
      });
    }

    // Upsert explicit response
    const responseId = crypto.randomUUID();
    const respondedAt = new Date();

    await query(
      `INSERT INTO meal_responses (id, student_id, meal_id, status, is_default, responded_at)
       VALUES (?, ?, ?, ?, FALSE, ?)
       ON DUPLICATE KEY UPDATE
         status = VALUES(status),
         is_default = FALSE,
         responded_at = VALUES(responded_at),
         updated_at = NOW()`,
      [responseId, student.id, meal.id, normalizedStatus, respondedAt]
    );

    res.status(200).json({
      message: 'Response recorded successfully.',
      meal_id: meal.id,
      student_id: student.id,
      status: normalizedStatus,
      is_default: false,
      responded_at: respondedAt.toISOString(),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/students/profile
 */
async function getStudentProfile(req, res, next) {
  try {
    const student = await resolveStudent(req);
    if (!student) {
      return res.status(404).json({
        error: 'STUDENT_NOT_FOUND',
        message: 'No student found.',
      });
    }

    res.json({
      id: student.id,
      roll_number: student.roll_number,
      full_name: student.full_name,
      email: student.email,
      phone_number: student.phone_number,
      hostel_block: student.hostel_block,
      room_number: student.room_number,
      dietary_preference: student.dietary_preference,
      status: student.status,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getTodayMeals,
  submitMealResponse,
  getStudentProfile,
  ensureMealsForDate,
};
