import React from 'react';

export default function Header({ student, date }) {
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
      </div>
    </header>
  );
}
