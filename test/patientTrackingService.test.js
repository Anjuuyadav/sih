const assert = require('node:assert/strict');
const test = require('node:test');
const repository = require('../backend/src/repositories/patientAppointmentRepository');
const service = require('../backend/src/services/patientTrackingService');
const route = require('../backend/src/routes/patientTrackingRoutes');

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

const rows = [
  {
    TherapyPlanId: 20,
    PatientId: 7,
    NumberOfSessions: 2,
    PreferredStartDate: '2099-08-25',
    PreferredTime: '10:00:00',
    PlanStatus: 'CONFIRMED',
    PlanCreatedAt: '2099-08-01',
    TherapyId: 1,
    TherapyName: 'Abhyanga',
    PractitionerId: 5,
    PractitionerFirstName: 'Dr.',
    PractitionerLastName: 'Sharma',
    Specialization: 'Panchkarma',
    SessionId: 201,
    SessionNumber: 1,
    SessionDate: '2099-08-25',
    StartTime: '10:00:00',
    EndTime: '11:00:00',
    SessionStatus: 'COMPLETED',
  },
  {
    TherapyPlanId: 20,
    PatientId: 7,
    NumberOfSessions: 2,
    PreferredStartDate: '2099-08-25',
    PreferredTime: '10:00:00',
    PlanStatus: 'CONFIRMED',
    PlanCreatedAt: '2099-08-01',
    TherapyId: 1,
    TherapyName: 'Abhyanga',
    PractitionerId: 5,
    PractitionerFirstName: 'Dr.',
    PractitionerLastName: 'Sharma',
    Specialization: 'Panchkarma',
    SessionId: 202,
    SessionNumber: 2,
    SessionDate: '2099-08-27',
    StartTime: '10:00:00',
    EndTime: '11:00:00',
    SessionStatus: 'CONFIRMED',
  },
  {
    TherapyPlanId: 21,
    PatientId: 7,
    NumberOfSessions: 1,
    PreferredStartDate: '2099-09-01',
    PreferredTime: '11:00:00',
    PlanStatus: 'PENDING',
    PlanCreatedAt: '2099-07-01',
    TherapyId: 2,
    TherapyName: 'Shirodhara',
    PractitionerId: 6,
    PractitionerFirstName: 'Dr.',
    PractitionerLastName: 'Mehta',
    Specialization: 'Ayurveda',
    SessionId: 301,
    SessionNumber: 1,
    SessionDate: '2099-09-01',
    StartTime: '11:00:00',
    EndTime: '11:45:00',
    SessionStatus: 'PENDING',
  },
];

test('patient tracking returns only confirmed/completed plans with computed progress', async () => {
  const result = await withRepository({
    getPatientByUserId: async () => ({ PatientId: 7, UserId: 42 }),
    getAppointmentsByPatientId: async () => rows,
  }, () => service.getTherapyTracking({ id: 42, role: 'patient' }));

  assert.equal(result.plans.length, 1);
  assert.equal(result.totalSessions, 2);
  assert.equal(result.completedSessions, 1);
  assert.equal(result.progressPercentage, 50);
});

test('route requires auth middleware and Patient role middleware', () => {
  const layer = route.stack.find((item) => item.route?.path === '/therapy-tracking');
  assert.ok(layer);
  assert.equal(layer.route.methods.get, true);
  assert.equal(layer.route.stack.length, 3);
});

test('progress uses completed over total sessions (6/10 -> 60%)', async () => {
  const tenSessions = Array.from({ length: 10 }, (_, index) => ({
    ...rows[0],
    NumberOfSessions: 10,
    SessionId: 700 + index,
    SessionNumber: index + 1,
    SessionDate: `2099-10-${String(index + 1).padStart(2, '0')}`,
    SessionStatus: index < 6 ? 'COMPLETED' : 'CONFIRMED',
  }));

  const result = await withRepository({
    getPatientByUserId: async () => ({ PatientId: 7, UserId: 42 }),
    getAppointmentsByPatientId: async () => tenSessions,
  }, () => service.getTherapyTracking({ id: 42, role: 'patient' }));

  assert.equal(result.totalSessions, 10);
  assert.equal(result.completedSessions, 6);
  assert.equal(result.remainingSessions, 4);
  assert.equal(result.progressPercentage, 60);
});
