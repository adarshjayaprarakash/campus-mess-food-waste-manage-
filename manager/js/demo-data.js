'use strict';

// ============================================================
// CAMPUS MESS — DATA ADAPTER & DEMO FALLBACK
//
// Bridges the manager UI with:
// 1. Live Backend (http://172.17.243.12:5000/api/v1) via ApiClient
// 2. Offline Demo Scenarios (from docs/manager-dashboard-plan.md §3)
// ============================================================

// ── Offline Demo Adapter ─────────────────────────────────────
const DemoAdapter = (function() {
  const _SCENARIO_A_MEALS = {
    breakfast: { eating: 78,  skipping: 22, noResponse: 20 },
    lunch:     { eating: 105, skipping: 10, noResponse: 5  },
    dinner:    { eating: 60,  skipping: 35, noResponse: 25 },
  };

  const _SCENARIO_B_MEALS = {
    breakfast: { eating: 30, skipping: 70, noResponse: 20 },
    lunch:     { eating: 55, skipping: 50, noResponse: 15 },
    dinner:    { eating: 25, skipping: 80, noResponse: 15 },
  };

  const _UNANSWERED_A = [
    { studentId: 'A101', slots: ['breakfast', 'dinner'] },
    { studentId: 'A107', slots: ['lunch', 'dinner'] },
    { studentId: 'A119', slots: ['breakfast'] },
    { studentId: 'B203', slots: ['breakfast', 'lunch', 'dinner'] },
    { studentId: 'B210', slots: ['breakfast', 'dinner'] },
    { studentId: 'B225', slots: ['dinner'] },
    { studentId: 'C015', slots: ['breakfast', 'lunch'] },
    { studentId: 'C022', slots: ['dinner'] },
    { studentId: 'C031', slots: ['breakfast', 'dinner'] },
    { studentId: 'D009', slots: ['lunch', 'dinner'] },
  ];

  const _UNANSWERED_B = [
    { studentId: 'A101', slots: ['breakfast'] },
    { studentId: 'C030', slots: ['breakfast', 'lunch'] },
    { studentId: 'D009', slots: ['dinner'] },
  ];

  function _daysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  }

  function _delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function fetchDailySummary(dateStr) {
    await _delay(150);
    const today = _daysAgo(0);
    const yesterday = _daysAgo(1);

    if (dateStr === today) {
      return { date: dateStr, totalStudents: 120, meals: _SCENARIO_A_MEALS, isDemo: true };
    }
    if (dateStr === yesterday) {
      return { date: dateStr, totalStudents: 120, meals: _SCENARIO_B_MEALS, isDemo: true };
    }

    return {
      date: dateStr,
      totalStudents: 120,
      meals: {
        breakfast: { eating: 0, skipping: 0, noResponse: 120 },
        lunch:     { eating: 0, skipping: 0, noResponse: 120 },
        dinner:    { eating: 0, skipping: 0, noResponse: 120 },
      },
      isDemo: true,
    };
  }

  async function fetchUnanswered(dateStr) {
    await _delay(100);
    const today = _daysAgo(0);
    const yesterday = _daysAgo(1);

    if (dateStr === today)     return { date: dateStr, unanswered: _UNANSWERED_A, isDemo: true };
    if (dateStr === yesterday) return { date: dateStr, unanswered: _UNANSWERED_B, isDemo: true };
    return { date: dateStr, unanswered: [], isDemo: true };
  }

  return { fetchDailySummary, fetchUnanswered };
})();

