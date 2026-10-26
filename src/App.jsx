
import { useEffect, useState } from 'react';
import Header from './components/Header';
import MealCard from './components/MealCard';
import SummaryPanel from './components/SummaryPanel';
import { studentProfile, meals } from './data/sampleData';
import './index.css';

const API_URL = 'http://192.168.1.41:5000/api/v1';

function App() {
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

  useEffect(() => {
    let cancelled = false;

    async function loadMeals() {
      try {
        const response = await fetch(`${API_URL}/meals/today`);

        if (!response.ok) {
          throw new Error(`Could not load meals (${response.status}).`);
        }

        const data = await response.json();

        const idMap = {};
        const statusMap = {};

        data.meals.forEach((apiMeal) => {
          const localMealId = apiMeal.meal_type.toLowerCase();

          idMap[localMealId] = apiMeal.id;
          statusMap[localMealId] =
            (apiMeal.user_response?.status || 'EATING').toLowerCase();
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
          setApiConnected(false);
          setApiError(
            `Could not load meals from the server: ${error.message}`
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadMeals();

    return () => {
      cancelled = true;
    };
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
      for (const meal of meals) {
        const apiMealId = apiMealIds[meal.id];

        if (!apiMealId) {
          throw new Error(`Missing backend meal ID for ${meal.label}.`);
        }

        const response = await fetch(
          `${API_URL}/meals/${apiMealId}/response`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              roll_number: 'CS21B001',
              status: mealStatuses[meal.id].toUpperCase(),
            }),
          }
        );

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            result.message ||
            result.error ||
            `Could not save ${meal.label} (${response.status}).`
          );
        }
      }

      setSavedAt(
        new Date().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    } catch (error) {
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

  return (
    <div className="app-shell">
      <Header student={studentProfile} date={new Date()} />

      <main className="main-content">
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
          <span>{studentProfile.hostel}</span>
        </p>
      </footer>
    </div>
  );
}

export default App;
