const assert = require('node:assert/strict');
const test = require('node:test');
const repository = require('../backend/src/repositories/practitionerRequestRepository');
const service = require('../backend/src/services/practitionerRequestService');
const notificationService = require('../backend/src/services/notificationService');

notificationService.sendBookingAcceptedNotifications = async () => ({ status: 'SENT' });
notificationService.sendBookingRejectedNotifications = async () => ({ status: 'SENT' });

const authenticatedPractitioner = { id: 50, role: 'practitioner' };
const plan = {
  TherapyPlanId: 25,
  PatientId: 10,
  PractitionerId: 5,
  NumberOfSessions: 2,
  Status: 'PENDING',
  DurationMinutes: 60,
  therapyIsActive: true,
  practitionerIsActive: true,
};
const sessions = [
  { SessionId: 101, TherapyPlanId: 25, PractitionerId: 5, SessionNumber: 1, SessionDate: '2099-08-24', StartTime: '10:00', EndTime: '11:00', Status: 'PENDING' },
  { SessionId: 102, TherapyPlanId: 25, PractitionerId: 5, SessionNumber: 2, SessionDate: '2099-08-31', StartTime: '10:00', EndTime: '11:00', Status: 'PENDING' },
];
const availability = [
  { PractitionerId: 5, DayOfWeek: 1, StartTime: '09:00', EndTime: '17:00', IsAvailable: true },
];

const createStub = (overrides = {}) => {
  const transaction = {
    committed: false,
    rolledBack: false,
    commit: async () => { transaction.committed = true; },
    rollback: async () => { transaction.rolledBack = true; },
  };
  const calls = { planConfirmed: 0, sessionsConfirmed: 0, planRejected: 0, sessionsRejected: 0 };
  const methods = {
    getPractitionerByUserId: async () => ({ PractitionerId: 5, UserId: 50, IsActive: true }),
    getRequestsByPractitionerId: async () => [],
    getRequestDetailsByPractitionerId: async () => null,
    getRequestOwner: async () => null,
    getTransaction: async () => transaction,
    getTherapyPlanForUpdate: async () => ({ ...plan }),
    getTherapyPlanOwnerForUpdate: async () => null,
    getTherapySessionsForUpdate: async () => sessions.map((item) => ({ ...item })),
    getPractitionerAvailabilityForUpdate: async () => availability,
    findConflictingSessions: async () => null,
    updateTherapyPlanToConfirmed: async () => { calls.planConfirmed += 1; return 1; },
    updateSessionsToConfirmed: async () => { calls.sessionsConfirmed += 1; return sessions.length; },
    updateTherapyPlanToRejected: async () => { calls.planRejected += 1; return 1; },
    updateSessionsToRejected: async () => { calls.sessionsRejected += 1; return sessions.length; },
    ...overrides,
  };
  return { methods, transaction, calls };
};

const withRepository = async (stub, callback) => {
  const original = {};
  Object.keys(stub.methods).forEach((key) => {
    original[key] = repository[key];
    repository[key] = stub.methods[key];
  });
  try {
    return await callback();
  } finally {
    Object.keys(original).forEach((key) => { repository[key] = original[key]; });
  }
};

test('practitioner can list only their own requests via authenticated scope', async () => {
  const stub = createStub({
    getRequestsByPractitionerId: async (practitionerId) => {
      assert.equal(practitionerId, 5);
      return [{
        therapyPlanId: 25,
        patient: { patientId: 10, name: 'Anju', email: 'anju@example.com', contactNumber: '9876543210' },
        therapy: { therapyId: 1, therapyName: 'Abhyanga', durationMinutes: 60, costPerSession: 1500 },
        practitioner: { practitionerId: 5 },
        numberOfSessions: 2,
        preferredStartDate: '2099-08-24',
        preferredDays: [{ DayOfWeek: 1 }],
        preferredTime: '10:00',
        status: 'PENDING',
        sessions,
      }];
    },
  });
  const result = await withRepository(stub, () => service.listRequests(authenticatedPractitioner));
  assert.equal(result.length, 1);
  assert.equal(result[0].therapyPlanId, 25);
});

