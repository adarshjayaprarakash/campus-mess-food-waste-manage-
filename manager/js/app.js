'use strict';

// ============================================================
// CAMPUS MESS — MANAGER DASHBOARD APPLICATION
//
// Orchestrates: auth → date state → backend/demo data load → render.
//
// Data sources: ApiClient (api-client.js) & DataAdapter (demo-data.js)
// Calculations: WasteCalc (waste-calc.js)
// UI components: Components (components.js)
// Configuration: CONFIG (config.js)
// ============================================================

const App = (function() {
  let _selectedDate   = null;
  let _pollingTimer   = null;
  let _isDestroyed    = false;
  let _currentMeals   = []; // Holds active today's meal objects for modals

  // DOM slots
  const _slots = {
    dateNav:      document.getElementById('date-navigator'),
    summary:      document.getElementById('daily-summary'),
    mealCards:    document.getElementById('meal-cards'),
    unanswered:   document.getElementById('unanswered-panel'),
    wasteReport:  document.getElementById('waste-report'),
    modeBadge:    document.getElementById('dashboard-mode-badge'),
    modeNotice:   document.getElementById('mode-notice'),
    footerInfo:   document.getElementById('footer-connection-info'),
  };

  // Modals
  const _modals = {
    scan:        document.getElementById('scan-modal'),
    scanSelect:  document.getElementById('scan-meal-select'),
    scanRoll:    document.getElementById('scan-roll-input'),
    scanStation: document.getElementById('scan-station-input'),
    scanResult:  document.getElementById('scan-result-container'),
    scanSubmit:  document.getElementById('submit-scan-btn'),
    scanClose:   document.getElementById('close-scan-modal-btn'),
    scanCancel:  document.getElementById('cancel-scan-btn'),

    waste:        document.getElementById('waste-modal'),
    wasteSelect:  document.getElementById('waste-meal-select'),
    wastePrep:    document.getElementById('waste-prep-input'),
    wasteWaste:   document.getElementById('waste-waste-input'),
    wasteConsumed:document.getElementById('waste-consumed-input'),
    wasteRemarks: document.getElementById('waste-remarks-input'),
    wasteResult:  document.getElementById('waste-result-container'),
    wasteSubmit:  document.getElementById('submit-waste-btn'),
    wasteClose:   document.getElementById('close-waste-modal-btn'),
    wasteCancel:  document.getElementById('cancel-waste-btn'),
  };

  // ── Helpers ─────────────────────────────────────────────────

  function _todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function _daysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  }

  function _isToday(dateStr) {
    return dateStr === _todayISO();
  }

  function _isPast(dateStr) {
    return dateStr < _todayISO();
  }

  function _clearSlot(slot) {
    if (slot) slot.innerHTML = '';
  }

  function _mount(slot, node) {
    _clearSlot(slot);
    if (node && slot) slot.appendChild(node);
  }

  function _updateModeDisplay() {
    const isLive = DataAdapter.getMode() === 'live';
    if (_slots.modeBadge) {
      _slots.modeBadge.className = isLive ? 'badge badge-live' : 'badge badge-demo';
      _slots.modeBadge.textContent = isLive ? '🟢 Live Backend' : '📋 Demo Mode';
    }

    if (_slots.modeNotice) {
      if (isLive) {
        _slots.modeNotice.className = 'notice notice-info';
        _slots.modeNotice.innerHTML = `<strong>🟢 Live Backend Mode:</strong> Connected to <code>${CONFIG.API_BASE_URL}</code>. Displaying live student meal responses and kitchen forecasts.`;
      } else {
        _slots.modeNotice.className = 'notice notice-warning';
        _slots.modeNotice.innerHTML = `<strong>📋 Offline Demo Mode:</strong> Displaying simulated sample figures from the design document. Sign in with manager credentials to connect live backend.`;
      }
    }

    if (_slots.footerInfo) {
      _slots.footerInfo.innerHTML = isLive
        ? `Connected to Express + MySQL backend at <code>${CONFIG.API_BASE_URL}</code>`
        : `Offline demonstration mode active.`;
    }
  }

  // ── Date navigation ──────────────────────────────────────────

  function _prevDay() {
    const d = new Date(_selectedDate + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    const newDate = d.toISOString().slice(0, 10);
    const minDate = _daysAgo(CONFIG.MAX_HISTORY_DAYS);
    if (newDate >= minDate) {
      _selectedDate = newDate;
      _refresh();
    }
  }

  function _nextDay() {
    const d = new Date(_selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    const newDate = d.toISOString().slice(0, 10);
    if (newDate <= _todayISO()) {
      _selectedDate = newDate;
      _refresh();
    }
  }

  // ── Render pipeline ──────────────────────────────────────────

  function _renderNav() {
    _mount(_slots.dateNav,
      Components.renderDateNavigator(
        _selectedDate, _prevDay, _nextDay, CONFIG.MAX_HISTORY_DAYS
      )
    );
  }

  function _showLoading() {
    [_slots.summary, _slots.mealCards, _slots.unanswered, _slots.wasteReport].forEach(function(s) {
      _mount(s, Components.renderLoadingState());
    });
  }

  function _showError(msg) {
    const onRetry = function() {
      _refresh();
    };
    const onSwitchDemo = function() {
      DataAdapter.setMode('demo');
      _updateModeDisplay();
      _refresh();
    };

    [_slots.summary, _slots.mealCards, _slots.unanswered, _slots.wasteReport].forEach(function(s) {
      _mount(s, Components.renderErrorState(msg, onRetry, onSwitchDemo));
    });
  }

  async function _loadAndRender() {
    if (_isDestroyed) return;
    _updateModeDisplay();
    _renderNav();
    _showLoading();

    let summaryData, unansweredData;
    try {
      [summaryData, unansweredData] = await Promise.all([
        DataAdapter.fetchDailySummary(_selectedDate),
        DataAdapter.fetchUnanswered(_selectedDate),
      ]);
    } catch (err) {
      console.error('[App] Data load failed:', err);

      // Handle unauthorized session
      if (err.code === 'UNAUTHORIZED' || err.status === 401) {
        ApiClient.clearSession();
        window.initAuth && window.initAuth.showSessionExpired('Your manager session has expired or is invalid. Please sign in again.');
        return;
      }

      _showError(err.message || 'Unable to load meal statistics from backend.');
      return;
    }

    if (_isDestroyed) return;
    if (!summaryData) {
      _showError('No meal records available for ' + _selectedDate + '.');
      return;
    }

    const mealsData     = summaryData.meals;
    const totalStudents = summaryData.totalStudents || CONFIG.TOTAL_STUDENTS;
    const isReadOnly    = _isPast(_selectedDate);

    // Save active today's meals for modal selections
    _currentMeals = [];
    CONFIG.MEAL_ORDER.forEach(function(slot) {
      const m = mealsData[slot];
      if (m && m.mealId) {
        _currentMeals.push({
          id: m.mealId,
          type: m.mealType || slot.toUpperCase(),
          label: CONFIG.MEAL_LABELS[slot] || m.mealType,
        });
      }
    });

    // DailySummaryBar
    const summary = WasteCalc.calcDailySummary(mealsData, totalStudents, CONFIG.MEAL_ORDER);
    _mount(_slots.summary, Components.renderDailySummaryBar(summary, _selectedDate));

    // MealResponseCards
    _clearSlot(_slots.mealCards);
    CONFIG.MEAL_ORDER.forEach(function(slot) {
      const card = Components.renderMealResponseCard(
        slot,
        mealsData[slot] || { eating: 0, skipping: 0, noResponse: totalStudents },
        totalStudents,
        isReadOnly
      );
      _slots.mealCards.appendChild(card);
    });

    // UnansweredResponsePanel
    _mount(_slots.unanswered,
      Components.renderUnansweredResponsePanel(unansweredData, CONFIG.UNANSWERED_PAGE_SIZE)
    );

    // FoodWasteReportSection
    const wasteData = WasteCalc.calcDailyWaste(mealsData, CONFIG);
    _mount(_slots.wasteReport,
      Components.renderFoodWasteReportSection(wasteData, CONFIG.MEAL_ORDER)
    );
  }

  // ── Polling (today only) ─────────────────────────────────────

  function _startPolling() {
    _stopPolling();
    if (!_isToday(_selectedDate)) return;
    _pollingTimer = setInterval(function() {
      if (_isDestroyed) { _stopPolling(); return; }
      _loadAndRender();
    }, CONFIG.POLLING_INTERVAL_MS);
  }

  function _stopPolling() {
    if (_pollingTimer) { clearInterval(_pollingTimer); _pollingTimer = null; }
  }

  function _refresh() {
    _stopPolling();
    _loadAndRender();
    _startPolling();
  }

  // ── Modals: Attendance Scan & Waste Log ───────────────────────

  function _populateMealSelect(selectEl, preselectedId) {
    if (!selectEl) return;
    selectEl.innerHTML = '';
    if (_currentMeals.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'No active meal sessions found';
      selectEl.appendChild(opt);
      return;
    }

    _currentMeals.forEach(function(m) {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.label;
      if (preselectedId && m.id === preselectedId) {
        opt.selected = true;
      }
      selectEl.appendChild(opt);
    });
  }

  function openScanModal(preselectedMealId) {
    if (!_modals.scan) return;
    _populateMealSelect(_modals.scanSelect, preselectedMealId);
    if (_modals.scanRoll) _modals.scanRoll.value = '';
    if (_modals.scanResult) {
      _modals.scanResult.hidden = true;
      _modals.scanResult.innerHTML = '';
    }
    _modals.scan.hidden = false;
    if (_modals.scanRoll) _modals.scanRoll.focus();
  }

  function closeScanModal() {
    if (_modals.scan) _modals.scan.hidden = true;
  }

  async function handleScanSubmit() {
    const mealId = _modals.scanSelect.value;
    const rollNumber = _modals.scanRoll.value.trim();
    const station = (_modals.scanStation.value || 'MAIN_GATE_DESK').trim();

    if (!mealId) {
      _showScanResult('Please select a valid meal session.', 'error');
      return;
    }
    if (!rollNumber) {
      _showScanResult('Please enter student roll number or scan barcode.', 'error');
      return;
    }

    _modals.scanSubmit.disabled = true;
    _modals.scanSubmit.textContent = 'Checking in…';

    try {
      const res = await ApiClient.scanAttendance(mealId, rollNumber, station);
      const student = res.student || {};
      const prior = res.prior_response || 'EATING';
      const flag = res.flag || 'NORMAL';

      let msgHtml = `
        <div class="modal-alert ${flag === 'UNPLANNED_WALK_IN' ? 'modal-alert-warning' : 'modal-alert-success'}">
          <strong>✅ Verified: ${student.full_name || rollNumber}</strong> (${student.roll_number || rollNumber})<br>
          Dietary: <strong>${student.dietary_preference || 'VEG'}</strong> | Prior Intent: <strong>${prior}</strong>
          ${flag === 'UNPLANNED_WALK_IN' ? '<br><span class="badge badge-walkin">⚠️ UNPLANNED WALK-IN (Marked Skip but attended)</span>' : ''}
        </div>
      `;
      _showScanResult(msgHtml, 'html');
      _modals.scanRoll.value = '';
      _modals.scanRoll.focus();

      // Trigger background update to refresh attendance count
      _loadAndRender();
    } catch (err) {
      const errMsg = err.data && err.data.message ? err.data.message : err.message;
      _showScanResult(`❌ Scan Failed: ${errMsg}`, 'error');
    } finally {
      _modals.scanSubmit.disabled = false;
      _modals.scanSubmit.textContent = 'Record Check-In';
    }
  }

  function _showScanResult(content, type) {
    if (!_modals.scanResult) return;
    _modals.scanResult.hidden = false;
    if (type === 'html') {
      _modals.scanResult.innerHTML = content;
    } else {
      _modals.scanResult.className = type === 'error' ? 'modal-alert modal-alert-error' : 'modal-alert modal-alert-success';
      _modals.scanResult.textContent = content;
    }
  }

  function openWasteModal(preselectedMealId) {
    if (!_modals.waste) return;
    _populateMealSelect(_modals.wasteSelect, preselectedMealId);
    if (_modals.wastePrep) _modals.wastePrep.value = '';
    if (_modals.wasteWaste) _modals.wasteWaste.value = '';
    if (_modals.wasteConsumed) _modals.wasteConsumed.value = '';
    if (_modals.wasteRemarks) _modals.wasteRemarks.value = '';
    if (_modals.wasteResult) {
      _modals.wasteResult.hidden = true;
      _modals.wasteResult.innerHTML = '';
    }
    _modals.waste.hidden = false;
    if (_modals.wastePrep) _modals.wastePrep.focus();
  }

  function closeWasteModal() {
    if (_modals.waste) _modals.waste.hidden = true;
  }

  async function handleWasteSubmit() {
    const mealId = _modals.wasteSelect.value;
    const prep = parseFloat(_modals.wastePrep.value);
    const waste = parseFloat(_modals.wasteWaste.value);
    const consumed = _modals.wasteConsumed.value ? parseFloat(_modals.wasteConsumed.value) : undefined;
    const remarks = _modals.wasteRemarks.value.trim() || undefined;

    if (!mealId) {
      _showWasteResult('Please select a valid meal session.', 'error');
      return;
    }
    if (isNaN(prep) || isNaN(waste)) {
      _showWasteResult('Prepared weight and wasted weight are required numerical values.', 'error');
      return;
    }

    _modals.wasteSubmit.disabled = true;
    _modals.wasteSubmit.textContent = 'Recording…';

    try {
      await ApiClient.recordWasteLog(mealId, {
        prepared_weight_kg: prep,
        wasted_weight_kg: waste,
        consumed_weight_kg: consumed,
        remarks: remarks,
      });

      _showWasteResult('✅ Waste log recorded successfully in backend database.', 'success');
      setTimeout(function() {
        closeWasteModal();
        _loadAndRender();
      }, 1200);
    } catch (err) {
      const errMsg = err.data && err.data.message ? err.data.message : err.message;
      _showWasteResult(`❌ Error saving waste log: ${errMsg}`, 'error');
    } finally {
      _modals.wasteSubmit.disabled = false;
      _modals.wasteSubmit.textContent = 'Save Waste Log';
    }
  }

  function _showWasteResult(content, type) {
    if (!_modals.wasteResult) return;
    _modals.wasteResult.hidden = false;
    _modals.wasteResult.className = type === 'error' ? 'modal-alert modal-alert-error' : 'modal-alert modal-alert-success';
    _modals.wasteResult.textContent = content;
  }

  function _initModalListeners() {
    // Scan modal
    const openScanHeader = document.getElementById('header-scan-btn');
    if (openScanHeader) {
      openScanHeader.addEventListener('click', function() {
        openScanModal();
      });
    }
    if (_modals.scanClose) _modals.scanClose.addEventListener('click', closeScanModal);
    if (_modals.scanCancel) _modals.scanCancel.addEventListener('click', closeScanModal);
    if (_modals.scanSubmit) _modals.scanSubmit.addEventListener('click', handleScanSubmit);
    if (_modals.scanRoll) {
      _modals.scanRoll.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleScanSubmit();
        }
      });
    }

    // Waste modal
    if (_modals.wasteClose) _modals.wasteClose.addEventListener('click', closeWasteModal);
    if (_modals.wasteCancel) _modals.wasteCancel.addEventListener('click', closeWasteModal);
    if (_modals.wasteSubmit) _modals.wasteSubmit.addEventListener('click', handleWasteSubmit);
  }

  // ── Public API ───────────────────────────────────────────────

  function init() {
    _isDestroyed  = false;
    _selectedDate = _todayISO();
    _initModalListeners();
    _refresh();
  }

  function destroy() {
    _isDestroyed = true;
    _stopPolling();
    Object.values(_slots).forEach(_clearSlot);
  }

  return {
    init,
    destroy,
    openScanModal,
    openWasteModal,
  };
})();

