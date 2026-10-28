import { useState, useId } from 'react';

/**
 * RegisterPage — Student account creation entry point.
 *
 * Props:
 *   onRegister(fields) → Promise<void>
 *     Called when the student submits a valid form.
 *     Must be provided by App.jsx; no fake registration happens here.
 *     fields = { rollNumber, fullName, email, password }
 *     (confirmPassword is validated client-side and never forwarded)
 *
 *   onNavigate(view)  — 'login' | 'register' — switches the visible auth screen
 *   authError  string | null  — error from App after a failed backend call
 *   isLoading  boolean        — true while the registration request is in-flight
 *
 * SECURITY:
 *   - Passwords are held only in React component state (never in browser storage).
 *   - confirmPassword is discarded after client-side match check and never sent.
 *   - All actual account creation is delegated to the backend (Stage 4).
 */
export default function RegisterPage({ onRegister, onNavigate, authError, isLoading }) {
  const [rollNumber,     setRollNumber]     = useState('');
  const [fullName,       setFullName]       = useState('');
  const [email,          setEmail]          = useState('');
  const [password,       setPassword]       = useState('');
  const [confirmPwd,     setConfirmPwd]     = useState('');
  const [showPassword,   setShowPassword]   = useState(false);
  const [showConfirm,    setShowConfirm]    = useState(false);

  const FIELDS = ['rollNumber', 'fullName', 'email', 'password', 'confirmPwd'];
  const [fieldErrors, setFieldErrors] = useState(
    Object.fromEntries(FIELDS.map((f) => [f, '']))
  );
  const [touched, setTouched] = useState(
    Object.fromEntries(FIELDS.map((f) => [f, false]))
  );

  // Unique IDs for label/input association
  const rollId    = useId();
  const nameId    = useId();
  const emailId   = useId();
  const pwdId     = useId();
  const confirmId = useId();

  // ── Validation helpers ───────────────────────────────────────────────────────
  function validateRollNumber(v) {
    if (!v.trim()) return 'Roll number is required.';
    if (v.trim().length < 3) return 'Enter a valid roll number.';
    return '';
  }

  function validateFullName(v) {
    if (!v.trim()) return 'Full name is required.';
    if (v.trim().length < 2) return 'Enter your full name.';
    return '';
  }

  function validateEmail(v) {
    // Email is optional — only validate format when a value is provided
    if (!v.trim()) return '';
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!EMAIL_RE.test(v.trim())) return 'Enter a valid email address.';
    return '';
  }

  function validatePassword(v) {
    if (!v) return 'Password is required.';
    if (v.length < 8) return 'Password must be at least 8 characters.';
    return '';
  }

  function validateConfirmPwd(v, pwd) {
    if (!v) return 'Please confirm your password.';
    if (v !== pwd) return 'Passwords do not match.';
    return '';
  }

  function validateField(name, value, currentPassword) {
    switch (name) {
      case 'rollNumber': return validateRollNumber(value);
      case 'fullName':   return validateFullName(value);
      case 'email':      return validateEmail(value);
      case 'password':   return validatePassword(value);
      case 'confirmPwd': return validateConfirmPwd(value, currentPassword ?? password);
      default:           return '';
    }
  }

  function validateAll() {
    return {
      rollNumber: validateRollNumber(rollNumber),
      fullName:   validateFullName(fullName),
      email:      validateEmail(email),
      password:   validatePassword(password),
      confirmPwd: validateConfirmPwd(confirmPwd, password),
    };
  }

  // ── Field change / blur handlers ────────────────────────────────────────────
  function makeChangeHandler(field, setter) {
    return function (e) {
      const val = e.target.value;
      setter(val);
      if (touched[field]) {
        // For confirmPwd, re-validate against the latest password state
        const pwdForCheck = field === 'confirmPwd' ? password
                          : field === 'password'   ? val
                          : password;
        setFieldErrors((prev) => ({
          ...prev,
          [field]: validateField(field, val, pwdForCheck),
          // If password changed, re-validate confirmPwd live if it was touched
          ...(field === 'password' && touched.confirmPwd
            ? { confirmPwd: validateConfirmPwd(confirmPwd, val) }
            : {}),
        }));
      }
    };
  }

  function handleBlur(field) {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setFieldErrors((prev) => ({
      ...prev,
      [field]: validateField(field, getFieldValue(field)),
    }));
  }

  function getFieldValue(field) {
    switch (field) {
      case 'rollNumber': return rollNumber;
      case 'fullName':   return fullName;
      case 'email':      return email;
      case 'password':   return password;
      case 'confirmPwd': return confirmPwd;
      default:           return '';
    }
  }

  // ── Submit ───────────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();

    // Touch all fields to reveal any hidden errors
    setTouched(Object.fromEntries(FIELDS.map((f) => [f, true])));

    const errors = validateAll();
    setFieldErrors(errors);

    if (Object.values(errors).some(Boolean)) return;

    // Delegate to App — confirmPassword is intentionally NOT forwarded
    await onRegister({
      rollNumber: rollNumber.trim(),
      fullName:   fullName.trim(),
      email:      email.trim() || null,
      password,
    });
  }

  const hasFieldError = Object.values(fieldErrors).some(Boolean);
  const formDisabled  = isLoading;

  return (
    <div className="login-shell">
      {/* Background decoration (reuses login page CSS) */}
      <div className="login-bg-orb login-bg-orb--1" aria-hidden="true" />
      <div className="login-bg-orb login-bg-orb--2" aria-hidden="true" />

      <main className="login-main register-main" role="main">
        {/* Brand */}
        <div className="login-brand" aria-label="MealSync application">
          <div className="login-brand__icon" aria-hidden="true">🍱</div>
          <div className="login-brand__text">
            <span className="login-brand__name">MealSync</span>
            <span className="login-brand__sub">Campus Mess Portal</span>
          </div>
        </div>

        {/* Card */}
        <div className="login-card" role="region" aria-label="Student registration">
          <div className="login-card__header">
            <h1 className="login-card__title">Create Account</h1>
            <p className="login-card__subtitle">
              Register with your college roll number to access the meal opt-out
              dashboard.
            </p>
          </div>

          <form
            className="login-form"
            onSubmit={handleSubmit}
            noValidate
            aria-label="Registration form"
          >
            {/* Roll Number */}
            <div className="login-field">
              <label className="login-label" htmlFor={rollId}>College Roll Number</label>
              <div className={[
                'login-input-wrap',
                touched.rollNumber && fieldErrors.rollNumber ? 'login-input-wrap--error' : '',
                touched.rollNumber && !fieldErrors.rollNumber && rollNumber ? 'login-input-wrap--valid' : '',
              ].join(' ')}>
                <span className="login-input-icon" aria-hidden="true">🎓</span>
                <input
                  id={rollId}
                  className="login-input"
                  type="text"
                  autoComplete="username"
                  placeholder="e.g. CCE25CSBS004"
                  value={rollNumber}
                  onChange={makeChangeHandler('rollNumber', setRollNumber)}
                  onBlur={() => handleBlur('rollNumber')}
                  disabled={formDisabled}
                  aria-required="true"
                  aria-invalid={touched.rollNumber && !!fieldErrors.rollNumber ? true : undefined}
                  aria-describedby={touched.rollNumber && fieldErrors.rollNumber ? `${rollId}-error` : undefined}
                  spellCheck={false}
                  autoCapitalize="characters"
                />
              </div>
              {touched.rollNumber && fieldErrors.rollNumber && (
                <p id={`${rollId}-error`} className="login-field-error" role="alert">
                  {fieldErrors.rollNumber}
                </p>
              )}
            </div>

            {/* Full Name */}
            <div className="login-field">
              <label className="login-label" htmlFor={nameId}>Full Name</label>
              <div className={[
                'login-input-wrap',
                touched.fullName && fieldErrors.fullName ? 'login-input-wrap--error' : '',
                touched.fullName && !fieldErrors.fullName && fullName ? 'login-input-wrap--valid' : '',
              ].join(' ')}>
                <span className="login-input-icon" aria-hidden="true">👤</span>
                <input
                  id={nameId}
                  className="login-input"
                  type="text"
                  autoComplete="name"
                  placeholder="e.g. Adarsh Jayaprakash"
                  value={fullName}
                  onChange={makeChangeHandler('fullName', setFullName)}
                  onBlur={() => handleBlur('fullName')}
                  disabled={formDisabled}
                  aria-required="true"
                  aria-invalid={touched.fullName && !!fieldErrors.fullName ? true : undefined}
                  aria-describedby={touched.fullName && fieldErrors.fullName ? `${nameId}-error` : undefined}
                />
              </div>
              {touched.fullName && fieldErrors.fullName && (
                <p id={`${nameId}-error`} className="login-field-error" role="alert">
                  {fieldErrors.fullName}
                </p>
              )}
            </div>

            {/* College Email (optional) */}
            <div className="login-field">
              <label className="login-label" htmlFor={emailId}>
                College Email{' '}
                <span className="reg-optional-label">(optional)</span>
              </label>
              <div className={[
                'login-input-wrap',
                touched.email && fieldErrors.email ? 'login-input-wrap--error' : '',
                touched.email && !fieldErrors.email && email ? 'login-input-wrap--valid' : '',
              ].join(' ')}>
                <span className="login-input-icon" aria-hidden="true">✉️</span>
                <input
                  id={emailId}
                  className="login-input"
                  type="email"
                  autoComplete="email"
                  placeholder="yourname@college.edu (if required)"
                  value={email}
                  onChange={makeChangeHandler('email', setEmail)}
                  onBlur={() => handleBlur('email')}
                  disabled={formDisabled}
                  aria-invalid={touched.email && !!fieldErrors.email ? true : undefined}
                  aria-describedby={touched.email && fieldErrors.email ? `${emailId}-error` : undefined}
                  spellCheck={false}
                />
              </div>
              {touched.email && fieldErrors.email && (
                <p id={`${emailId}-error`} className="login-field-error" role="alert">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="login-field">
              <label className="login-label" htmlFor={pwdId}>Password</label>
              <div className={[
                'login-input-wrap',
                touched.password && fieldErrors.password ? 'login-input-wrap--error' : '',
                touched.password && !fieldErrors.password && password ? 'login-input-wrap--valid' : '',
              ].join(' ')}>
                <span className="login-input-icon" aria-hidden="true">🔒</span>
                <input
                  id={pwdId}
                  className="login-input"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={makeChangeHandler('password', setPassword)}
                  onBlur={() => handleBlur('password')}
                  disabled={formDisabled}
                  aria-required="true"
                  aria-invalid={touched.password && !!fieldErrors.password ? true : undefined}
                  aria-describedby={touched.password && fieldErrors.password ? `${pwdId}-error` : undefined}
                />
                <button
                  type="button"
                  className="login-show-pwd"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {touched.password && fieldErrors.password && (
                <p id={`${pwdId}-error`} className="login-field-error" role="alert">
                  {fieldErrors.password}
                </p>
              )}
              {/* Strength hint (display only, not blocking) */}
              {password && !fieldErrors.password && (
                <p className="reg-pwd-hint">
                  Use a mix of letters, numbers, and symbols for a stronger password.
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="login-field">
              <label className="login-label" htmlFor={confirmId}>Confirm Password</label>
              <div className={[
                'login-input-wrap',
                touched.confirmPwd && fieldErrors.confirmPwd ? 'login-input-wrap--error' : '',
                touched.confirmPwd && !fieldErrors.confirmPwd && confirmPwd ? 'login-input-wrap--valid' : '',
              ].join(' ')}>
                <span className="login-input-icon" aria-hidden="true">🔐</span>
                <input
                  id={confirmId}
                  className="login-input"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                  value={confirmPwd}
                  onChange={makeChangeHandler('confirmPwd', setConfirmPwd)}
                  onBlur={() => handleBlur('confirmPwd')}
                  disabled={formDisabled}
                  aria-required="true"
                  aria-invalid={touched.confirmPwd && !!fieldErrors.confirmPwd ? true : undefined}
                  aria-describedby={touched.confirmPwd && fieldErrors.confirmPwd ? `${confirmId}-error` : undefined}
                />
                <button
                  type="button"
                  className="login-show-pwd"
                  onClick={() => setShowConfirm((s) => !s)}
                  aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirm ? '🙈' : '👁️'}
                </button>
              </div>
              {touched.confirmPwd && fieldErrors.confirmPwd && (
                <p id={`${confirmId}-error`} className="login-field-error" role="alert">
                  {fieldErrors.confirmPwd}
                </p>
              )}
            </div>

            {/* Server-side registration error */}
            {authError && !hasFieldError && (
              <div className="login-server-error" role="alert" aria-live="assertive">
                <span aria-hidden="true">⚠️</span> {authError}
              </div>
            )}

            {/* Submit */}
            <button
              id="btn-register-submit"
              type="submit"
              className={`login-btn ${isLoading ? 'login-btn--loading' : ''}`}
              disabled={formDisabled}
              aria-busy={isLoading}
            >
              {isLoading ? (
                <span className="login-btn__inner">
                  <span className="login-spinner" aria-hidden="true" />
                  Creating account…
                </span>
              ) : (
                <span className="login-btn__inner">
                  Create Account
                  <span aria-hidden="true" className="login-btn__arrow">→</span>
                </span>
              )}
            </button>
          </form>

          {/* Navigate back to login */}
          <p className="reg-nav-text">
            Already have an account?{' '}
            <button
              type="button"
              id="btn-go-to-login"
              className="reg-nav-link"
              onClick={() => onNavigate('login')}
              disabled={isLoading}
            >
              Sign in
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
