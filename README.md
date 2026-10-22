# 🍱 MealSync — Campus Mess Food Waste Reduction & Meal Opt-Out App

A modern student-facing web portal to help reduce campus mess food waste by allowing students to declare their meal participation (Eating / Skipping) before each meal.

## ✨ Features (v0.1 – Frontend)

- **Meal Opt-Out Dashboard** — Toggle Eating / Skipping for Breakfast, Lunch, and Dinner
- **Today's Menu** — Expandable menu list per meal
- **Cutoff Time Notice** — Displays the deadline for opting out (enforcement pending backend)
- **Response Summary** — Live summary of today's selections
- **Weekly History** — Visual dot-grid of the past 7 days
- **Mess Capacity Stats** — Shows how many students are registered today
- **Responsive Design** — Mobile-friendly layout
- **Dark Mode** — Professional dark theme with gradient accents

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will be available at `http://localhost:5173`.

### Build

```bash
# Production build
npm run build

# Preview production build
npm run preview
```

## 🗂️ Project Structure

```
src/
├── components/
│   ├── Header.jsx        # Top navigation bar
│   ├── MealCard.jsx      # Eat/Skip card for each meal
│   └── SummaryPanel.jsx  # Sidebar with daily & weekly summary
├── data/
│   └── sampleData.js     # Sample student & meal data (no backend yet)
├── App.jsx               # Root component
├── index.css             # Global styles & design system
└── main.jsx              # React entry point
```

## 🛣️ Roadmap

- [ ] Backend API (Node.js / Express or Django)
- [ ] Student authentication (login with roll number)
- [ ] Cutoff time enforcement
- [ ] Admin / Mess Manager dashboard
- [ ] Notifications & reminders
- [ ] Analytics & waste reduction reports

## 🧑‍💻 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite |
| Styling | Vanilla CSS (dark design system) |
| Fonts | Inter (Google Fonts) |
| State | React useState (local) |
| Data | Sample data (no backend yet) |

## 📄 License

MIT
