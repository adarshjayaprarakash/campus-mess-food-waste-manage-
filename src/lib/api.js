/**
 * src/lib/api.js
 *
 * Thin API client for the MealSync backend.
 *
 * Base URL is read from the Vite environment variable VITE_API_URL so it can
 * be changed per-environment without touching source code.  The existing LAN
 * address is used as a fallback so the app keeps working during development
 * even if the .env file is absent.
 *
 * Token storage
 * -------------
 * The session token is stored in localStorage under the key 'authToken'.
 * This module owns that key exclusively — no other file reads or writes it.
 * Passwords are never stored anywhere.
 *
 * Error handling
 * --------------
 * Every function throws an Error whose .message is the backend's `message`
 * field (or a generic fallback).  Callers catch and display that message.
 */

export const API_BASE =
  import.meta.env.VITE_API_URL ?? 'http://192.168.1.41:5000/api/v1';

// ── Token helpers (single storage key used everywhere) ─────────────────────
const TOKEN_KEY = 'authToken';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// ── Low-level fetch wrapper ─────────────────────────────────────────────────
/**
 * apiFetch — wraps fetch with:
 *   - JSON Content-Type header
 *   - Optional Authorization: Bearer <token> header
 *   - Throws an Error with the backend message on non-2xx responses
 *
 * @param {string} path         — path relative to API_BASE (e.g. '/auth/student/login')
 * @param {object} [options]    — fetch options (method, body, etc.)
 * @param {string} [token]      — if provided, adds Authorization header
 */
async function apiFetch(path, options = {}, token = null) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });

  // Try to parse JSON body regardless of status — backend may send error details
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      body.message ||
      body.error ||
      `Request failed (${response.status} ${response.statusText}).`;
    throw new Error(message);
  }

  return body;
}

// ── Auth endpoints ──────────────────────────────────────────────────────────

/**
 * loginStudent — POST /api/v1/auth/student/login
 *
 * @param {string} rollNumber
 * @param {string} password
 * @returns {Promise<{ token: string, student: object }>}
 */
export async function loginStudent(rollNumber, password) {
  return apiFetch('/auth/student/login', {
    method: 'POST',
    body: JSON.stringify({ roll_number: rollNumber, password }),
  });
}

/**
 * registerStudent — POST /api/v1/auth/student/register
 *
 * @param {{ rollNumber: string, fullName: string, email: string|null, password: string }} fields
 * @returns {Promise<{ token: string, student: object }>}
 *
 * Note: email is optional per the API contract — only included when non-null.
 */
export async function registerStudent({ rollNumber, fullName, email, password }) {
  const body = {
    roll_number: rollNumber,
    full_name:   fullName,
    password,
  };
  // Include email only when the student provided one
  if (email) body.email = email;

  return apiFetch('/auth/student/register', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * verifySession — GET /api/v1/auth/me
 * Used on app startup to restore an existing session.
 *
 * @param {string} token
 * @returns {Promise<{ student: object }>}
 */
export async function verifySession(token) {
  return apiFetch('/auth/me', {}, token);
}

/**
 * fetchStudentProfile — GET /api/v1/students/profile
 *
 * @param {string} token
 * @returns {Promise<object>}  student profile object from the backend
 */
export async function fetchStudentProfile(token) {
  return apiFetch('/students/profile', {}, token);
}

// ── Meal endpoints ──────────────────────────────────────────────────────────

/**
 * fetchTodayMeals — GET /api/v1/meals/today
 *
 * @param {string} token
 * @returns {Promise<{ meals: Array }>}
 */
export async function fetchTodayMeals(token) {
  return apiFetch('/meals/today', {}, token);
}

/**
 * saveMealResponse — POST /api/v1/meals/:mealId/response
 *
 * The backend resolves student identity from the Bearer token.
 * No roll_number or student ID is sent in the body.
 *
 * @param {string|number} mealId   — backend meal UUID/ID from fetchTodayMeals
 * @param {'EATING'|'SKIPPING'} status
 * @param {string} token
 * @returns {Promise<object>}
 */
export async function saveMealResponse(mealId, status, token) {
  return apiFetch(`/meals/${mealId}/response`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  }, token);
}
