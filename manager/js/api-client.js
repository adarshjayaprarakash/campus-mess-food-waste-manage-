'use strict';

// ============================================================
// CAMPUS MESS — MANAGER BACKEND API CLIENT
// Connects to Arya's Express backend API at CONFIG.API_BASE_URL
// ============================================================

const ApiClient = (function() {
  function getBaseUrl() {
    return CONFIG.API_BASE_URL.replace(/\/+$/, '');
  }

  function getToken() {
    try {
      return localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
    } catch (_) {
      return null;
    }
  }

  function setToken(token) {
    try {
      if (token) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.TOKEN, token);
      } else {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
      }
    } catch (_) {}
  }

  function getUser() {
    try {
      const raw = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function setUser(user) {
    try {
      if (user) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(user));
      } else {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
      }
    } catch (_) {}
  }

  function clearSession() {
    try {
      localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
      localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
    } catch (_) {}
  }

  function isLoggedIn() {
    return Boolean(getToken());
  }

  /**
   * Generic request wrapper with auth header injection and uniform error handling
   */
  async function request(endpoint, options = {}) {
    const url = `${getBaseUrl()}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (!options.noAuth) {
      const token = getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    let response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
      });
    } catch (err) {
      const networkError = new Error(
        `Unable to connect to backend server at ${getBaseUrl()}. Please verify your network connection and server status.`
      );
      networkError.code = 'NETWORK_ERROR';
      networkError.originalError = err;
      throw networkError;
    }

    let data = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch (_) {
        data = null;
      }
    } else {
      try {
        data = await response.text();
      } catch (_) {}
    }

    if (!response.ok) {
      const msg = (data && data.message) || response.statusText || 'Request failed';
      const error = new Error(msg);
      error.status = response.status;
      error.code = (data && data.error) || (response.status === 401 ? 'UNAUTHORIZED' : 'API_ERROR');
      error.data = data;
      throw error;
    }

    return data;
  }

  /**
   * POST /auth/manager/login
   * Body: { username, password }
   */
  async function login(username, password) {
    const payload = {
      username: (username || '').trim(),
      password: (password || '').trim(),
    };

    const res = await request('/auth/manager/login', {
      method: 'POST',
      body: JSON.stringify(payload),
      noAuth: true,
    });

    if (res && res.token) {
      setToken(res.token);
      if (res.manager) {
        setUser(res.manager);
      }
    }
    return res;
  }

  /**
   * GET /manager/meals/today
   */
  async function getTodayMeals() {
    return request('/manager/meals/today', { method: 'GET' });
  }

  /**
   * GET /manager/meals/:mealId/forecast
   */
  async function getMealForecast(mealId) {
    if (!mealId) throw new Error('mealId is required for forecast request');
    return request(`/manager/meals/${encodeURIComponent(mealId)}/forecast`, { method: 'GET' });
  }

  /**
   * POST /manager/attendance/scan
   * Body: { meal_id, roll_number, scanner_station }
   */
  async function scanAttendance(mealId, rollNumber, scannerStation = 'MAIN_GATE_DESK') {
    if (!mealId || !rollNumber) {
      throw new Error('Meal ID and roll number are required for attendance scanning.');
    }
    return request('/manager/attendance/scan', {
      method: 'POST',
      body: JSON.stringify({
        meal_id: mealId,
        roll_number: rollNumber.trim(),
        scanner_station: scannerStation,
      }),
    });
  }

  /**
   * POST /manager/meals/:mealId/waste-log
   * Body: { prepared_weight_kg, wasted_weight_kg, consumed_weight_kg, remarks }
   */
  async function recordWasteLog(mealId, logData) {
    if (!mealId) throw new Error('mealId is required for waste log');
    return request(`/manager/meals/${encodeURIComponent(mealId)}/waste-log`, {
      method: 'POST',
      body: JSON.stringify(logData),
    });
  }

  return {
    getBaseUrl,
    getToken,
    setToken,
    getUser,
    setUser,
    clearSession,
    isLoggedIn,
    login,
    getTodayMeals,
    getMealForecast,
    scanAttendance,
    recordWasteLog,
  };
})();