test('practitioner cannot list another practitioner request because repository scope is authenticated id', async () => {
  const stub = createStub({
    getRequestsByPractitionerId: async (practitionerId) => {
      assert.equal(practitionerId, 5);
      return [];
    },
  });
  const result = await withRepository(stub, () => service.listRequests(authenticatedPractitioner));
  assert.deepEqual(result, []);
});

test('practitioner can view own request details', async () => {
  const stub = createStub({
    getRequestDetailsByPractitionerId: async (practitionerId, therapyPlanId) => {
      assert.equal(practitionerId, 5);
      assert.equal(therapyPlanId, 25);
      return {
        therapyPlanId: 25,
        patient: { patientId: 10 },
        therapy: { therapyId: 1 },
        practitioner: { practitionerId: 5 },
        numberOfSessions: 2,
        preferredStartDate: '2099-08-24',
        preferredDays: [{ DayOfWeek: 1 }],
        preferredTime: '10:00',
        status: 'PENDING',
        sessions,
      };
    },
  });
  const result = await withRepository(stub, () => service.getRequestDetails(25, authenticatedPractitioner));
  assert.equal(result.therapyPlanId, 25);
});

test('practitioner cannot view another practitioner request', async () => {
  const stub = createStub({
    getRequestOwner: async () => ({ TherapyPlanId: 25, PractitionerId: 6 }),
  });
  await assert.rejects(
    withRepository(stub, () => service.getRequestDetails(25, authenticatedPractitioner)),
    /access to this session request/
  );
});

test('accept changes the complete plan and all sessions to confirmed atomically', async () => {
  const stub = createStub();
  const result = await withRepository(stub, () => service.acceptRequest(25, authenticatedPractitioner));
  assert.deepEqual(result, { therapyPlanId: 25, status: 'CONFIRMED', sessionsConfirmed: 2, notificationStatus: 'SENT' });
  assert.equal(stub.calls.planConfirmed, 1);
  assert.equal(stub.calls.sessionsConfirmed, 1);
  assert.equal(stub.transaction.committed, true);
});

test('notification failure does not change a committed confirmed booking', async () => {
  notificationService.sendBookingAcceptedNotifications = async () => ({ status: 'FAILED' });
  const stub = createStub();
  const result = await withRepository(stub, () => service.acceptRequest(25, authenticatedPractitioner));
  assert.equal(result.status, 'CONFIRMED');
  assert.equal(result.notificationStatus, 'FAILED');
  assert.equal(stub.transaction.committed, true);
  notificationService.sendBookingAcceptedNotifications = async () => ({ status: 'SENT' });
});

test('reject stores the reason and changes the complete plan and sessions to rejected', async () => {
  const stub = createStub();
  const result = await withRepository(stub, () => service.rejectRequest(25, 'Schedule is not suitable.', authenticatedPractitioner));
  assert.deepEqual(result, { therapyPlanId: 25, status: 'REJECTED', notificationStatus: 'SENT' });
  assert.equal(stub.calls.planRejected, 1);
  assert.equal(stub.calls.sessionsRejected, 1);
  assert.equal(stub.transaction.committed, true);
});

test('accept rejects already confirmed or rejected plans', async () => {
  for (const status of ['CONFIRMED', 'REJECTED']) {
    const stub = createStub({ getTherapyPlanForUpdate: async () => ({ ...plan, Status: status }) });
    await assert.rejects(
      withRepository(stub, () => service.acceptRequest(25, authenticatedPractitioner)),
      status === 'CONFIRMED' ? /already been confirmed/ : /already been rejected/
    );
    assert.equal(stub.transaction.rolledBack, true);
  }
});

