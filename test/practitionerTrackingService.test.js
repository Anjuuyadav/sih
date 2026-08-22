const assert = require('node:assert/strict');
const test = require('node:test');
const repository = require('../backend/src/repositories/practitionerTrackingRepository');
const service = require('../backend/src/services/practitionerTrackingService');
const route = require('../backend/src/routes/practitionerTrackingRoutes');

const withRepository = async (overrides, callback) => {
  const original = {};
  Object.keys(overrides).forEach((key) => {
    original[key] = repository[key];
    repository[key] = overrides[key];
  });
  try {
    return await callback();
  } finally {
    Object.keys(original).forEach((key) => {
      repository[key] = original[key];
    });
  }
};

const practitioner = { id: 100, role: 'practitioner' };

const baseRows = [
  {
    TherapyPlanId: 50,
    PatientId: 7,
    PractitionerId: 9,
    TherapyId: 2,
    NumberOfSessions: 3,
    PreferredStartDate: '2099-01-01',
    PreferredTime: '10:00:00',
    PlanStatus: 'CONFIRMED',
    PlanCreatedAt: '2099-01-01T00:00:00.000Z',
    PatientName: 'Rahul',
    PatientEmail: 'rahul@example.com',
    PatientContactNumber: '9000000000',
    TherapyName: 'Abhyanga',
    PractitionerFirstName: 'Dr',
    PractitionerLastName: 'Sharma',
    Specialization: 'Panchkarma',
    SessionId: 501,
    SessionNumber: 1,
    SessionDate: '2099-01-01',
    StartTime: '10:00:00',
    EndTime: '11:00:00',
    SessionStatus: 'COMPLETED',
  },
  {
    TherapyPlanId: 50,
    PatientId: 7,
    PractitionerId: 9,
    TherapyId: 2,
    NumberOfSessions: 3,
    PreferredStartDate: '2099-01-01',
    PreferredTime: '10:00:00',
    PlanStatus: 'CONFIRMED',
    PlanCreatedAt: '2099-01-01T00:00:00.000Z',
    PatientName: 'Rahul',
    PatientEmail: 'rahul@example.com',
    PatientContactNumber: '9000000000',
    TherapyName: 'Abhyanga',
    PractitionerFirstName: 'Dr',
    PractitionerLastName: 'Sharma',
    Specialization: 'Panchkarma',
    SessionId: 502,
    SessionNumber: 2,
    SessionDate: '2099-01-03',
    StartTime: '10:00:00',
    EndTime: '11:00:00',
    SessionStatus: 'CONFIRMED',
  },
];

test('practitioner tracked patients returns aggregated progress from confirmed plans', async () => {
  const result = await withRepository({
    getPractitionerByUserId: async () => ({ PractitionerId: 9, UserId: 100, IsActive: true }),
    getTrackedPlansByPractitionerId: async () => baseRows,
  }, () => service.listTrackedPatients(practitioner));

  assert.equal(result.length, 1);
  assert.equal(result[0].patient.name, 'Rahul');
  assert.equal(result[0].totalSessions, 3);
  assert.equal(result[0].completedSessions, 1);
  assert.equal(result[0].progressPercentage, 33);
});

test('mark session completed enforces ownership and updates status atomically', async () => {
  const transaction = {
    committed: false,
    rolledBack: false,
    commit: async () => { transaction.committed = true; },
    rollback: async () => { transaction.rolledBack = true; },
  };

  const result = await withRepository({
    getPractitionerByUserId: async () => ({ PractitionerId: 9, UserId: 100, IsActive: true }),
    getTransaction: async () => transaction,
    getSessionForCompletionById: async () => ({
      SessionId: 502,
      TherapyPlanId: 50,
      PractitionerId: 9,
      SessionStatus: 'CONFIRMED',
      PlanStatus: 'CONFIRMED',
    }),
    updateSessionToCompleted: async () => 1,
    getPlanSessionCounts: async () => ({ TotalSessions: 3, CompletedSessions: 2 }),
    updatePlanToCompleted: async () => 0,
    getSessionById: async () => ({
      SessionId: 502,
      TherapyPlanId: 50,
      SessionNumber: 2,
      SessionDate: '2099-01-03',
      StartTime: '10:00:00',
      EndTime: '11:00:00',
      Status: 'COMPLETED',
    }),
  }, () => service.markSessionCompleted(502, practitioner));

  assert.equal(result.session.status, 'COMPLETED');
  assert.equal(transaction.committed, true);
  assert.equal(transaction.rolledBack, false);
});

test('route enforces authentication and Practitioner role', () => {
  const layer = route.stack.find((item) => item.route?.path === '/therapy-tracking/patients');
  assert.ok(layer);
  assert.equal(layer.route.methods.get, true);
  assert.equal(layer.route.stack.length, 3);
});
