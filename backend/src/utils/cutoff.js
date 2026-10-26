const { v4: uuidv4 } = require('crypto');

/**
 * Standard cutoff rules as defined in docs/backend-design.md
 * Breakfast: Previous night, 10:00 PM (or 9:00 PM)
 * Lunch: Same day, 9:00 AM
 * Snacks: Same day, 2:00 PM
 * Dinner: Same day, 4:30 PM (or 4:00 PM)
 */
const MEAL_SCHEDULE_PRESETS = {
  BREAKFAST: {
    startHour: 7,
    startMinute: 30,
    endHour: 9,
    endMinute: 30,
    cutoffPreviousDay: true,
    cutoffHour: 22,
    cutoffMinute: 0,
    menu: 'Idli & Sambar, Coconut Chutney, Boiled Egg, Banana, Tea / Coffee',
  },
  LUNCH: {
    startHour: 12,
    startMinute: 30,
    endHour: 14,
    endMinute: 30,
    cutoffPreviousDay: false,
    cutoffHour: 9,
    cutoffMinute: 0,
    menu: 'Rice & Dal, Mix Veg Curry, Rasam, Curd, Papad, Pickle',
  },
  SNACKS: {
    startHour: 16,
    startMinute: 30,
    endHour: 18,
    endMinute: 0,
    cutoffPreviousDay: false,
    cutoffHour: 14,
    cutoffMinute: 0,
    menu: 'Samosa / Poha, Mint Chutney, Masala Chai',
  },
  DINNER: {
    startHour: 19,
    startMinute: 30,
    endHour: 21,
    endMinute: 30,
    cutoffPreviousDay: false,
    cutoffHour: 16,
    cutoffMinute: 30,
    menu: 'Chapati, Paneer Butter Masala, Jeera Rice, Dal Tadka, Salad, Gulab Jamun',
  },
};

/**
 * Formats a Date object into 'YYYY-MM-DD'
 * @param {Date} date
 * @returns {string}
 */
function formatDateKey(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Generates meal start, end, and cutoff Date objects for a given meal type and date.
 * @param {string} mealType - 'BREAKFAST' | 'LUNCH' | 'SNACKS' | 'DINNER'
 * @param {Date|string} forDate - The target meal date
 */
function calculateMealTimes(mealType, forDate) {
  const preset = MEAL_SCHEDULE_PRESETS[mealType.toUpperCase()];
  if (!preset) {
    throw new Error(`Unknown meal type: ${mealType}`);
  }

  const base = new Date(forDate);
  const startTime = new Date(base.getFullYear(), base.getMonth(), base.getDate(), preset.startHour, preset.startMinute, 0);
  const endTime = new Date(base.getFullYear(), base.getMonth(), base.getDate(), preset.endHour, preset.endMinute, 0);

  let cutoffTime;
  if (preset.cutoffPreviousDay) {
    const prevDay = new Date(base.getFullYear(), base.getMonth(), base.getDate() - 1);
    cutoffTime = new Date(prevDay.getFullYear(), prevDay.getMonth(), prevDay.getDate(), preset.cutoffHour, preset.cutoffMinute, 0);
  } else {
    cutoffTime = new Date(base.getFullYear(), base.getMonth(), base.getDate(), preset.cutoffHour, preset.cutoffMinute, 0);
  }

  return { startTime, endTime, cutoffTime, menu: preset.menu };
}

/**
 * Checks whether the cutoff deadline has passed.
 * @param {Date|string} cutoffTime
 * @returns {boolean}
 */
function isCutoffPassed(cutoffTime) {
  const now = new Date();
  const cutoff = new Date(cutoffTime);
  return now.getTime() >= cutoff.getTime();
}

module.exports = {
  MEAL_SCHEDULE_PRESETS,
  formatDateKey,
  calculateMealTimes,
  isCutoffPassed,
};
