'use strict';

// ============================================================
// CAMPUS MESS — MANAGER DASHBOARD CONFIGURATION
// Adjust these constants to match your deployment.
// ============================================================

const CONFIG = Object.freeze({
  // --- Backend API Base URL ---
  // Connects to Arya's Express backend API server.
  // Note: Backend server runs on HTTP. Do not change to https:// for this host.
  API_BASE_URL: 'http://172.17.243.12:5000/api/v1',

  // --- Session Storage Keys ---
  // Kept isolated to ensure no collision with student authToken
  STORAGE_KEYS: {
    TOKEN: 'campus_mess_manager_token',
    USER: 'campus_mess_manager_user',
    MODE: 'campus_mess_dashboard_mode',
  },

  // --- Student population (default fallback if backend does not supply total) ---
  TOTAL_STUDENTS: 120,

  // --- Waste estimation ---
  // Preparation buffer added above the confirmed eating count (percent)
  BUFFER_PERCENT: 20,
  // Estimated kilograms of food waste per surplus (uneaten) meal
  WASTE_KG_PER_SURPLUS_MEAL: 0.35,

  // --- Meal slots ---
  MEAL_ORDER: ['breakfast', 'lunch', 'dinner'],

  MEAL_LABELS: {
    breakfast: 'Breakfast',
    lunch:     'Lunch',
    dinner:    'Dinner',
  },

  MEAL_ICONS: {
    breakfast: '🍳',
    lunch:     '🥗',
    dinner:    '🍲',
  },

  MEAL_CUT_OFFS: {
    breakfast: '07:30 AM',
    lunch:     '12:00 PM',
    dinner:    '07:00 PM',
  },

  // --- Navigation ---
  // How many past days the manager can navigate back to
  MAX_HISTORY_DAYS: 7,

  // --- Polling ---
  // Interval in milliseconds between auto-refreshes (today only)
  POLLING_INTERVAL_MS: 30000,

  // --- Pagination ---
  UNANSWERED_PAGE_SIZE: 20,

  // --- Demo Credentials / PIN ---
  // Fallback for offline mode when backend server is unavailable
  DEMO_PIN: 'manager123',
  DEMO_USERNAME: 'manager',
});
