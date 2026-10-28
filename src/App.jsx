
import { useEffect, useState, useCallback } from 'react';
import Header from './components/Header';
import MealCard from './components/MealCard';
import SummaryPanel from './components/SummaryPanel';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import { meals } from './data/sampleData';
import {
  loginStudent,
  registerStudent,
  verifySession,
  fetchTodayMeals,
  saveMealResponse,
  getToken,
  saveToken,
  clearToken,
} from './lib/api';
import './index.css';

// ---------------------------------------------------------------------------
// Auth state shape:
//   { status: 'unauthenticated' | 'authenticating' | 'restoring' | 'authenticated',
//     student: null | { name, rollNo, hostel, avatarInitials, ... } }
//
// 'restoring' — app startup: checking localStorage token against /auth/me
// 'authenticated' — backend confirmed valid credentials; dashboard is shown
// ---------------------------------------------------------------------------
const INITIAL_AUTH = { status: 'unauthenticated', student: null };

/**
 * mapBackendStudent — converts the backend student object to the shape
 * expected by the dashboard UI components.
 *
 * Backend fields observed from the API contract:
 *   { id, roll_number, full_name, email, hostel?, room?, year?, department? }
 *
 * We preserve any existing key that the backend returns and normalise the
 * required display fields so Header / SummaryPanel never receive undefined.
 */
function mapBackendStudent(raw) {
  if (!raw) return null;
  return {
    // Normalised display fields
    name:           raw.full_name  ?? raw.name         ?? 'Student',
    rollNo:         raw.roll_number ?? raw.rollNo       ?? '',
    hostel:         raw.hostel     ?? 'Campus Hostel',
    room:           raw.room       ?? '',
    year:           raw.year       ?? '',
    department:     raw.department ?? '',
    avatarInitials: raw.full_name
      ? raw.full_name
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map((w) => w[0].toUpperCase())
          .join('')
      : (raw.avatarInitials ?? 'ST'),
    // Preserve the raw backend object for any future use
    _raw: raw,
  };
}

