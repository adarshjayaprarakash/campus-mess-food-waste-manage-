const crypto = require('crypto');
const { query } = require('../config/db');
const { isCutoffPassed } = require('../utils/cutoff');

/**
 * GET /api/v1/manager/meals/:mealId/forecast
 * Headcount predictions and dietary breakdown for kitchen managers.
 */
async function getMealForecast(req, res, next) {
  try {
    const { mealId } = req.params;

    const [meals] = await query('SELECT * FROM meals WHERE id = ? LIMIT 1', [mealId]);
    if (meals.length === 0) {
      return res.status(404).json({
        error: 'MEAL_NOT_FOUND',
        message: `Meal with id ${mealId} not found`,
      });
    }
    const meal = meals[0];

    // 1. Total active eligible students
    const [totalRows] = await query("SELECT COUNT(*) AS total FROM students WHERE status = 'ACTIVE'");
    const totalEligible = totalRows[0].total || 0;

    // 2. Explicit responses
    const [responseRows] = await query(
      `SELECT 
         SUM(CASE WHEN status = 'EATING' THEN 1 ELSE 0 END) AS explicit_eating,
         SUM(CASE WHEN status = 'SKIPPING' THEN 1 ELSE 0 END) AS explicit_skipping
       FROM meal_responses 
       WHERE meal_id = ?`,
      [mealId]
    );

    const explicitEating = Number(responseRows[0].explicit_eating) || 0;
    const explicitSkipping = Number(responseRows[0].explicit_skipping) || 0;

    // 3. Unanswered default eating rule: Total - (Explicit Eating + Explicit Skipping)
    const unansweredDefaultEating = Math.max(0, totalEligible - (explicitEating + explicitSkipping));
    // Final expected headcount: Explicit Eating + Default Eating = Total - Explicit Skipping
    const totalExpectedHeadcount = explicitEating + unansweredDefaultEating;

    // 4. Dietary breakdown of expected eaters (students who did not skip)
    const [dietRows] = await query(
      `SELECT s.dietary_preference, COUNT(*) AS count
       FROM students s
       WHERE s.status = 'ACTIVE'
         AND s.id NOT IN (
           SELECT student_id FROM meal_responses WHERE meal_id = ? AND status = 'SKIPPING'
         )
       GROUP BY s.dietary_preference`,
      [mealId]
    );

    const dietaryBreakdown = {
      veg: 0,
      non_veg: 0,
      jain: 0,
      eggitarian: 0,
    };

    dietRows.forEach((row) => {
      const key = (row.dietary_preference || '').toLowerCase();
      if (key === 'veg') dietaryBreakdown.veg = row.count;
      else if (key === 'non_veg') dietaryBreakdown.non_veg = row.count;
      else if (key === 'jain') dietaryBreakdown.jain = row.count;
      else if (key === 'eggitarian') dietaryBreakdown.eggitarian = row.count;
    });

    // 5. Estimated food savings: Standard portion raw material factor (0.4 kg/plate)
    const skippedPlates = explicitSkipping;
    const estimatedRawMaterialSavedKg = Number((skippedPlates * 0.4).toFixed(2));

    res.json({
      meal_id: meal.id,
      meal_type: meal.meal_type,
      meal_date: meal.meal_date,
      cutoff_time: new Date(meal.cutoff_time).toISOString(),
      is_cutoff_passed: isCutoffPassed(meal.cutoff_time),
      counts: {
        total_eligible_students: totalEligible,
        explicit_eating: explicitEating,
        explicit_skipping: explicitSkipping,
        unanswered_default_eating: unansweredDefaultEating,
        total_expected_headcount: totalExpectedHeadcount,
        dietary_breakdown: dietaryBreakdown,
      },
      estimated_food_savings: {
        skipped_plates: skippedPlates,
        estimated_raw_material_saved_kg: estimatedRawMaterialSavedKg,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/manager/attendance/scan
 * Scans student roll number / QR code at the dining hall entrance.
 */
async function recordAttendance(req, res, next) {
  try {
    const { meal_id, roll_number, scanner_station } = req.body;

    if (!meal_id || !roll_number) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Both meal_id and roll_number are required.',
      });
    }

    // 1. Verify meal
    const [meals] = await query('SELECT * FROM meals WHERE id = ? LIMIT 1', [meal_id]);
    if (meals.length === 0) {
      return res.status(404).json({
        error: 'MEAL_NOT_FOUND',
        message: `Meal session with id ${meal_id} was not found.`,
      });
    }
    const meal = meals[0];

    // 2. Verify student
    const [students] = await query('SELECT * FROM students WHERE roll_number = ? LIMIT 1', [roll_number.trim()]);
    if (students.length === 0) {
      return res.status(404).json({
        error: 'STUDENT_NOT_FOUND',
        message: `No registered student found with roll number ${roll_number}.`,
      });
    }
    const student = students[0];

    // 3. Check for duplicate scan
    const [existingAttendance] = await query(
      'SELECT * FROM attendance WHERE student_id = ? AND meal_id = ? LIMIT 1',
      [student.id, meal.id]
    );

    if (existingAttendance.length > 0) {
      return res.status(409).json({
        error: 'DUPLICATE_SCAN',
        message: `Student ${student.roll_number} already checked in at ${new Date(existingAttendance[0].scanned_at).toISOString()}.`,
      });
    }

    // 4. Check prior response to determine flag (Normal vs Unplanned Walk-In)
    const [responses] = await query(
      'SELECT status FROM meal_responses WHERE student_id = ? AND meal_id = ? LIMIT 1',
      [student.id, meal.id]
    );

    let priorResponse = 'EATING'; // default if unanswered
    let attendanceStatus = 'ATTENDED';
    let flag = 'NORMAL';

    if (responses.length > 0) {
      priorResponse = responses[0].status;
      if (priorResponse === 'SKIPPING') {
        attendanceStatus = 'WALK_IN';
        flag = 'UNPLANNED_WALK_IN';
      }
    }

    // 5. Insert attendance record
    const attendanceId = crypto.randomUUID();
    const scannedAt = new Date();
    const station = scanner_station || 'MAIN_GATE_DESK';

    await query(
      `INSERT INTO attendance (id, student_id, meal_id, scanned_at, verified_by, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [attendanceId, student.id, meal.id, scannedAt, station, attendanceStatus]
    );

    res.status(200).json({
      status: 'SUCCESS',
      student: {
        roll_number: student.roll_number,
        full_name: student.full_name,
        dietary_preference: student.dietary_preference,
      },
      prior_response: priorResponse,
      flag: flag,
    });
  } catch (error) {
    // Catch unique constraint race condition
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: 'DUPLICATE_SCAN',
        message: 'Duplicate scan detected. Student has already checked in.',
      });
    }
    next(error);
  }
}

/**
 * POST /api/v1/manager/meals/:mealId/waste-log
 * Records kitchen food preparation vs actual wasted weight.
 */
async function recordWasteLog(req, res, next) {
  try {
    const { mealId } = req.params;
    const { prepared_weight_kg, wasted_weight_kg, consumed_weight_kg, remarks } = req.body;

    if (prepared_weight_kg == null || wasted_weight_kg == null) {
      return res.status(400).json({
        error: 'INVALID_INPUT',
        message: 'prepared_weight_kg and wasted_weight_kg are required.',
      });
    }

    const prep = parseFloat(prepared_weight_kg);
    const waste = parseFloat(wasted_weight_kg);
    const consumed = consumed_weight_kg != null ? parseFloat(consumed_weight_kg) : Math.max(0, prep - waste);

    const [meals] = await query('SELECT id FROM meals WHERE id = ? LIMIT 1', [mealId]);
    if (meals.length === 0) {
      return res.status(404).json({
        error: 'MEAL_NOT_FOUND',
        message: `Meal session with id ${mealId} was not found.`,
      });
    }

    const logId = crypto.randomUUID();
    const recordedAt = new Date();

    await query(
      `INSERT INTO waste_logs (id, meal_id, prepared_weight_kg, consumed_weight_kg, wasted_weight_kg, remarks, recorded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [logId, mealId, prep, consumed, waste, remarks || null, recordedAt]
    );

    res.status(201).json({
      message: 'Waste log recorded successfully.',
      waste_log: {
        id: logId,
        meal_id: mealId,
        prepared_weight_kg: prep,
        consumed_weight_kg: consumed,
        wasted_weight_kg: waste,
        remarks: remarks || null,
        recorded_at: recordedAt.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/manager/meals/today
 * Overview of all meals for today with active counts.
 */
async function getTodayOverview(req, res, next) {
  try {
    const [meals] = await query('SELECT * FROM meals WHERE meal_date = CURDATE() ORDER BY start_time ASC');

    const mealSummaries = await Promise.all(
      meals.map(async (m) => {
        const [attCount] = await query('SELECT COUNT(*) AS count FROM attendance WHERE meal_id = ?', [m.id]);
        const [skipsCount] = await query("SELECT COUNT(*) AS count FROM meal_responses WHERE meal_id = ? AND status = 'SKIPPING'", [m.id]);
        const [eatsCount] = await query("SELECT COUNT(*) AS count FROM meal_responses WHERE meal_id = ? AND status = 'EATING'", [m.id]);

        return {
          id: m.id,
          meal_type: m.meal_type,
          start_time: m.start_time,
          end_time: m.end_time,
          cutoff_time: m.cutoff_time,
          is_cutoff_passed: isCutoffPassed(m.cutoff_time),
          actual_attendance: attCount[0].count,
          explicit_eating: eatsCount[0].count,
          explicit_skipping: skipsCount[0].count,
        };
      })
    );

    res.json({
      date: new Date().toISOString().split('T')[0],
      meals: mealSummaries,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getMealForecast,
  recordAttendance,
  recordWasteLog,
  getTodayOverview,
};
