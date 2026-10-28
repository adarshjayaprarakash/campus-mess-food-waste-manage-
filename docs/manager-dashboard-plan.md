# Manager Dashboard — Design Plan

> **Branch**: `feature/manager-dashboard`
> **Status**: 📋 Design-only — no code changes. Awaiting team agreement on shared project structure before any implementation begins.

---

## 1. Purpose

The Manager Dashboard gives mess managers a single, real-time view of:

- How many students plan to **eat** or **skip** each meal.
- How many students have **not yet responded**.
- A **daily food-waste report** derived from the gap between meals prepared and meals consumed.

This document describes the proposed UI components, data shape, and sample scenarios. It is a discussion artifact — not a build spec.

---

## 2. Context & Assumptions

| Item | Assumption |
|---|---|
| Student app | Already exists on `main`; collects per-student meal preferences (Eat / Skip) for each meal slot. |
| Meal slots | Three per day: **Breakfast**, **Lunch**, **Dinner**. |
| Response window | Students submit preferences before a configurable cut-off time for each slot. |
| Total students | Configurable; default sample = **120 students**. |
| Waste unit | Kilograms (kg); 1 meal ≈ 0.35 kg of food prepared per student. |

---

## 3. Sample Scenarios

These scenarios are used throughout this document to illustrate component behaviour.

### Scenario A — Normal weekday

| Meal | Eating | Skipping | No Response | Total Responded |
|---|---|---|---|---|
| Breakfast | 78 | 22 | 20 | 100 |
| Lunch | 105 | 10 | 5 | 115 |
| Dinner | 60 | 35 | 25 | 95 |

**Food-waste estimate (Scenario A)**

| Meal | Meals Prepared | Meals Eaten | Surplus Meals | Waste (kg) |
|---|---|---|---|---|
| Breakfast | 98 | 78 | 20 | 7.00 kg |
| Lunch | 110 | 105 | 5 | 1.75 kg |
| Dinner | 80 | 60 | 20 | 7.00 kg |
| **Daily Total** | **288** | **243** | **45** | **15.75 kg** |

> Meals prepared = `eating_count + buffer`. Buffer is configurable; default = 20% of `eating_count` rounded to nearest integer.

---

### Scenario B — Holiday / exam week (low attendance)

| Meal | Eating | Skipping | No Response | Total Responded |
|---|---|---|---|---|
| Breakfast | 30 | 70 | 20 | 100 |
| Lunch | 55 | 50 | 15 | 105 |
| Dinner | 25 | 80 | 15 | 105 |

**Food-waste estimate (Scenario B)**

| Meal | Meals Prepared | Meals Eaten | Surplus Meals | Waste (kg) |
|---|---|---|---|---|
| Breakfast | 36 | 30 | 6 | 2.10 kg |
| Lunch | 66 | 55 | 11 | 3.85 kg |
| Dinner | 30 | 25 | 5 | 1.75 kg |
| **Daily Total** | **132** | **110** | **22** | **7.70 kg** |

---

## 4. Proposed Components

### 4.1 MealResponseCard

One card per meal slot (Breakfast, Lunch, Dinner). Displays at a glance:

`
+----------------------------------------------+
|  BREAKFAST               Cut-off: 07:30 AM   |
|                                              |
|  Eating        78   ██████████████░░░  65%  |
|  Skipping      22   ████░░░░░░░░░░░░  18%   |
|  No Response   20   ████░░░░░░░░░░░░  17%   |
|                                              |
|  Total responded: 100 / 120                  |
+----------------------------------------------+
`

**Props / data bindings**

| Prop | Type | Description |
|---|---|---|
| `mealSlot` | `'breakfast' or 'lunch' or 'dinner'` | Identifies the slot |
| `cutOffTime` | `string` | Display-only cut-off time |
| `eatingCount` | `number` | Students who responded Eat |
| `skippingCount` | `number` | Students who responded Skip |
| `noResponseCount` | `number` | `totalStudents - (eatingCount + skippingCount)` |
| `totalStudents` | `number` | Configured total enrolment |

---

### 4.2 DailySummaryBar

A condensed horizontal strip shown above all three MealResponseCards. Provides the day-level totals.

`
+-------------------------------------------------------------------+
|  Thursday, 22 Oct 2026                                            |
|                                                                   |
|  Total Eating (any meal): 243    Total Skipping: 67              |
|  Unanswered slots:         70    Avg response rate: 80.6%        |
+-------------------------------------------------------------------+
`

**Derived fields**

`
totalEating       = sum of eatingCount across all three slots
totalSkipping     = sum of skippingCount across all three slots
unansweredSlots   = sum of noResponseCount across all three slots
avgResponseRate   = (totalStudents*3 - unansweredSlots) / (totalStudents*3) * 100
`

> `unansweredSlots` counts student x meal pairs, not unique students. A student can be "no response" for multiple slots.

---

### 4.3 UnansweredResponsePanel

An expandable panel listing students who have not responded for one or more meals of the current day.

`
+-------------------------------------------------------------------+
|  Unanswered Responses  [70 student-meal pairs]      [Expand]     |
+-------------------------------------------------------------------+
|  Student        Breakfast   Lunch   Dinner                        |
|  ---------------------------------------------------------------  |
|  Roll A101      (none)      OK      (none)                        |
|  Roll A107      OK          (none)  (none)                        |
|  Roll B203      (none)      (none)  (none)                        |
|  ... (collapsed)                                                  |
+-------------------------------------------------------------------+
`