function App() {
  // ── Auth state ───────────────────────────────────────────────────────────
  const [authState, setAuthState] = useState({ status: 'restoring', student: null });
  const [authError, setAuthError] = useState('');

  // Which auth screen to show: 'login' | 'register'
  // Navigating between them clears any previous authError.
  const [authView, setAuthView] = useState('login');

  const handleNavigate = useCallback((view) => {
    setAuthError('');
    setAuthView(view);
  }, []);

  // ── Meal / dashboard state ────────────────────────────────────────────────
  const [mealStatuses, setMealStatuses] = useState(() =>
    meals.reduce((acc, meal) => {
      acc[meal.id] = 'eating';
      return acc;
    }, {})
  );

  const [apiMealIds, setApiMealIds] = useState({});
  const [savedAt, setSavedAt] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [apiConnected, setApiConnected] = useState(false);

  // ── Session restore on app startup ───────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const token = getToken();

      if (!token) {
        // No saved token — go straight to login
        if (!cancelled) setAuthState(INITIAL_AUTH);
        return;
      }

      try {
        const data = await verifySession(token);
        // /auth/me returns { student: {...} } or { data: { student: {...} } }
        const raw =
          data?.student ??
          data?.data?.student ??
          data;

        if (!cancelled) {
          setAuthState({
            status: 'authenticated',
            student: mapBackendStudent(raw),
          });
        }
      } catch {
        // Token is expired or invalid — clear it and show login
        clearToken();
        if (!cancelled) setAuthState(INITIAL_AUTH);
      }
    }

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  // ── Load meals (only when dashboard is active) ───────────────────────────
  useEffect(() => {
    if (authState.status !== 'authenticated') return;
    let cancelled = false;

    async function loadMeals() {
      setLoading(true);
      setApiError('');
      setApiConnected(false);

      try {
        const token = getToken();
        const data = await fetchTodayMeals(token);

        // Backend returns { meals: [...] } or { data: { meals: [...] } }
        const apiMeals =
          Array.isArray(data?.meals)     ? data.meals     :
          Array.isArray(data?.data?.meals) ? data.data.meals :
          [];

        const idMap = {};
        const statusMap = {};

        apiMeals.forEach((apiMeal) => {
          // meal_type from backend (e.g. 'BREAKFAST', 'LUNCH', 'DINNER')
          // map to local ids: 'breakfast', 'lunch', 'dinner'
          const localMealId = (apiMeal.meal_type ?? '').toLowerCase();
          if (!localMealId) return;

          idMap[localMealId] = apiMeal.id;

          // user_response may be null when no response yet
          const rawStatus =
            apiMeal.user_response?.status ??
            apiMeal.userResponse?.status ??
            'EATING';
          statusMap[localMealId] = rawStatus.toLowerCase();
        });

        if (!cancelled) {
          setApiMealIds(idMap);
          setMealStatuses((previous) => ({
            ...previous,
            ...statusMap,
          }));
          setApiConnected(true);
          setApiError('');
        }
      } catch (error) {
        if (!cancelled) {
          // 401 / 403 → token became invalid mid-session
          if (
            error.message.toLowerCase().includes('401') ||
            error.message.toLowerCase().includes('unauthorized') ||
            error.message.toLowerCase().includes('forbidden')
          ) {
            clearToken();
            setAuthState(INITIAL_AUTH);
            return;
          }
          setApiConnected(false);
          setApiError(`Could not load meals from the server: ${error.message}`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadMeals();

    return () => {
      cancelled = true;
    };
  }, [authState.status]);

  // ── Auth handlers ─────────────────────────────────────────────────────────

  /**
   * handleLogin — called by LoginPage on form submit.
   *
   * Delegates to loginStudent() from api.js.
   * On success: saves the token under 'authToken' and sets auth state.
   * On failure: surfaces the backend error message to the UI.
   *
   * SECURITY: password is used only here and never stored anywhere.
   */
  const handleLogin = useCallback(async (rollNumber, password) => {
    setAuthError('');
    setAuthState((prev) => ({ ...prev, status: 'authenticating' }));

    try {
      const data = await loginStudent(rollNumber, password);

      // Backend returns { token, student } or { data: { token, student } }
      const token   = data?.token   ?? data?.data?.token;
      const rawStudent =
        data?.student ??
        data?.data?.student ??
        null;

      if (!token) {
        throw new Error('The server did not return an authentication token. Please try again.');
      }

      saveToken(token);

      setAuthState({
        status:  'authenticated',
        student: mapBackendStudent(rawStudent),
      });
    } catch (err) {
      clearToken();
      setAuthError(
        err.message ||
        'Sign-in failed. Please check your roll number and password.'
      );
      setAuthState(INITIAL_AUTH);
    }
  }, []);

  /**
   * handleRegister — called by RegisterPage on form submit.
   *
   * Delegates to registerStudent() from api.js.
   * On success: saves the returned token and auto-logs the student in.
   *
   * SECURITY:
   *   - fields.password is used only here and never stored in any browser storage.
   *   - confirmPassword is validated in RegisterPage and intentionally NOT forwarded here.
   */
  const handleRegister = useCallback(async (fields) => {
    setAuthError('');
    setAuthState((prev) => ({ ...prev, status: 'authenticating' }));

    try {
      const data = await registerStudent(fields);

      // Backend returns { token, student } after successful registration
      const token   = data?.token   ?? data?.data?.token;
      const rawStudent =
        data?.student ??
        data?.data?.student ??
        null;

      if (!token) {
        // Registration succeeded but no token — redirect to login
        setAuthState(INITIAL_AUTH);
        setAuthView('login');
        setAuthError('');
        return;
      }

      saveToken(token);

      setAuthState({
        status:  'authenticated',
        student: mapBackendStudent(rawStudent),
      });
    } catch (err) {
      clearToken();
      setAuthError(
        err.message ||
        'Registration failed. Please check your details and try again.'
      );
      setAuthState(INITIAL_AUTH);
    }
  }, []);

  /**
   * handleLogout — clears session and returns to login screen.
   * Resets all dashboard state so a different student can log in cleanly.
   */
  const handleLogout = useCallback(() => {
    clearToken();
    setMealStatuses(
      meals.reduce((acc, meal) => {
        acc[meal.id] = 'eating';
        return acc;
      }, {})
    );
    setApiMealIds({});
    setSavedAt(null);
    setSaving(false);
    setLoading(true);
    setApiError('');
    setApiConnected(false);
    setAuthError('');
    setAuthState(INITIAL_AUTH);
  }, []);

  const handleToggle = (mealId, status) => {
    setMealStatuses((previous) => ({
      ...previous,
      [mealId]: status,
    }));
    setSavedAt(null);
    setApiError('');
  };

  const handleSave = async () => {
    if (!apiConnected) {
      setApiError('The backend is not connected. Please check the server.');
      return;
    }

    setSaving(true);
    setApiError('');

    try {
      const token = getToken();

      for (const meal of meals) {
        const apiMealId = apiMealIds[meal.id];

        if (!apiMealId) {
          throw new Error(`Missing backend meal ID for ${meal.label}. Try refreshing.`);
        }

        // saveMealResponse sends { status } only — backend resolves student from token.
        // No roll_number or student ID is sent.
        await saveMealResponse(
          apiMealId,
          mealStatuses[meal.id].toUpperCase(),
          token
        );
      }

      setSavedAt(
        new Date().toLocaleTimeString('en-IN', {
          hour:   '2-digit',
          minute: '2-digit',
        })
      );
    } catch (error) {
      // 401 / 403 → session expired mid-save
      if (
        error.message.toLowerCase().includes('401') ||
        error.message.toLowerCase().includes('unauthorized') ||
        error.message.toLowerCase().includes('forbidden')
      ) {
        clearToken();
        setAuthState(INITIAL_AUTH);
        return;
      }
      setApiError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const skippingCount = Object.values(mealStatuses).filter(
    (status) => status === 'skipping'
  ).length;

  // Preserve the original meal card design and styling.
  const displayMeals = meals.map((meal) => ({
    ...meal,
    id: meal.id,
  }));

  // ── Render: Session restore in progress ─────────────────────────────────
  if (authState.status === 'restoring') {
    return (
      <div className="login-shell" aria-busy="true" aria-label="Restoring session">
        <div className="login-bg-orb login-bg-orb--1" aria-hidden="true" />
        <div className="login-bg-orb login-bg-orb--2" aria-hidden="true" />
        <main className="login-main" role="main">
          <div className="login-brand" aria-label="MealSync application">
            <div className="login-brand__icon" aria-hidden="true">🍱</div>
            <div className="login-brand__text">
              <span className="login-brand__name">MealSync</span>
              <span className="login-brand__sub">Campus Mess Portal</span>
            </div>
          </div>
          <div className="login-card" style={{ textAlign: 'center', padding: '2.5rem' }}>
            <span className="login-spinner" aria-hidden="true" style={{ display: 'inline-block', marginBottom: '1rem' }} />
            <p style={{ color: 'var(--text-secondary, #94a3b8)', marginTop: '0.75rem' }}>
              Restoring your session…
            </p>
          </div>
        </main>
      </div>
    );
  }

  // ── Render: Auth screens (fail-closed guard) ──────────────────────────
  // Render the dashboard ONLY when status is exactly 'authenticated'.
  // Any other status value — including unknown/corrupted ones — shows the
  // login screen instead of leaking the dashboard.
  if (authState.status !== 'authenticated') {
    if (authView === 'register') {
      return (
        <RegisterPage
          onRegister={handleRegister}
          onNavigate={handleNavigate}
          authError={authError}
          isLoading={authState.status === 'authenticating'}
        />
      );
    }
    return (
      <LoginPage
        onLogin={handleLogin}
        onNavigate={handleNavigate}
        authError={authError}
        isLoading={authState.status === 'authenticating'}
      />
    );
  }

  // ── Render: Authenticated dashboard ────────────────────────────────────
  // authState.student carries the verified identity from the backend login
  // response. If the backend returned no student object (unlikely but
  // possible), we fall back to a minimal anonymous profile rather than
  // crashing or showing stale sample data as live data.
  const displayStudent = authState.student ?? {
    name:           'Student',
    rollNo:         '',
    hostel:         'Campus Hostel',
    room:           '',
    year:           '',
    department:     '',
    avatarInitials: 'ST',
  };

  return (
    <div className="app-shell">
      <Header student={displayStudent} date={new Date()} onLogout={handleLogout} />

      <main className="main-content">
        <div className="page-banner">
          <div className="page-banner__inner">
            <div className="page-banner__text">
              <h1 className="page-title">Meal Opt-Out Dashboard</h1>
              <p className="page-subtitle">
                Mark your meals for today. Help reduce food waste in{' '}
                <strong>{displayStudent.hostel}</strong>.
              </p>
            </div>

            {skippingCount > 0 && (
              <div className="skipping-badge">
                🚫 {skippingCount} meal
                {skippingCount > 1 ? 's' : ''} skipped today
              </div>
            )}
          </div>
        </div>

        <div className="content-grid">
          <div className="meals-column">
            <div className="meals-grid">
              {displayMeals.map((meal) => (
                <MealCard
                  key={meal.id}
                  meal={meal}
                  status={mealStatuses[meal.id]}
                  onToggle={handleToggle}
                />
              ))}
            </div>

            <div className="save-bar">
              <div className="save-bar__left">
                {loading ? (
                  <span className="save-status save-status--pending">
                    Loading meals…
                  </span>
                ) : savedAt ? (
                  <span className="save-status save-status--saved">
                    ✔ Saved at {savedAt}
                  </span>
                ) : (
                  <span className="save-status save-status--pending">
                    {apiConnected ? 'Unsaved changes' : 'Backend disconnected'}
                  </span>
                )}
              </div>

              <button
                id="btn-save-responses"
                className={`save-btn ${saving ? 'save-btn--loading' : ''}`}
                onClick={handleSave}
                disabled={saving || loading || !apiConnected}
              >
                {saving ? 'Saving…' : 'Save Responses'}
              </button>
            </div>

            {apiError && (
              <p role="alert" style={{ color: '#dc2626', marginTop: '12px' }}>
                {apiError}
              </p>
            )}
          </div>

          <SummaryPanel
            mealStatuses={mealStatuses}
            meals={displayMeals}
          />
        </div>
      </main>

      <footer className="app-footer">
        <p>
          MealSync · Campus Mess Food Waste Reduction Project ·{' '}
          <span>{displayStudent.hostel}</span>
        </p>
      </footer>
    </div>
  );
}

export default App;
