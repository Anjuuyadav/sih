const assert = require('node:assert/strict');
const test = require('node:test');
const { __testables } = require('../backend/src/services/availabilityService');

const {
  buildCandidateTimes,
  conflictsWithExistingSession,
  buildSchedule,
  parseDate,
  formatTime,
  getIsoDayOfWeek,
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

test('maps dates to the database weekday convention', () => {
  assert.equal(getIsoDayOfWeek(parseDate('2026-08-21')), 5);
  assert.equal(getIsoDayOfWeek(parseDate('2026-08-24')), 1);
  assert.equal(getIsoDayOfWeek(parseDate('2026-08-23')), 7);
});

test('searches forward when the preferred start date is not a preferred weekday', () => {
  const schedule = buildSchedule(
    { PractitionerId: 6 },
    new Map([[6, new Map([[1, [{ StartTime: '09:00:00.0000000', EndTime: '17:00:00.0000000' }]]])]]),
    new Map(),
    {
      startDate: parseDate('2026-08-21'),
      preferredDays: new Set([1]),
      preferredMinutes: 600,
      numberOfSessions: 1,
    },
    60
  );
  assert.deepEqual(schedule.schedule, [{
    sessionNumber: 1,
    date: '2026-08-24',
    startTime: '10:00',
    endTime: '11:00',
  }]);
});

test('Practitioner 6-style weekly availability is eligible for the reproduction case', () => {
  const availabilityByDay = new Map();
  for (let day = 1; day <= 6; day += 1) {
    availabilityByDay.set(day, [{ StartTime: '09:00', EndTime: '17:00' }]);
  }
  const schedule = buildSchedule(
    { PractitionerId: 6 },
    new Map([[6, availabilityByDay]]),
    new Map(),
    {
      startDate: parseDate('2026-08-21'),
      preferredDays: new Set([1]),
      preferredMinutes: 600,
      numberOfSessions: 1,
    },
    60
  );
  assert.equal(schedule.schedule.length, 1);
  assert.equal(schedule.schedule[0].date, '2026-08-24');
});

test('rejects an overlapping blocking session but allows touching sessions', () => {
  const blocking = [{ startTime: 570, endTime: 630, status: 'PENDING' }];
  const touching = [{ startTime: 480, endTime: 600, status: 'CONFIRMED' }];
  assert.equal(conflictsWithExistingSession(600, 660, blocking), true);
  assert.equal(conflictsWithExistingSession(600, 660, touching), false);
});

test('rejected and cancelled sessions do not block the requested time', () => {
  const sessions = [
    { startTime: 570, endTime: 630, status: 'REJECTED' },
    { startTime: 570, endTime: 630, status: 'CANCELLED' },
  ];
  assert.equal(conflictsWithExistingSession(600, 660, sessions), false);
});

test('generates exactly the requested number of sessions', () => {
  const schedule = buildSchedule(
    { PractitionerId: 6 },
    new Map([[6, new Map([
      [1, [{ StartTime: '09:00', EndTime: '17:00' }]],
      [3, [{ StartTime: '09:00', EndTime: '17:00' }]],
      [5, [{ StartTime: '09:00', EndTime: '17:00' }]],
    ])]]),
    new Map(),
    {
      startDate: parseDate('2026-08-21'),
      preferredDays: new Set([1, 3, 5]),
      preferredMinutes: 600,
      numberOfSessions: 3,
    },
    60
  );
  assert.equal(schedule.schedule.length, 3);
  assert.deepEqual(schedule.schedule.map((session) => session.date), ['2026-08-21', '2026-08-24', '2026-08-26']);
});

test('does not treat a 10:00 start as fitting when an 8-hour therapy ends at 18:00', () => {
  const candidates = buildCandidateTimes(540, 1020, 480, 600);
  assert.equal(candidates.includes(600), false);
});

test('equal-distance flexible candidates prefer the later time', () => {
  const candidates = [585, 615].sort((first, second) => {
    const firstDistance = Math.abs(first - 600);
    const secondDistance = Math.abs(second - 600);
    return firstDistance - secondDistance || second - first;
  });
  assert.equal(candidates[0], 615);
});

test('normalizes SQL Server TIME values returned as Date objects', () => {
  assert.equal(__testables.toMinutes(new Date('1970-01-01T09:00:00.000Z')), 540);
  assert.equal(__testables.toMinutes(new Date('1970-01-01T17:00:00.000Z')), 1020);
});