// ── Unified Data Adapter ─────────────────────────────────────
const DataAdapter = (function() {
  function getMode() {
    try {
      const mode = localStorage.getItem(CONFIG.STORAGE_KEYS.MODE);
      return mode || 'live';
    } catch (_) {
      return 'live';
    }
  }

  function setMode(mode) {
    try {
      localStorage.setItem(CONFIG.STORAGE_KEYS.MODE, mode);
    } catch (_) {}
  }

  /**
   * Fetches daily meal responses.
   * If live mode: queries GET /manager/meals/today and GET /manager/meals/:mealId/forecast
   * If demo mode: queries DemoAdapter
   */
  async function fetchDailySummary(dateStr) {
    const mode = getMode();
    const today = new Date().toISOString().slice(0, 10);

    if (mode === 'demo') {
      const demoRes = await DemoAdapter.fetchDailySummary(dateStr);
      demoRes.isLive = false;
      return demoRes;
    }

    // Backend specifically manages today's active meal sessions (CURDATE())
    if (dateStr !== today) {
      const hist = await DemoAdapter.fetchDailySummary(dateStr);
      hist.isLive = false;
      hist.isHistoricalArchive = true;
      return hist;
    }

    // LIVE BACKEND CALLS
    const overview = await ApiClient.getTodayMeals();
    if (!overview || !Array.isArray(overview.meals)) {
      throw new Error('Unexpected response format from /manager/meals/today');
    }

    const mealsObj = {};
    let totalEligibleStudents = CONFIG.TOTAL_STUDENTS;

    // Parallel forecast lookups for each meal returned from today's schedule
    const forecastResults = await Promise.all(
      overview.meals.map(async (m) => {
        try {
          const forecast = await ApiClient.getMealForecast(m.id);
          return { meal: m, forecast };
        } catch (err) {
          console.warn(`[DataAdapter] Forecast fetch failed for meal ${m.id}:`, err);
          return { meal: m, forecast: null };
        }
      })
    );

    forecastResults.forEach(({ meal, forecast }) => {
      const slot = (meal.meal_type || '').toLowerCase(); // 'breakfast', 'lunch', 'dinner'
      const counts = (forecast && forecast.counts) || {};

      const eligible = Number(counts.total_eligible_students) || totalEligibleStudents;
      if (eligible > totalEligibleStudents || totalEligibleStudents === CONFIG.TOTAL_STUDENTS) {
        totalEligibleStudents = eligible;
      }

      const explicitEating = Number(meal.explicit_eating != null ? meal.explicit_eating : counts.explicit_eating) || 0;
      const explicitSkipping = Number(meal.explicit_skipping != null ? meal.explicit_skipping : counts.explicit_skipping) || 0;
      const unansweredDefaultEating = Number(
        counts.unanswered_default_eating != null
          ? counts.unanswered_default_eating
          : Math.max(0, eligible - (explicitEating + explicitSkipping))
      );
      const totalExpected = Number(
        counts.total_expected_headcount != null
          ? counts.total_expected_headcount
          : explicitEating + unansweredDefaultEating
      );

      const savingsKg = (forecast && forecast.estimated_food_savings && forecast.estimated_food_savings.estimated_raw_material_saved_kg) || 0;

      mealsObj[slot] = {
        mealId: meal.id,
        mealType: meal.meal_type,
        startTime: meal.start_time,
        endTime: meal.end_time,
        cutoffTime: meal.cutoff_time,
        isCutoffPassed: meal.is_cutoff_passed,
        actualAttendance: Number(meal.actual_attendance) || 0,
        eating: explicitEating,
        skipping: explicitSkipping,
        noResponse: unansweredDefaultEating,
        totalEligible: eligible,
        totalExpectedHeadcount: totalExpected,
        dietaryBreakdown: counts.dietary_breakdown || null,
        savingsKg: Number(savingsKg),
      };
    });

    // Fallback for any unconfigured slots
    CONFIG.MEAL_ORDER.forEach((slot) => {
      if (!mealsObj[slot]) {
        mealsObj[slot] = {
          eating: 0,
          skipping: 0,
          noResponse: totalEligibleStudents,
          totalEligible: totalEligibleStudents,
          actualAttendance: 0,
        };
      }
    });

    return {
      date: dateStr,
      totalStudents: totalEligibleStudents,
      meals: mealsObj,
      isLive: true,
      rawOverview: overview,
    };
  }

  /**
   * Fetches unanswered student list.
   * Backend aggregates counts in forecast, but does not yet offer a student-level list route.
   * Returns sample list marked as demo/mock per project safety rules.
   */
  async function fetchUnanswered(dateStr) {
    const mode = getMode();
    const demo = await DemoAdapter.fetchUnanswered(dateStr);
    return {
      ...demo,
      isMockList: true, // Transparent indicator that list items are simulated
    };
  }

  return {
    getMode,
    setMode,
    fetchDailySummary,
    fetchUnanswered,
  };
})();
