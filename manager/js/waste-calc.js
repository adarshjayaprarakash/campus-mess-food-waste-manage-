'use strict';

// ============================================================
// CAMPUS MESS — WASTE CALCULATION FUNCTIONS (Pure / No DOM)
//
// All formulas are taken verbatim from:
//   docs/manager-dashboard-plan.md  §4.4 FoodWasteReportSection
//
// buffer(meal)   = ceil(eatingCount × bufferPct / 100)
// prepared(meal) = eatingCount + buffer(meal)
// surplus(meal)  = max(prepared(meal) − eatingCount, 0)
// wasteKg(meal)  = surplus(meal) × wasteKgPerSurplusMeal
// ============================================================

/**
 * Returns the preparation buffer for one meal.
 * @param {number} eatingCount
 * @param {number} bufferPercent  e.g. 20 means 20 %
 * @returns {number}
 */
function calcBuffer(eatingCount, bufferPercent) {
  return Math.ceil(eatingCount * bufferPercent / 100);
}

/**
 * Full waste metrics for a single meal slot.
 * @param {number} eatingCount
 * @param {number} bufferPercent
 * @param {number} wasteKgPerSurplus
 * @returns {{ prepared: number, surplus: number, wasteKg: number }}
 */
function calcMealWaste(eatingCount, bufferPercent, wasteKgPerSurplus) {
  const buffer   = calcBuffer(eatingCount, bufferPercent);
  const prepared = eatingCount + buffer;
  const surplus  = Math.max(prepared - eatingCount, 0);
  const wasteKg  = parseFloat((surplus * wasteKgPerSurplus).toFixed(2));
  return { prepared, surplus, wasteKg };
}

/**
 * Waste metrics across all meal slots for one day.
 * @param {{ breakfast, lunch, dinner }} mealsData  Each slot has .eating
 * @param {{ BUFFER_PERCENT, WASTE_KG_PER_SURPLUS_MEAL, MEAL_ORDER }} cfg
 * @returns {{ meals: object, total: object }}
 */
function calcDailyWaste(mealsData, cfg) {
  const results = {};
  let totalPrepared = 0;
  let totalEaten    = 0;
  let totalSurplus  = 0;
  let totalWasteKg  = 0;

  for (const slot of cfg.MEAL_ORDER) {
    const eating = (mealsData[slot] && mealsData[slot].eating) || 0;
    const { prepared, surplus, wasteKg } = calcMealWaste(
      eating,
      cfg.BUFFER_PERCENT,
      cfg.WASTE_KG_PER_SURPLUS_MEAL
    );
    results[slot]  = { eating, prepared, surplus, wasteKg };
    totalPrepared += prepared;
    totalEaten    += eating;
    totalSurplus  += surplus;
    totalWasteKg  += wasteKg;
  }

  return {
    meals: results,
    total: {
      prepared: totalPrepared,
      eaten:    totalEaten,
      surplus:  totalSurplus,
      wasteKg:  parseFloat(totalWasteKg.toFixed(2)),
    },
  };
}

/**
 * Aggregate response counts across all meal slots for the DailySummaryBar.
 * NOTE: counts are student-meal pairs, NOT unique students.
 * @param {{ breakfast, lunch, dinner }} mealsData
 * @param {number} totalStudents
 * @param {string[]} mealOrder
 * @returns {{ totalEating, totalSkipping, totalNoResponse, avgResponseRate }}
 */
function calcDailySummary(mealsData, totalStudents, mealOrder) {
  let totalEating     = 0;
  let totalSkipping   = 0;
  let totalNoResponse = 0;

  for (const slot of mealOrder) {
    const m = mealsData[slot] || {};
    totalEating     += m.eating     || 0;
    totalSkipping   += m.skipping   || 0;
    totalNoResponse += m.noResponse || 0;
  }

  const totalPossible = totalStudents * mealOrder.length;
  const totalResponded = totalPossible - totalNoResponse;
  const avgResponseRate = totalPossible > 0
    ? parseFloat((totalResponded / totalPossible * 100).toFixed(1))
    : 0;

  return { totalEating, totalSkipping, totalNoResponse, avgResponseRate };
}

// Namespace export
const WasteCalc = { calcBuffer, calcMealWaste, calcDailyWaste, calcDailySummary };
