/**
 * Header — sticky top navigation bar.
 *
 * Props:
 *   student   object   — student profile to display (name, rollNo, hostel, avatarInitials)
 *   date      Date     — date to format and show
 *   onLogout  fn|null  — when provided (authenticated state), renders the Logout button
 */
export default function Header({ student, date, onLogout }) {
  const formatted = date.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-brand">
          <div className="brand-icon">🍱</div>
          <div className="brand-text">
            <span className="brand-name">MealSync</span>
            <span className="brand-sub">Campus Mess Portal</span>
          </div>
        </div>

        <div className="header-date">
          <span className="date-label">Today</span>
          <span className="date-value">{formatted}</span>
        </div>

        <div className="header-student">
          <div className="student-info">
            <span className="student-name">{student.name}</span>
            <span className="student-meta">{student.rollNo} · {student.hostel}</span>
          </div>
          <div className="student-avatar" aria-label={`Avatar for ${student.name}`}>
            {student.avatarInitials}
          </div>
        </div>

        {/* Logout — only rendered when an onLogout handler is provided (authenticated) */}
        {typeof onLogout === 'function' && (
          <button
            id="btn-logout"
            className="header-logout-btn"
            onClick={onLogout}
            aria-label="Sign out of MealSync"
            title="Sign out"
          >
            <span aria-hidden="true">🚪</span>
            <span className="header-logout-label">Sign out</span>
          </button>
        )}
      </div>
    </header>
  );
}