**Behaviour**

- Collapsed by default; shows count badge only.
- Expanded view is a paginated table (20 rows per page).
- Manager can optionally send a reminder notification to all unanswered students (future feature; button shown but disabled in MVP).

---

### 4.4 FoodWasteReportSection

Daily food-waste estimate shown after all three meal cards.

`
+-------------------------------------------------------------------+
|  Daily Food Waste Estimate                                        |
|                                                                   |
|  Meal        Prepared   Eaten   Surplus   Waste                   |
|  Breakfast   98         78      20        7.00 kg                 |
|  Lunch       110        105     5         1.75 kg                 |
|  Dinner      80         60      20        7.00 kg                 |
|  -----------------------------------------------------------------|
|  TOTAL       288        243     45        15.75 kg                |
|                                                                   |
|  [Export CSV]   [View 7-day trend]                                |
+-------------------------------------------------------------------+
`

**Waste calculation**

`
buffer(meal)    = ceil(eatingCount * bufferPct / 100)   // bufferPct default = 20
prepared(meal)  = eatingCount + buffer(meal)
surplus(meal)   = prepared(meal) - eatingCount
waste_kg(meal)  = surplus(meal) * 0.35
`

**Additional controls (not in MVP — listed for future sprints)**

| Control | Purpose |
|---|---|
| Export CSV | Download current day's report as CSV |
| View 7-day trend | Line chart of daily waste over the past week |
| Buffer % slider | Let manager tune the preparation buffer per meal |

---

### 4.5 DateNavigator

A simple date picker / prev-next control at the top of the dashboard so the manager can review historical data.

`
   [< Prev]   Thursday, 22 Oct 2026   [Next >]
              (Today -- live data)
`

- "Today" label is shown when viewing the current date.
- Past dates show read-only, finalised data.
- Future dates are disabled.

---

## 5. Page Layout (Wireframe)

`
+-------------------------------------------------------------------+
|  Campus Mess -- Manager Dashboard                    [Logout]     |
+-------------------------------------------------------------------+
|           [< Prev]  Thursday, 22 Oct 2026  [Next >]              |
+-------------------------------------------------------------------+
|  DailySummaryBar                                                  |
+-----------------+-----------------+---------------------------------+
| MealResponseCard| MealResponseCard| MealResponseCard              |
| (Breakfast)     | (Lunch)         | (Dinner)                      |
+-----------------+-----------------+---------------------------------+
|  UnansweredResponsePanel (collapsed by default)                   |
+-------------------------------------------------------------------+
|  FoodWasteReportSection                                           |
+-------------------------------------------------------------------+
`

On narrow viewports (< 768 px) the three MealResponseCards stack vertically.

---

## 6. Data Shape (Proposed API Response)

This is the shape the dashboard will expect from whatever backend endpoint is agreed upon.
The exact API contract is **not finalised**; this is a starting point for discussion.

`jsonc
// GET /api/manager/daily-summary?date=2026-10-22
{
  "date": "2026-10-22",
  "totalStudents": 120,
  "meals": {
    "breakfast": {
      "cutOffTime": "07:30",
      "eating": 78,
      "skipping": 22,
      "noResponse": 20
    },
    "lunch": {
      "cutOffTime": "12:00",
      "eating": 105,
      "skipping": 10,
      "noResponse": 5
    },
    "dinner": {
      "cutOffTime": "19:00",
      "eating": 60,
      "skipping": 35,
      "noResponse": 25
    }
  },
  "wasteConfig": {
    "bufferPercent": 20,
    "kgPerSurplusMeal": 0.35
  }
}
`

`jsonc
// GET /api/manager/unanswered?date=2026-10-22
{
  "date": "2026-10-22",
  "unanswered": [
    { "studentId": "A101", "slots": ["breakfast", "dinner"] },
    { "studentId": "A107", "slots": ["lunch", "dinner"] },
    { "studentId": "B203", "slots": ["breakfast", "lunch", "dinner"] }
  ]
}
`

---

## 7. Open Questions for Team Review

| # | Question | Impact |
|---|---|---|
| 1 | **Monorepo vs separate apps?** Will the manager dashboard live in the same repo as the student app, under a /manager sub-directory, or as a separate project? | Determines folder structure |
| 2 | **Auth strategy?** Separate login for managers, or role-based guard on the same auth provider the student app uses? | Routing and API middleware |
| 3 | **Backend?** Is there an existing API server (Node/Express, Firebase, Supabase, etc.)? The data shape above must be reconciled. | API contract |
| 4 | **Real-time vs polling?** Should meal counts update live (WebSocket/SSE) or on a timed refresh (e.g., every 60 s)? | Component design |
| 5 | **Buffer % ownership?** Should the buffer percentage be manager-editable per meal, or a global system config? | FoodWasteReportSection UX |
| 6 | **Reminder notifications?** Is push/email notification to unanswered students in scope for MVP? | UnansweredResponsePanel |
| 7 | **Historical data retention?** How many days/weeks of past data should be queryable? | DateNavigator + backend storage |

---

## 8. Files Created / Modified

| File | Action | Notes |
|---|---|---|
| `docs/manager-dashboard-plan.md` | Created | This document |

No source code files were created or modified.
No Vite setup was run.
Student app files on `main` were not touched.

---

*Last updated: 2026-10-22 -- branch: feature/manager-dashboard*
