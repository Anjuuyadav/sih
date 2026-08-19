const assert = require('node:assert/strict');
const test = require('node:test');
const { __testables } = require('../backend/src/services/availabilityService');

const {
  buildCandidateTimes,
  conflictsWithExistingSession,
  buildSchedule,
  parseDate,
  formatTime,
} = __testables;

const makeInput = (overrides = {}) => ({
  startDate: parseDate('2026-08-24'),
  preferredDays: new Set([1, 3, 5]),
  preferredMinutes: 600,
  numberOfSessions: 2,
  ...overrides,
});

test('prefers exact requested time when available', () => {
  const candidates = buildCandidateTimes(540, 1020, 60, 600);
  assert.equal(formatTime(candidates[0]), '10:00');
});

test('selects the nearest later time for equal-distance candidates', () => {
  const candidates = buildCandidateTimes(540, 1020, 60, 600);
  const ranked = candidates.filter((value) => value === 585 || value === 615);
  assert.deepEqual(ranked, [615, 585]);
});

test('rejects candidates that exceed the working window', () => {
  const candidates = buildCandidateTimes(540, 1020, 60, 990);
  assert.equal(candidates.includes(990), false);
  assert.equal(candidates.includes(960), true);
});

test('uses interval overlap and allows touching intervals', () => {
  const existing = [{ startTime: 600, endTime: 660, status: 'CONFIRMED' }];
  assert.equal(conflictsWithExistingSession(630, 690, existing), true);
  assert.equal(conflictsWithExistingSession(660, 720, existing), false);
});

test('only pending and confirmed sessions block candidates', () => {
  const rejected = [{ startTime: 600, endTime: 660, status: 'REJECTED' }];
  const cancelled = [{ startTime: 600, endTime: 660, status: 'CANCELLED' }];
  assert.equal(conflictsWithExistingSession(615, 675, rejected), false);
  assert.equal(conflictsWithExistingSession(615, 675, cancelled), false);
});

test('returns no schedule when therapy duration cannot fit the working window', () => {
  const schedule = buildSchedule(
    { PractitionerId: 1 },
    new Map([[1, new Map([[1, [{ StartTime: '09:00', EndTime: '11:00' }]]])]]),
    new Map(),
    makeInput({ numberOfSessions: 1 }),
    121
  );
  assert.equal(schedule, null);
});

test('generates a complete schedule across preferred days', () => {
  const schedule = buildSchedule(
    { PractitionerId: 1 },
    new Map([[1, new Map([
      [1, [{ StartTime: '09:00', EndTime: '17:00' }]],
      [3, [{ StartTime: '09:00', EndTime: '17:00' }]],
    ])]]),
    new Map(),
    makeInput({ numberOfSessions: 2 }),
    60
  );
  assert.equal(schedule.schedule.length, 2);
  assert.equal(schedule.schedule[0].date, '2026-08-24');
  assert.equal(schedule.schedule[1].date, '2026-08-26');
});

test('skips a conflicting preferred slot and selects a nearby valid slot', () => {
  const schedule = buildSchedule(
    { PractitionerId: 1 },
    new Map([[1, new Map([[1, [{ StartTime: '09:00', EndTime: '17:00' }]]])]]),
    new Map([[1, [{ date: '2026-08-24', StartTime: '10:00', EndTime: '11:00', Status: 'PENDING' }]]]),
    makeInput({ numberOfSessions: 1 }),
    60
  );
  assert.equal(schedule.schedule[0].startTime, '11:00');
});