import React, { useState } from 'react';

export default function MealCard({ meal, status, onToggle }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isEating = status === 'eating';
  const isSkipping = status === 'skipping';

  return (
    <article
      className={`meal-card ${isSkipping ? 'meal-card--skipping' : ''}`}
      style={{ '--meal-color': meal.color, '--meal-color-light': meal.colorLight }}
    >
      {/* Card Header */}
      <div className="meal-card__header">
        <div className="meal-card__icon-wrap">
          <span className="meal-card__icon" role="img" aria-label={meal.label}>
            {meal.icon}
          </span>
        </div>
        <div className="meal-card__title-group">
          <h2 className="meal-card__title">{meal.label}</h2>
          <span className="meal-card__time">{meal.time}</span>
        </div>
        {isSkipping && (
          <span className="meal-card__skip-badge">Skipping</span>
        )}
      </div>

      {/* Cutoff Notice */}
      <div className="meal-card__cutoff">
        <span className="cutoff-icon">⏰</span>
        <span className="cutoff-text">{meal.cutoffLabel}</span>
        <span className="cutoff-note">(Enforcement coming soon)</span>
      </div>

      {/* Menu Preview */}
      <div className="meal-card__menu-section">
        <button
          className="menu-toggle"
          onClick={() => setMenuOpen((o) => !o)}
          aria-expanded={menuOpen}
          id={`menu-toggle-${meal.id}`}
        >
          <span>Today's Menu</span>
          <span className={`menu-chevron ${menuOpen ? 'menu-chevron--open' : ''}`}>▾</span>
        </button>
        {menuOpen && (
          <ul className="meal-menu" aria-label={`${meal.label} menu`}>
            {meal.menu.map((item, i) => (
              <li key={i} className="meal-menu__item">
                <span className="meal-menu__dot" />
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Eat / Skip Toggle */}
      <div className="meal-card__actions">
        <button
          id={`btn-eat-${meal.id}`}
          className={`action-btn action-btn--eat ${isEating ? 'action-btn--active' : ''}`}
          onClick={() => onToggle(meal.id, 'eating')}
          aria-pressed={isEating}
        >
          <span className="action-btn__icon">✅</span>
          Eating
        </button>
        <button
          id={`btn-skip-${meal.id}`}
          className={`action-btn action-btn--skip ${isSkipping ? 'action-btn--active' : ''}`}
          onClick={() => onToggle(meal.id, 'skipping')}
          aria-pressed={isSkipping}
        >
          <span className="action-btn__icon">🚫</span>
          Skipping
        </button>
      </div>

      {/* Status strip */}
      <div className={`meal-card__status-strip ${isEating ? 'strip--eating' : 'strip--skipping'}`}>
        {isEating
          ? '✔ You are marked as eating this meal'
          : '✖ You have opted out of this meal'}
      </div>
    </article>
  );
}