// ── Auth & Initialization ─────────────────────────────────────
// Attached to window so it is accessible and invoked safely

(function initAuthScope() {
  const overlay     = document.getElementById('login-overlay');
  const dashboard   = document.getElementById('dashboard');
  const form        = document.getElementById('login-form');
  const userInp     = document.getElementById('username-input');
  const pwdInp      = document.getElementById('password-input');
  const demoCheck   = document.getElementById('demo-mode-checkbox');
  const errMsg      = document.getElementById('login-error');
  const submitBtn   = document.getElementById('login-submit-btn');
  const logoutBtn   = document.getElementById('logout-btn');
  const backendText = document.getElementById('backend-status-text');

  if (backendText) {
    backendText.innerHTML = `Backend: <code>${CONFIG.API_BASE_URL}</code>`;
  }

  function showSessionExpired(message) {
    if (dashboard) dashboard.hidden = true;
    if (overlay) overlay.hidden = false;
    if (errMsg) {
      errMsg.hidden = false;
      errMsg.textContent = message || 'Session expired. Please sign in again.';
    }
    if (pwdInp) {
      pwdInp.value = '';
      pwdInp.focus();
    }
  }

  async function handleLogin(e) {
    if (e) e.preventDefault();
    const username = (userInp ? userInp.value : '').trim();
    const password = (pwdInp ? pwdInp.value : '').trim();
    const isDemoRequested = demoCheck ? demoCheck.checked : false;

    errMsg.hidden = true;
    errMsg.textContent = '';

    if (!password) {
      errMsg.hidden = false;
      errMsg.textContent = 'Please enter your manager password or PIN.';
      return;
    }

    // 1. OFFLINE DEMO MODE
    if (isDemoRequested) {
      if (password === CONFIG.DEMO_PIN) {
        DataAdapter.setMode('demo');
        overlay.hidden   = true;
        dashboard.hidden = false;
        pwdInp.value     = '';
        App.init();
      } else {
        errMsg.hidden = false;
        errMsg.textContent = `Incorrect Demo PIN. Use "${CONFIG.DEMO_PIN}" for offline mode.`;
        pwdInp.value = '';
        pwdInp.focus();
      }
      return;
    }

    // 2. LIVE BACKEND MODE
    submitBtn.disabled = true;
    submitBtn.textContent = 'Connecting to backend…';

    try {
      await ApiClient.login(username || 'manager', password);
      DataAdapter.setMode('live');
      overlay.hidden   = true;
      dashboard.hidden = false;
      pwdInp.value     = '';
      App.init();
    } catch (err) {
      errMsg.hidden = false;
      if (err.code === 'NETWORK_ERROR') {
        errMsg.innerHTML = `❌ Connection Error: Backend server is unreachable at <code>${CONFIG.API_BASE_URL}</code>.<br><small>Tip: Check network connectivity or check "Work in Offline Demo Mode" to preview offline.</small>`;
      } else if (err.status === 401 || err.code === 'INVALID_CREDENTIALS') {
        errMsg.textContent = 'Invalid manager username or password. Default: manager / manager123';
      } else {
        errMsg.textContent = err.message || 'Login failed. Please try again.';
      }
      pwdInp.value = '';
      pwdInp.focus();
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In to Dashboard';
    }
  }

  if (form) {
    form.addEventListener('submit', handleLogin);
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
      ApiClient.clearSession();
      App.destroy();
      dashboard.hidden = true;
      overlay.hidden   = false;
      if (pwdInp) pwdInp.focus();
    });
  }

  // Auto-login if valid token is already present
  if (ApiClient.isLoggedIn() && DataAdapter.getMode() === 'live') {
    overlay.hidden = true;
    dashboard.hidden = false;
    App.init();
  }

  window.initAuth = { showSessionExpired };
})();
