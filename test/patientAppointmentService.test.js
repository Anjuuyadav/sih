const assert = require('node:assert/strict');
const test = require('node:test');
const repository = require('../backend/src/repositories/patientAppointmentRepository');
const service = require('../backend/src/services/patientAppointmentService');
const route = require('../backend/src/routes/patientAppointmentRoutes');

const baseRows = [
  {
    TherapyPlanId: 20, PatientId: 7, NumberOfSessions: 2, PreferredStartDate: '2099-08-25', PreferredTime: '10:00:00', PlanStatus: 'CONFIRMED', DurationMinutes: 60, CostPerSession: 1500, TotalCost: 3000, RejectionReason: null, PlanCreatedAt: '2099-08-01', TherapyId: 1, TherapyName: 'Abhyanga', PractitionerId: 5, PractitionerFirstName: 'Dr.', PractitionerLastName: 'Sharma', Specialization: 'Panchkarma', SessionId: 202, SessionNumber: 2, SessionDate: '2099-08-27', StartTime: '10:00:00', EndTime: '11:00:00', SessionStatus: 'CONFIRMED',
  },
  {
    TherapyPlanId: 20, PatientId: 7, NumberOfSessions: 2, PreferredStartDate: '2099-08-25', PreferredTime: '10:00:00', PlanStatus: 'CONFIRMED', DurationMinutes: 60, CostPerSession: 1500, TotalCost: 3000, RejectionReason: null, PlanCreatedAt: '2099-08-01', TherapyId: 1, TherapyName: 'Abhyanga', PractitionerId: 5, PractitionerFirstName: 'Dr.', PractitionerLastName: 'Sharma', Specialization: 'Panchkarma', SessionId: 201, SessionNumber: 1, SessionDate: '2099-08-25', StartTime: '10:00:00', EndTime: '11:00:00', SessionStatus: 'CONFIRMED',
  },
  {
    TherapyPlanId: 19, PatientId: 7, NumberOfSessions: 1, PreferredStartDate: '2099-09-01', PreferredTime: '11:00:00', PlanStatus: 'REJECTED', DurationMinutes: 45, CostPerSession: 2000, TotalCost: 2000, RejectionReason: 'Schedule unavailable.', PlanCreatedAt: '2099-07-01', TherapyId: 2, TherapyName: 'Shirodhara', PractitionerId: 6, PractitionerFirstName: 'Dr.', PractitionerLastName: 'Mehta', Specialization: 'Ayurveda', SessionId: 301, SessionNumber: 1, SessionDate: '2099-09-01', StartTime: '11:00:00', EndTime: '11:45:00', SessionStatus: 'REJECTED',
  },
];

const withRepository = async (overrides, callback) => {
  const original = {};
  Object.keys(overrides).forEach((key) => {
    original[key] = repository[key];
    repository[key] = overrides[key];
  });
  try {
    return await callback();
  } finally {
    Object.keys(original).forEach((key) => { repository[key] = original[key]; });
  }
};

test('returns only plans belonging to the authenticated patient', async () => {
  const result = await withRepository({
    getPatientByUserId: async (userId) => {
      assert.equal(userId, 42);
      return { PatientId: 7, UserId: 42 };
    },
    getAppointmentsByPatientId: async (patientId) => {
      assert.equal(patientId, 7);
      return baseRows;
    },
  }, () => service.getAppointments({ id: 42, role: 'patient' }));
  assert.equal(result.length, 2);
  assert.ok(result.every((appointment) => appointment.therapyPlanId === 20 || appointment.therapyPlanId === 19));
});

test('groups sessions under the correct plan and sorts them chronologically', () => {
  const result = service.__testables.mapRows(baseRows);
  assert.equal(result[0].therapyPlanId, 20);
  assert.deepEqual(result[0].sessions.map((session) => session.sessionNumber), [1, 2]);
  assert.equal(result[0].sessions[0].sessionDate, '2099-08-25');
});

test('returns rejected, pending, confirmed, and completed historical plans', () => {
  const statuses = ['PENDING', 'CONFIRMED', 'REJECTED', 'COMPLETED'];
  const result = service.__testables.mapRows(statuses.map((status, index) => ({
    ...baseRows[0],
    TherapyPlanId: index + 1,
    PlanStatus: status,
    RejectionReason: status === 'REJECTED' ? 'Not available.' : null,
  })));
  assert.deepEqual(result.map((appointment) => appointment.status), statuses);
  assert.equal(result[2].rejectionReason, 'Not available.');
});

test('patient with no plans receives an empty array', async () => {
  const result = await withRepository({
    getPatientByUserId: async () => ({ PatientId: 7, UserId: 42 }),
    getAppointmentsByPatientId: async () => [],
  }, () => service.getAppointments({ id: 42 }));
  assert.deepEqual(result, []);
});

test('missing Patients row returns a clear not-found error', async () => {
  await assert.rejects(
    withRepository({ getPatientByUserId: async () => null }, () => service.getAppointments({ id: 42 })),
    /Patient profile not found/
  );
});

test('route requires auth middleware and Patient role middleware', () => {
  const layer = route.stack.find((item) => item.route?.path === '/appointments');
  assert.ok(layer);
  assert.equal(layer.route.methods.get, true);
  assert.equal(layer.route.stack.length, 3);
});