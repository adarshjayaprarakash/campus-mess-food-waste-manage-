'use strict';

// ============================================================
// CAMPUS MESS — UI COMPONENT RENDERERS (DOM helpers)
// Each function returns an HTMLElement; nothing is appended
// to the document here — that is app.js's responsibility.
// ============================================================

// ── Utility helpers ─────────────────────────────────────────

function el(tag, attrs, ...children) {
  const node = document.createElement(tag);
  if (attrs) {
    Object.entries(attrs).forEach(function([k, v]) {
      if (k === 'className') node.className = v;
      else if (k === 'innerHTML') node.innerHTML = v;
      else if (k === 'textContent') node.textContent = v;
      else node.setAttribute(k, v);
    });
  }
  children.forEach(function(c) {
    if (c == null) return;
    if (typeof c === 'string') node.appendChild(document.createTextNode(c));
    else node.appendChild(c);
  });
  return node;
}

function pct(value, total) {
  if (!total) return 0;
  return Math.round(value / total * 100);
}

function formatDate(dateStr) {
  // dateStr: YYYY-MM-DD
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// ── DateNavigator ────────────────────────────────────────────

/**
 * @param {string}   selectedDate  YYYY-MM-DD
 * @param {function} onPrev
 * @param {function} onNext
 * @param {number}   maxHistoryDays
 * @returns {HTMLElement}
 */
function renderDateNavigator(selectedDate, onPrev, onNext, maxHistoryDays) {
  const today     = todayISO();
  const minDate   = (function() {
    const d = new Date(today + 'T00:00:00');
    d.setDate(d.getDate() - maxHistoryDays);
    return d.toISOString().slice(0, 10);
  }());
  const isPast    = selectedDate < today;
  const isToday   = selectedDate === today;
  const atMin     = selectedDate <= minDate;
  const atToday   = selectedDate >= today;

  let statusLabel = '';
  let statusClass = '';
  if (isToday)  { statusLabel = 'Today — Live Demo Data'; statusClass = 'status-today'; }
  else if (isPast) { statusLabel = 'Historical — Read-Only';  statusClass = 'status-history'; }

  const prevBtn = el('button', {
    className: 'btn btn-nav' + (atMin ? ' btn-disabled' : ''),
    'aria-label': 'Previous day',
    'aria-disabled': atMin ? 'true' : 'false',
  }, '◀ Prev');
  if (!atMin) prevBtn.addEventListener('click', onPrev);

  const nextBtn = el('button', {
    className: 'btn btn-nav' + (atToday ? ' btn-disabled' : ''),
    'aria-label': 'Next day',
    'aria-disabled': atToday ? 'true' : 'false',
  }, 'Next ▶');
  if (!atToday) nextBtn.addEventListener('click', onNext);

  const dateLabel = el('div', { className: 'date-label' },
    el('span', { className: 'date-text', textContent: formatDate(selectedDate) }),
    statusLabel
      ? el('span', { className: 'date-status ' + statusClass, textContent: statusLabel })
      : null
  );

  return el('nav', { className: 'date-navigator', 'aria-label': 'Date navigation' },
    prevBtn, dateLabel, nextBtn
  );
}

// ── DailySummaryBar ──────────────────────────────────────────

/**
 * @param {{ totalEating, totalSkipping, totalNoResponse, avgResponseRate }} summary
 * @param {string} dateStr
 * @returns {HTMLElement}
 */
function renderDailySummaryBar(summary, dateStr) {
  function stat(label, value, modifier) {
    return el('div', { className: 'summary-stat' + (modifier ? ' ' + modifier : '') },
      el('span', { className: 'summary-stat__value', textContent: String(value) }),
      el('span', { className: 'summary-stat__label', textContent: label })
    );
  }

  const note = el('p', { className: 'summary-note' },
    'ℹ️ Counts are student-meal pairs across all three slots, not unique students.'
  );

  return el('section', { className: 'daily-summary-bar', 'aria-label': 'Daily summary' },
    el('h2', { className: 'summary-title', textContent: 'Daily Summary' }),
    el('div', { className: 'summary-stats' },
      stat('Total Eating (meal-slots)', summary.totalEating, 'stat--eating'),
      stat('Total Skipping (meal-slots)', summary.totalSkipping, 'stat--skipping'),
      stat('Unanswered (meal-slots)', summary.totalNoResponse, 'stat--unanswered'),
      stat('Avg Response Rate', summary.avgResponseRate + '%', 'stat--rate')
    ),
    note
  );
}

// ── MealResponseCard ─────────────────────────────────────────

/**
 * @param {string}  slot         'breakfast' | 'lunch' | 'dinner'
 * @param {{ eating, skipping, noResponse }} data
 * @param {number}  totalStudents
 * @param {boolean} isReadOnly
 * @returns {HTMLElement}
 */
function renderMealResponseCard(slot, data, totalStudents, isReadOnly) {
  const eating     = data.eating     || 0;
  const skipping   = data.skipping   || 0;
  const noResponse = data.noResponse || 0;
  const responded  = eating + skipping;
  const responsePct = pct(responded, totalStudents);

  // Invariant check
  if (eating + skipping + noResponse !== totalStudents) {
    console.warn('[MealResponseCard] ' + slot + ': eating+skipping+noResponse (' +
      (eating + skipping + noResponse) + ') !== totalStudents (' + totalStudents + ')');
  }

  function row(label, count, cssClass, icon) {
    const rowPct = pct(count, totalStudents);
    return el('div', { className: 'meal-row ' + cssClass },
      el('span', { className: 'meal-row__icon', 'aria-hidden': 'true' }, icon),
      el('span', { className: 'meal-row__label', textContent: label }),
      el('span', { className: 'meal-row__count', textContent: String(count) }),
      el('div', { className: 'meal-row__bar-wrap', 'aria-label': rowPct + '%' },
        el('div', { className: 'meal-row__bar-fill', style: 'width:' + rowPct + '%' })
      ),
      el('span', { className: 'meal-row__pct', textContent: rowPct + '%' })
    );
  }

  const readOnlyBadge = isReadOnly
    ? el('span', { className: 'badge badge-neutral', textContent: 'Read-Only' })
    : null;

  // Real cutoff and cutoff status
  let cutoffText = 'Cut-off: ' + (data.cutoffTime ? new Date(data.cutoffTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : CONFIG.MEAL_CUT_OFFS[slot]);
  if (data.isCutoffPassed) {
    cutoffText += ' (Closed)';
  }

  // Meta row for live backend data (attendance and dietary breakdown)
  const metaElements = [];
  if (data.actualAttendance != null) {
    metaElements.push(el('span', { className: 'meta-attendance', textContent: `👥 Attended: ${data.actualAttendance}` }));
  }
  if (data.dietaryBreakdown) {
    const d = data.dietaryBreakdown;
    metaElements.push(el('span', { className: 'meta-diet', textContent: `🥗 Veg: ${d.veg || 0} | 🍗 Non-Veg: ${d.non_veg || 0}` }));
  }

  const metaBar = metaElements.length > 0
    ? el('div', { className: 'meal-card__meta-bar' }, ...metaElements)
    : null;

  const scanBtn = (data.mealId && !isReadOnly)
    ? el('button', {
        className: 'btn btn-outline btn-sm',
        type: 'button',
        style: 'margin-top: .4rem; font-size: .8rem; width: 100%; justify-content: center;',
        onclick: function() {
          if (window.App && typeof window.App.openScanModal === 'function') {
            window.App.openScanModal(data.mealId);
          }
        }
      }, '📋 Check-In Gate Scan')
    : null;

  return el('article', { className: 'meal-card', 'aria-label': CONFIG.MEAL_LABELS[slot] + ' response card' },
    el('header', { className: 'meal-card__header' },
      el('span', { className: 'meal-card__icon', 'aria-hidden': 'true' }, CONFIG.MEAL_ICONS[slot]),
      el('div', { className: 'meal-card__title-wrap' },
        el('h3', { className: 'meal-card__title', textContent: CONFIG.MEAL_LABELS[slot] }),
        el('span', { className: 'meal-card__cutoff', textContent: cutoffText })
      ),
      readOnlyBadge
    ),
    metaBar,
    el('div', { className: 'meal-card__rows' },
      row('Eating',      eating,     'row--eating',     '✅'),
      row('Skipping',    skipping,   'row--skipping',   '❌'),
      row('No Response', noResponse, 'row--unanswered', '⏳')
    ),
    el('footer', { className: 'meal-card__footer' },
      el('div', { className: 'meal-card__progress-wrap', 'aria-label': 'Response completion' },
        el('div', { className: 'meal-card__progress-fill', style: 'width:' + responsePct + '%' })
      ),
      el('p', { className: 'meal-card__total' },
        el('span', { className: 'meal-card__responded', textContent: String(responded) }),
        ' of ',
        el('span', { textContent: String(totalStudents) }),
        ' responded (',
        el('strong', { textContent: responsePct + '%' }),
        ')'
      ),
      scanBtn
    )
  );
}

// ── UnansweredResponsePanel ──────────────────────────────────

/**
 * @param {{ unanswered: Array<{ studentId: string, slots: string[] }> }} data
 * @param {number} pageSize
 * @returns {HTMLElement}
 */
function renderUnansweredResponsePanel(data, pageSize) {
  const list   = data.unanswered || [];
  const total  = list.length;
  let page     = 0;
  let expanded = false;

  const badge = el('span', { className: 'badge ' + (total > 0 ? 'badge-warning' : 'badge-success') },
    total > 0 ? total + ' student(s) with gaps' : 'All responded'
  );

  const toggleBtn = el('button', {
    className: 'btn btn-outline btn-sm panel-toggle',
    'aria-expanded': 'false',
  }, total > 0 ? 'Expand ▼' : '');

  const header = el('div', { className: 'panel-header' },
    el('div', { className: 'panel-header__left' },
      el('h2', { className: 'panel-title', textContent: 'Unanswered Responses' }),
      badge
    ),
    total > 0 ? toggleBtn : null
  );

  // Empty state
  if (total === 0) {
    return el('section', { className: 'unanswered-panel', 'aria-label': 'Unanswered responses' },
      header,
      el('p', { className: 'panel-empty', textContent: '🎉 All students have responded to every meal slot today!' })
    );
  }

  // Build table
  function buildTable(pageIndex) {
    const start = pageIndex * pageSize;
    const slice = list.slice(start, start + pageSize);

    const rows = slice.map(function(item) {
      function cell(slot) {
        const has = item.slots.indexOf(slot) !== -1;
        return el('td', {
          className: has ? 'cell-missing' : 'cell-ok',
          'aria-label': slot + ': ' + (has ? 'no response' : 'responded'),
        }, has ? '⏳ Missing' : '✅ OK');
      }
      return el('tr', {},
        el('td', { className: 'cell-id', textContent: item.studentId }),
        cell('breakfast'),
        cell('lunch'),
        cell('dinner')
      );
    });

    const tbody = el('tbody', {});
    rows.forEach(function(r) { tbody.appendChild(r); });

    return el('div', { className: 'panel-table-wrap' },
      el('table', { className: 'panel-table', role: 'table', 'aria-label': 'Unanswered responses table' },
        el('thead', {},
          el('tr', {},
            el('th', { scope: 'col', textContent: 'Student ID' }),
            el('th', { scope: 'col', textContent: 'Breakfast' }),
            el('th', { scope: 'col', textContent: 'Lunch' }),
            el('th', { scope: 'col', textContent: 'Dinner' })
          )
        ),
        tbody
      ),
      buildPager(pageIndex)
    );
  }

  function buildPager(pageIndex) {
    const totalPages = Math.ceil(total / pageSize);
    if (totalPages <= 1) return null;

    const prevP = el('button', {
      className: 'btn btn-sm' + (pageIndex === 0 ? ' btn-disabled' : ''),
      'aria-label': 'Previous page',
    }, '◀');
    const nextP = el('button', {
      className: 'btn btn-sm' + (pageIndex >= totalPages - 1 ? ' btn-disabled' : ''),
      'aria-label': 'Next page',
    }, '▶');
    const info = el('span', { className: 'pager-info',
      textContent: 'Page ' + (pageIndex + 1) + ' of ' + totalPages
    });

    if (pageIndex > 0) {
      prevP.addEventListener('click', function() { page--; refreshBody(); });
    }
    if (pageIndex < totalPages - 1) {
      nextP.addEventListener('click', function() { page++; refreshBody(); });
    }

    return el('div', { className: 'pager' }, prevP, info, nextP);
  }

  const body = el('div', { className: 'panel-body', hidden: true });

  function refreshBody() {
    body.innerHTML = '';
    body.appendChild(buildTable(page));
  }

  toggleBtn.addEventListener('click', function() {
    expanded = !expanded;
    body.hidden = !expanded;
    toggleBtn.setAttribute('aria-expanded', String(expanded));
    toggleBtn.textContent = expanded ? 'Collapse ▲' : 'Expand ▼';
    if (expanded) refreshBody();
  });

  // Reminder button (future feature — disabled in MVP)
  const reminderBtn = el('button', {
    className: 'btn btn-outline btn-sm btn-disabled panel-reminder',
    disabled: 'true',
    title: 'Reminder notifications are not yet implemented.',
  }, '🔔 Send Reminder (coming soon)');

  return el('section', { className: 'unanswered-panel', 'aria-label': 'Unanswered responses' },
    header, body, reminderBtn
  );
}

// ── FoodWasteReportSection ───────────────────────────────────

/**
 * @param {{ meals, total }} wasteData  Output of WasteCalc.calcDailyWaste()
 * @param {string[]} mealOrder
 * @returns {HTMLElement}
 */
function renderFoodWasteReportSection(wasteData, mealOrder) {
  function mealRow(slot) {
    const d = wasteData.meals[slot];
    if (!d) return null;
    return el('tr', {},
      el('td', { textContent: CONFIG.MEAL_ICONS[slot] + ' ' + CONFIG.MEAL_LABELS[slot] }),
      el('td', { textContent: String(d.prepared) }),
      el('td', { textContent: String(d.eating)   }),
      el('td', { textContent: String(d.surplus)  }),
      el('td', { className: 'waste-kg', textContent: d.wasteKg.toFixed(2) + ' kg' })
    );
  }

  const tbody = el('tbody', {});
  mealOrder.forEach(function(slot) {
    const r = mealRow(slot);
    if (r) tbody.appendChild(r);
  });

  const t = wasteData.total;
  tbody.appendChild(
    el('tr', { className: 'waste-total-row' },
      el('td', { textContent: 'Daily Total' }),
      el('td', { textContent: String(t.prepared) }),
      el('td', { textContent: String(t.eaten)    }),
      el('td', { textContent: String(t.surplus)  }),
      el('td', { className: 'waste-kg', textContent: t.wasteKg.toFixed(2) + ' kg' })
    )
  );

  const table = el('table', { className: 'waste-table', role: 'table', 'aria-label': 'Food waste estimate table' },
    el('thead', {},
      el('tr', {},
        el('th', { scope: 'col', textContent: 'Meal'           }),
        el('th', { scope: 'col', textContent: 'Prepared'       }),
        el('th', { scope: 'col', textContent: 'Eaten'          }),
        el('th', { scope: 'col', textContent: 'Surplus Meals'  }),
        el('th', { scope: 'col', textContent: 'Est. Waste (kg)' })
      )
    ),
    tbody
  );

  // CSV export
  const csvBtn = el('button', { className: 'btn btn-outline btn-sm', id: 'export-csv-btn' },
    '📥 Export CSV'
  );
  csvBtn.addEventListener('click', function() {
    exportWasteCSV(wasteData, mealOrder);
  });

  // Log waste button
  const logWasteBtn = el('button', { className: 'btn btn-primary btn-sm', id: 'log-waste-btn' },
    '📝 Record Measured Waste'
  );
  logWasteBtn.addEventListener('click', function() {
    if (window.App && typeof window.App.openWasteModal === 'function') {
      window.App.openWasteModal();
    }
  });

  const disclaimer = el('p', { className: 'waste-disclaimer' },
    '⚠️ Figures are ',
    el('strong', { textContent: 'estimates only.' }),
    ' Actual waste requires recorded meals served and measured leftovers. ' +
    'Buffer: ' + CONFIG.BUFFER_PERCENT + '% of eating count. ' +
    CONFIG.WASTE_KG_PER_SURPLUS_MEAL + ' kg assumed per surplus meal.'
  );

  return el('section', { className: 'waste-section', 'aria-label': 'Food waste report' },
    el('h2', { className: 'waste-title', textContent: '🗑️ Daily Food Waste Estimate' }),
    disclaimer,
    el('div', { className: 'waste-table-wrap' }, table),
    el('div', { className: 'waste-actions' }, csvBtn, logWasteBtn)
  );
}

// ── CSV export helper ────────────────────────────────────────

function exportWasteCSV(wasteData, mealOrder) {
  const lines = ['Meal,Prepared,Eaten,Surplus Meals,Est. Waste (kg)'];
  mealOrder.forEach(function(slot) {
    const d = wasteData.meals[slot];
    if (!d) return;
    lines.push([CONFIG.MEAL_LABELS[slot], d.prepared, d.eating, d.surplus, d.wasteKg.toFixed(2)].join(','));
  });
  const t = wasteData.total;
  lines.push(['Daily Total', t.prepared, t.eaten, t.surplus, t.wasteKg.toFixed(2)].join(','));

  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = el('a', { href: url, download: 'mess-waste-report.csv' });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Loading / Error states ───────────────────────────────────

function renderLoadingState() {
  return el('div', { className: 'state-loading', 'aria-live': 'polite', 'aria-busy': 'true' },
    el('div', { className: 'spinner', 'aria-hidden': 'true' }),
    el('p', { textContent: 'Loading live meal records…' })
  );
}

function renderErrorState(message, onRetry, onSwitchDemo) {
  const retryBtn = onRetry
    ? el('button', {
        className: 'btn btn-primary btn-sm',
        style: 'margin-top: .6rem;',
        onclick: onRetry,
      }, '🔄 Retry Connection')
    : null;

  const demoBtn = onSwitchDemo
    ? el('button', {
        className: 'btn btn-outline btn-sm',
        style: 'margin-top: .6rem; margin-left: .5rem;',
        onclick: onSwitchDemo,
      }, '📋 Switch to Offline Demo')
    : null;

  return el('div', { className: 'state-error', role: 'alert' },
    el('p', { className: 'error-icon', textContent: '⚠️' }),
    el('p', { className: 'error-message', textContent: message || 'Failed to connect to backend server.' }),
    el('p', { className: 'error-hint',
      textContent: `Backend: ${CONFIG.API_BASE_URL}. Ensure Arya's backend is running and reachable.` }),
    el('div', { style: 'margin-top: .5rem;' }, retryBtn, demoBtn)
  );
}

// Public namespace
const Components = {
  renderDateNavigator,
  renderDailySummaryBar,
  renderMealResponseCard,
  renderUnansweredResponsePanel,
  renderFoodWasteReportSection,
  renderLoadingState,
  renderErrorState,
};
