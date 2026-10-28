import { useState, useId } from 'react';

/**
 * LoginPage — Student authentication entry point.
 *
 * Props:
 *   onLogin(rollNumber, password) → Promise<void>
 *     Called when the student submits valid credentials.
 *     Must be provided by App.jsx; no fake auth happens here.
 *
 *   onNavigate(view)  — switches to 'login' | 'register' screen
 *   authError  string | null  — error string set by App after a failed backend call
 *   isLoading  boolean        — true while the auth request is in-flight
 */
export default function LoginPage({ onLogin, onNavigate, authError, isLoading }) {
  const [rollNumber, setRollNumber] = useState('');
  const [password, setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Client-side validation errors (format only — never bypass backend auth)
  const [fieldErrors, setFieldErrors] = useState({ rollNumber: '', password: '' });
  const [touched,     setTouched]     = useState({ rollNumber: false, password: false });

  const rollId = useId();
  const pwdId  = useId();

  // ── Validation helpers ──────────────────────────────────────────────────────
  function validateRollNumber(value) {
    if (!value.trim()) return 'Roll number is required.';
    if (value.trim().length < 3) return 'Enter a valid roll number.';
    return '';
  }

  function validatePassword(value) {
    if (!value) return 'Password is required.';
    if (value.length < 4) return 'Password must be at least 4 characters.';
    return '';
  }

  function validate(roll, pwd) {
    return {
      rollNumber: validateRollNumber(roll),
      password:   validatePassword(pwd),
    };
  }

  // ── Field handlers ───────────────────────────────────────────────────────────
  function handleRollChange(e) {
    const val = e.target.value;
    setRollNumber(val);
    if (touched.rollNumber) {
      setFieldErrors((prev) => ({ ...prev, rollNumber: validateRollNumber(val) }));
    }
  }

  function handlePasswordChange(e) {
    const val = e.target.value;
    setPassword(val);
    if (touched.password) {
      setFieldErrors((prev) => ({ ...prev, password: validatePassword(val) }));
    }
  }

  function handleBlur(field) {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (field === 'rollNumber') {
      setFieldErrors((prev) => ({ ...prev, rollNumber: validateRollNumber(rollNumber) }));
    } else {
      setFieldErrors((prev) => ({ ...prev, password: validatePassword(password) }));
    }
  }

  // ── Submit ───────────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();

    // Mark all fields as touched so errors show
    setTouched({ rollNumber: true, password: true });

    const errors = validate(rollNumber, password);
    setFieldErrors(errors);

    if (errors.rollNumber || errors.password) return;

    // Delegate to App — no auth logic lives here
    await onLogin(rollNumber.trim(), password);
  }

  const hasFieldError = fieldErrors.rollNumber || fieldErrors.password;
  const formDisabled  = isLoading;

  return (
    <div className="login-shell">
      {/* Background decoration */}
      <div className="login-bg-orb login-bg-orb--1" aria-hidden="true" />
      <div className="login-bg-orb login-bg-orb--2" aria-hidden="true" />

      <main className="login-main" role="main">
        {/* Brand */}
        <div className="login-brand" aria-label="MealSync application">
          <div className="login-brand__icon" aria-hidden="true">🍱</div>
          <div className="login-brand__text">
            <span className="login-brand__name">MealSync</span>
            <span className="login-brand__sub">Campus Mess Portal</span>
          </div>
        </div>

        {/* Card */}
        <div className="login-card" role="region" aria-label="Student login">
          <div className="login-card__header">
            <h1 className="login-card__title">Student Sign In</h1>
            <p className="login-card__subtitle">
              Enter your college roll number and password to access the meal
              opt-out dashboard.
            </p>
          </div>

          <form
            className="login-form"
            onSubmit={handleSubmit}
            noValidate
            aria-label="Login form"
          >
            {/* Roll Number */}
            <div className="login-field">
              <label className="login-label" htmlFor={rollId}>
                College Roll Number
              </label>
              <div
                className={`login-input-wrap ${
                  touched.rollNumber && fieldErrors.rollNumber
                    ? 'login-input-wrap--error'
                    : ''
                } ${
                  touched.rollNumber && !fieldErrors.rollNumber && rollNumber
                    ? 'login-input-wrap--valid'
                    : ''
                }`}
              >
                <span className="login-input-icon" aria-hidden="true">🎓</span>
                <input
                  id={rollId}
                  className="login-input"
                  type="text"
                  autoComplete="username"
                  placeholder="e.g. CCE25CSBS004"
                  value={rollNumber}
                  onChange={handleRollChange}
                  onBlur={() => handleBlur('rollNumber')}
                  disabled={formDisabled}
                  aria-required="true"
                  aria-invalid={
                    touched.rollNumber && !!fieldErrors.rollNumber
                  }
                  aria-describedby={
                    touched.rollNumber && fieldErrors.rollNumber
                      ? `${rollId}-error`
                      : undefined
                  }
                  spellCheck={false}
                  autoCapitalize="characters"
                />
              </div>
              {touched.rollNumber && fieldErrors.rollNumber && (
                <p
                  id={`${rollId}-error`}
                  className="login-field-error"
                  role="alert"
                >
                  {fieldErrors.rollNumber}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="login-field">
              <label className="login-label" htmlFor={pwdId}>
                Password
              </label>
              <div
                className={`login-input-wrap ${
                  touched.password && fieldErrors.password
                    ? 'login-input-wrap--error'
                    : ''
                } ${
                  touched.password && !fieldErrors.password && password
                    ? 'login-input-wrap--valid'
                    : ''
                }`}
              >
                <span className="login-input-icon" aria-hidden="true">🔒</span>
                <input
                  id={pwdId}
                  className="login-input"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Your mess portal password"
                  value={password}
                  onChange={handlePasswordChange}
                  onBlur={() => handleBlur('password')}
                  disabled={formDisabled}
                  aria-required="true"
                  aria-invalid={touched.password && !!fieldErrors.password}
                  aria-describedby={
                    touched.password && fieldErrors.password
                      ? `${pwdId}-error`
                      : undefined
                  }
                />
                <button
                  type="button"
                  className="login-show-pwd"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={0}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {touched.password && fieldErrors.password && (
                <p
                  id={`${pwdId}-error`}
                  className="login-field-error"
                  role="alert"
                >
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Server-side auth error (set by App after a real backend call fails) */}
            {authError && !hasFieldError && (
              <div className="login-server-error" role="alert" aria-live="assertive">
                <span aria-hidden="true">⚠️</span> {authError}
              </div>
            )}

            {/* Submit */}
            <button
              id="btn-login-submit"
              type="submit"
              className={`login-btn ${isLoading ? 'login-btn--loading' : ''}`}
              disabled={formDisabled}
              aria-busy={isLoading}
            >
              {isLoading ? (
                <span className="login-btn__inner">
                  <span className="login-spinner" aria-hidden="true" />
                  Signing in…
                </span>
              ) : (
                <span className="login-btn__inner">
                  Sign In
                  <span aria-hidden="true" className="login-btn__arrow">→</span>
                </span>
              )}
            </button>
          </form>

          <p className="login-help-text">
            Trouble signing in? Contact your hostel warden or the mess office.
          </p>

          {/* Navigate to registration */}
          <p className="reg-nav-text">
            New student?{' '}
            <button
              type="button"
              id="btn-go-to-register"
              className="reg-nav-link"
              onClick={() => onNavigate('register')}
              disabled={isLoading}
            >
              Create an account
            </button>
          </p>
        </div>

        <p className="login-footer-note">
          MealSync · Campus Mess Food Waste Reduction Project
        </p>
      </main>
    </div>
  );
}
