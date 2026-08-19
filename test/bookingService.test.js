const assert = require('node:assert/strict');
const test = require('node:test');
const bookingRepository = require('../backend/src/repositories/bookingRepository');
const bookingService = require('../backend/src/services/bookingService');

const request = {
  therapyId: 1,
  numberOfSessions: 2,
  preferredStartDate: '2026-08-24',
  preferredDays: [1],
  preferredTime: '10:00',
  practitionerId: 5,
  schedule: [
    { sessionNumber: 1, sessionDate: '2026-08-24', startTime: '10:00', endTime: '11:00' },
    { sessionNumber: 2, sessionDate: '2026-08-31', startTime: '10:00', endTime: '11:00' },
  ],
};

const createRepositoryStub = (overrides = {}) => {
  const calls = {
    preferredDays: [],
    sessions: [],
  };
  const transaction = {
    committed: false,
    rolledBack: false,
    commit: async () => { transaction.committed = true; },
    rollback: async () => { transaction.rolledBack = true; },
  };
  const methods = {
    getTransaction: async () => transaction,
    getPatientByUserId: async () => ({ PatientId: 9, UserId: 42 }),
    getTherapy: async () => ({ TherapyId: 1, TherapyName: 'Abhyanga', Cost: 1500, Duration: 60, IsActive: true }),
    getPractitioner: async () => ({ PractitionerId: 5, FirstName: 'Dr.', LastName: 'Sharma', Specialization: 'Panchkarma', IsActive: true }),
    getAvailability: async () => [{ PractitionerId: 5, DayOfWeek: 1, StartTime: '09:00', EndTime: '17:00', IsAvailable: true }],
    getBlockingSessions: async () => [],
    getDuplicatePendingPlan: async () => null,
    findConflict: async () => null,
    createTherapyPlan: async () => 101,
    createPreferredDay: async (_transaction, _planId, day) => { calls.preferredDays.push(day); },
    createTherapySession: async (_transaction, session) => { calls.sessions.push(session); return calls.sessions.length; },
    ...overrides,
  };
  return { calls, transaction, methods };
};

const withRepository = async (stub, callback) => {
  const original = {};
  Object.keys(stub.methods).forEach((key) => {
    original[key] = bookingRepository[key];
    bookingRepository[key] = stub.methods[key];
  });
  try {
    return await callback();
  } finally {
    Object.keys(original).forEach((key) => { bookingRepository[key] = original[key]; });
  }
};

test('creates one pending plan, preferred days, and all pending sessions atomically', async () => {
  const stub = createRepositoryStub();
  const result = await withRepository(stub, () => bookingService.createBooking(request, { id: 42 }));

  assert.equal(stub.transaction.committed, true);
  assert.equal(stub.transaction.rolledBack, false);
  assert.equal(result.therapyPlanId, 101);
  assert.equal(result.status, 'PENDING');
  assert.equal(result.durationMinutes, 60);
  assert.equal(result.costPerSession, 1500);
  assert.equal(result.totalCost, 3000);
  assert.deepEqual(stub.calls.preferredDays, [1]);
  assert.equal(stub.calls.sessions.length, 2);
  assert.ok(stub.calls.sessions.every((session) => session.practitionerId === 5));
});

test('rolls back when the final conflict check finds a blocking session', async () => {
  const stub = createRepositoryStub({ findConflict: async () => ({ SessionId: 700 }) });
  await assert.rejects(
    withRepository(stub, () => bookingService.createBooking(request, { UserId: 42 })),
    /just booked/
  );
  assert.equal(stub.transaction.committed, false);
  assert.equal(stub.transaction.rolledBack, true);
  assert.equal(stub.calls.sessions.length, 0);
});

test('rolls back the complete booking when an insert fails after plan creation', async () => {
  const stub = createRepositoryStub({
    createPreferredDay: async () => { throw new Error('simulated insert failure'); },
  });
  await assert.rejects(
    withRepository(stub, () => bookingService.createBooking(request, { id: 42 })),
    /simulated insert failure/
  );
  assert.equal(stub.transaction.committed, false);
  assert.equal(stub.transaction.rolledBack, true);
});

test('rejects invalid booking schedule shape before database work', () => {
  assert.throws(
    () => bookingService.__testables.validateRequest({ ...request, numberOfSessions: 1 }),
    /exactly the requested number of sessions/
  );
  assert.throws(
    () => bookingService.__testables.validateRequest({ ...request, preferredDays: [1, 1] }),
    /duplicates/
  );
  assert.throws(
    () => bookingService.__testables.validateRequest({ ...request, preferredStartDate: '2020-01-01' }),
    /cannot be in the past/
  );
});

test('rejects inactive therapy and missing patient without creating data', async () => {
  const inactiveTherapy = createRepositoryStub({ getTherapy: async () => ({ TherapyId: 1, IsActive: false }) });
  await assert.rejects(
    withRepository(inactiveTherapy, () => bookingService.createBooking(request, { id: 42 })),
    /inactive/
  );
  assert.equal(inactiveTherapy.transaction.rolledBack, true);

  const missingPatient = createRepositoryStub({ getPatientByUserId: async () => null });
  await assert.rejects(
    withRepository(missingPatient, () => bookingService.createBooking(request, { id: 42 })),
    /Patient profile not found/
  );
  assert.equal(missingPatient.transaction.rolledBack, true);
});