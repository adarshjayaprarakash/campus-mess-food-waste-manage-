import React from 'react';
import { weeklyHistory, messInfo } from '../data/sampleData';

export default function SummaryPanel({ mealStatuses, meals }) {
  const skippedToday = meals.filter((m) => mealStatuses[m.id] === 'skipping');
  const eatingToday = meals.filter((m) => mealStatuses[m.id] === 'eating');

  // Count weekly skips
  const totalWeeklySkips = weeklyHistory.reduce((acc, day) => {
    return (
      acc +
      (day.breakfast === 'skipping' ? 1 : 0) +
      (day.lunch === 'skipping' ? 1 : 0) +
      (day.dinner === 'skipping' ? 1 : 0)
    );
  }, 0);

  return (
    <aside className="summary-panel">
      {/* Today Summary */}
      <section className="summary-section" aria-label="Today's meal summary">
        <h3 className="summary-title">
          <span>📋</span> Today's Response
        </h3>
        <div className="summary-chips">
          {meals.map((meal) => {
            const skipping = mealStatuses[meal.id] === 'skipping';
            return (
              <div
                key={meal.id}
                className={`summary-chip ${skipping ? 'chip--skip' : 'chip--eat'}`}
              >
                <span className="chip-icon">{meal.icon}</span>
                <span className="chip-label">{meal.label}</span>
                <span className="chip-status">{skipping ? 'Skip' : 'Eat'}</span>
              </div>
            );
          })}
        </div>

        <div className="summary-counts">
          <div className="count-box count-box--eat">
            <span className="count-num">{eatingToday.length}</span>
            <span className="count-label">Eating</span>
          </div>
          <div className="count-box count-box--skip">
            <span className="count-num">{skippedToday.length}</span>
            <span className="count-label">Skipping</span>
          </div>
        </div>
      </section>

      {/* Mess Info */}
      <section className="summary-section" aria-label="Mess capacity info">
        <h3 className="summary-title">
          <span>🏫</span> {messInfo.name}
        </h3>
        <div className="mess-stat">
          <span className="mess-stat__label">Registered today</span>
          <span className="mess-stat__value">{messInfo.todayRegistered} / {messInfo.capacity}</span>
        </div>
        <div className="mess-progress-wrap">
          <div
            className="mess-progress-bar"
            style={{ width: `${(messInfo.todayRegistered / messInfo.capacity) * 100}%` }}
            role="progressbar"
            aria-valuenow={messInfo.todayRegistered}
            aria-valuemin={0}
            aria-valuemax={messInfo.capacity}
          />
        </div>
        <p className="mess-hint">
          {messInfo.capacity - messInfo.todayRegistered} students have opted out today
        </p>
      </section>

      {/* Weekly History */}
      <section className="summary-section" aria-label="Weekly meal history">
        <h3 className="summary-title">
          <span>📅</span> This Week
        </h3>
        <div className="weekly-grid">
          <div className="weekly-header">
            <span>Day</span><span>B</span><span>L</span><span>D</span>
          </div>
          {weeklyHistory.map((row) => (
            <div className="weekly-row" key={row.day}>
              <span className="weekly-day">{row.day}</span>
              <span className={`weekly-dot ${row.breakfast === 'skipping' ? 'dot--skip' : 'dot--eat'}`} />
              <span className={`weekly-dot ${row.lunch === 'skipping' ? 'dot--skip' : 'dot--eat'}`} />
              <span className={`weekly-dot ${row.dinner === 'skipping' ? 'dot--skip' : 'dot--eat'}`} />
            </div>
          ))}
        </div>
        <p className="weekly-summary">
          {totalWeeklySkips} meal{totalWeeklySkips !== 1 ? 's' : ''} skipped this week
        </p>
      </section>

      {/* Info Box */}
      <section className="summary-section info-box" aria-label="Important notice">
        <h3 className="summary-title"><span>ℹ️</span> Note</h3>
        <p className="info-text">
          Your opt-out responses help the mess team reduce food waste. Cutoff times will be enforced 
          once the backend is connected. Currently, all selections are saved locally.
        </p>
      </section>
    </aside>
  );
}