test('reject rejects already confirmed or rejected plans', async () => {
  for (const status of ['CONFIRMED', 'REJECTED']) {
    const stub = createStub({ getTherapyPlanForUpdate: async () => ({ ...plan, Status: status }) });
    await assert.rejects(
      withRepository(stub, () => service.rejectRequest(25, 'Not suitable', authenticatedPractitioner)),
      status === 'CONFIRMED' ? /already been confirmed/ : /already been rejected/
    );
    assert.equal(stub.transaction.rolledBack, true);
  }
});

test('accept rejects any conflicting session without partial confirmation', async () => {
  const stub = createStub({ findConflictingSessions: async (_transaction, session) => (
    session.SessionId === 102 ? { SessionId: 999 } : null
  ) });
  await assert.rejects(
    withRepository(stub, () => service.acceptRequest(25, authenticatedPractitioner)),
    /no longer available/
  );
  assert.equal(stub.calls.planConfirmed, 0);
  assert.equal(stub.calls.sessionsConfirmed, 0);
  assert.equal(stub.transaction.rolledBack, true);
});

test('accept rejects when working hours no longer fit', async () => {
  const stub = createStub({
    getPractitionerAvailabilityForUpdate: async () => [{ PractitionerId: 5, DayOfWeek: 1, StartTime: '12:00', EndTime: '17:00', IsAvailable: true }],
  });
  await assert.rejects(
    withRepository(stub, () => service.acceptRequest(25, authenticatedPractitioner)),
    /availability/
  );
  assert.equal(stub.calls.planConfirmed, 0);
  assert.equal(stub.transaction.rolledBack, true);
});

test('accept rejects an invalid session duration or incomplete session set', async () => {
  const invalidDuration = createStub({
    getTherapySessionsForUpdate: async () => [{ ...sessions[0], EndTime: '11:30' }, sessions[1]],
  });
  await assert.rejects(
    withRepository(invalidDuration, () => service.acceptRequest(25, authenticatedPractitioner)),
    /duration/
  );

  const incomplete = createStub({ getTherapySessionsForUpdate: async () => [sessions[0]] });
  await assert.rejects(
    withRepository(incomplete, () => service.acceptRequest(25, authenticatedPractitioner)),
    /complete schedule/
  );
});

test('failed rejection rolls back and does not partially update', async () => {
  const stub = createStub({ updateSessionsToRejected: async () => { throw new Error('update failed'); } });
  await assert.rejects(
    withRepository(stub, () => service.rejectRequest(25, 'Not suitable', authenticatedPractitioner)),
    /update failed/
  );
  assert.equal(stub.calls.planRejected, 1);
  assert.equal(stub.transaction.committed, false);
  assert.equal(stub.transaction.rolledBack, true);
});

test('another practitioner cannot accept or reject the plan', async () => {
  const stub = createStub({
    getPractitionerByUserId: async () => ({ PractitionerId: 6, UserId: 60, IsActive: true }),
    getTherapyPlanForUpdate: async () => null,
    getTherapyPlanOwnerForUpdate: async () => ({ TherapyPlanId: 25, PractitionerId: 5, Status: 'PENDING' }),
  });
  await assert.rejects(
    withRepository(stub, () => service.acceptRequest(25, { id: 60 })),
    /access to this session request/
  );
  await assert.rejects(
    withRepository(stub, () => service.rejectRequest(25, 'Not suitable', { id: 60 })),
    /access to this session request/
  );
});

test('concurrent state transition allows only one business transition', async () => {
  let status = 'PENDING';
  const stub = createStub({
    getTherapyPlanForUpdate: async () => ({ ...plan, Status: status }),
    updateTherapyPlanToConfirmed: async () => {
      if (status !== 'PENDING') return 0;
      status = 'CONFIRMED';
      return 1;
    },
  });
  const first = await withRepository(stub, () => service.acceptRequest(25, authenticatedPractitioner));
  assert.equal(first.status, 'CONFIRMED');
  const second = createStub({
    getTherapyPlanForUpdate: async () => ({ ...plan, Status: status }),
  });
  await assert.rejects(
    withRepository(second, () => service.acceptRequest(25, authenticatedPractitioner)),
    /already been confirmed/
  );
});