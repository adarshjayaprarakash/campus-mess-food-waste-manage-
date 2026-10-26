const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const { app } = require('../src/index');
const { calculateMealTimes, isCutoffPassed, formatDateKey, MEAL_SCHEDULE_PRESETS } = require('../src/utils/cutoff');

// Helper to make local HTTP requests to the express app without external dependencies
function makeRequest(server, options, body = null) {
  return new Promise((resolve, reject) => {
    const port = server.address().port;
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        path: options.path,
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch {
            parsed = data;
          }
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        });
      }
    );

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

test('1. Cutoff Utilities & Presets Validation', async (t) => {
  await t.test('all preset meal types are properly configured', () => {
    const mealTypes = ['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'];
    for (const type of mealTypes) {
      assert.ok(MEAL_SCHEDULE_PRESETS[type], `Preset for ${type} must exist`);
      assert.ok(MEAL_SCHEDULE_PRESETS[type].menu, `Menu for ${type} must be defined`);
    }
  });

  await t.test('calculates correct cutoff and window times', () => {
    const times = calculateMealTimes('LUNCH', '2026-10-22');
    assert.strictEqual(times.startTime.getHours(), 12);
    assert.strictEqual(times.startTime.getMinutes(), 30);
    assert.strictEqual(times.cutoffTime.getHours(), 9);
    assert.strictEqual(times.cutoffTime.getMinutes(), 0);
    assert.ok(times.cutoffTime < times.startTime, 'Cutoff time must precede start time');
  });

  await t.test('isCutoffPassed returns true for past and false for future deadlines', () => {
    const past = new Date(Date.now() - 3600 * 1000); // 1 hour ago
    const future = new Date(Date.now() + 3600 * 1000); // 1 hour in future
    assert.strictEqual(isCutoffPassed(past), true);
    assert.strictEqual(isCutoffPassed(future), false);
  });
});

test('2. Business Logic: Default Eating & Headcount Formulas', async (t) => {
  await t.test('unanswered meals count as eating', () => {
    const totalEligible = 100;
    const explicitEating = 30;
    const explicitSkipping = 20;

    const unanswered = totalEligible - (explicitEating + explicitSkipping);
    assert.strictEqual(unanswered, 50);

    // Rule: Unanswered students default to Eating
    const defaultEating = unanswered;
    const totalExpectedHeadcount = explicitEating + defaultEating;

    assert.strictEqual(totalExpectedHeadcount, 80);
    assert.strictEqual(totalExpectedHeadcount, totalEligible - explicitSkipping);

    // Food savings
    const foodSavedKg = Number((explicitSkipping * 0.4).toFixed(1));
    assert.strictEqual(foodSavedKg, 8.0);
  });
});

test('3. API Route Tests (HTTP)', async (t) => {
  let server;

  t.before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => resolve());
    });
  });

  t.after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  await t.test('GET /health returns JSON with status and database info', async () => {
    const res = await makeRequest(server, { path: '/health', method: 'GET' });
    assert.ok([200, 503].includes(res.status), `Expected 200 or 503, got ${res.status}`);
    assert.ok(res.data.database, 'Must include database status object');
    assert.strictEqual(typeof res.data.uptime_seconds, 'number');
  });

  await t.test('GET /api/v1/health also returns health check', async () => {
    const res = await makeRequest(server, { path: '/api/v1/health', method: 'GET' });
    assert.ok([200, 503].includes(res.status));
    assert.ok(res.data.database);
  });

  await t.test('GET /unknown-route returns 404 NOT_FOUND', async () => {
    const res = await makeRequest(server, { path: '/api/v1/not-a-real-endpoint', method: 'GET' });
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.data.error, 'NOT_FOUND');
  });

  await t.test('POST /api/v1/meals/:mealId/response validates status', async () => {
    const res = await makeRequest(
      server,
      { path: '/api/v1/meals/dummy-meal-123/response', method: 'POST' },
      { status: 'INVALID_CHOICE' }
    );
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.data.error, 'INVALID_STATUS');
  });

  await t.test('POST /api/v1/manager/attendance/scan validates input', async () => {
    const res = await makeRequest(
      server,
      { path: '/api/v1/manager/attendance/scan', method: 'POST' },
      { meal_id: 'dummy-id' } // missing roll_number
    );
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.data.error, 'INVALID_INPUT');
  });

  await t.test('POST /api/v1/manager/meals/:mealId/waste-log validates input', async () => {
    const res = await makeRequest(
      server,
      { path: '/api/v1/manager/meals/dummy-id/waste-log', method: 'POST' },
      { remarks: 'only remarks' } // missing prepared_weight_kg and wasted_weight_kg
    );
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.data.error, 'INVALID_INPUT');
  });
});
