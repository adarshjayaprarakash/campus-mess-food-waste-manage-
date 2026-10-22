import { useState } from 'react';
import Header from './components/Header';
import MealCard from './components/MealCard';
import SummaryPanel from './components/SummaryPanel';
import { studentProfile, meals } from './data/sampleData';
import './index.css';

const today = new Date();

const defaultStatuses = meals.reduce((acc, meal) => {
  acc[meal.id] = 'eating';
  return acc;
}, {});

function App() {
  const [mealStatuses, setMealStatuses] = useState(defaultStatuses);
  const [savedAt, setSavedAt] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleToggle = (mealId, status) => {
    setMealStatuses((prev) => ({ ...prev, [mealId]: status }));
    setSavedAt(null); // mark as unsaved on change
  };

  const handleSave = () => {
    setSaving(true);
    // Simulate async save
    setTimeout(() => {
      setSaving(false);
      setSavedAt(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
    }, 800);
  };

  const skippingCount = Object.values(mealStatuses).filter((s) => s === 'skipping').length;

  return (
    <div className="app-shell">
      <Header student={studentProfile} date={today} />

      <main className="main-content">
        {/* Banner */}
        <div className="page-banner">
          <div className="page-banner__inner">
            <div className="page-banner__text">
              <h1 className="page-title">Meal Opt-Out Dashboard</h1>
              <p className="page-subtitle">
                Mark your meals for today. Help reduce food waste in{' '}
                <strong>{studentProfile.hostel}</strong>.
              </p>
            </div>
            {skippingCount > 0 && (
              <div className="skipping-badge">
                🚫 {skippingCount} meal{skippingCount > 1 ? 's' : ''} skipped today
              </div>
            )}
          </div>
        </div>

        <div className="content-grid">
          {/* Meal Cards Column */}
          <div className="meals-column">
            <div className="meals-grid">
              {meals.map((meal) => (
                <MealCard
                  key={meal.id}
                  meal={meal}
                  status={mealStatuses[meal.id]}
                  onToggle={handleToggle}
                />
              ))}
            </div>

            {/* Save Bar */}
            <div className="save-bar">
              <div className="save-bar__left">
                {savedAt ? (
                  <span className="save-status save-status--saved">
                    ✔ Saved at {savedAt}
                  </span>
                ) : (
                  <span className="save-status save-status--pending">
                    Unsaved changes
                  </span>
                )}
              </div>
              <button
                id="btn-save-responses"
                className={`save-btn ${saving ? 'save-btn--loading' : ''}`}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save Responses'}
              </button>
            </div>
          </div>

          {/* Summary Sidebar */}
          <SummaryPanel mealStatuses={mealStatuses} meals={meals} />
        </div>
      </main>

      <footer className="app-footer">
        <p>
          MealSync · Campus Mess Food Waste Reduction Project ·{' '}
          <span>{studentProfile.hostel}</span>
        </p>
      </footer>
    </div>
  );
}

export default App;
