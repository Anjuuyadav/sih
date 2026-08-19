const repository = require('../repositories/patientAppointmentRepository');
const { NotFoundError } = require('../utils/errors');

const getUserId = (authenticatedUser) => Number(
  authenticatedUser?.UserId
  ?? authenticatedUser?.userId
  ?? authenticatedUser?.id
);

const toDateKey = (value) => (value instanceof Date
  ? value.toISOString().slice(0, 10)
  : String(value || '').slice(0, 10));

const toTime = (value) => String(value || '').slice(0, 5);

const mapRows = (rows) => {
  const appointments = new Map();

  rows.forEach((row) => {
    if (!appointments.has(row.TherapyPlanId)) {
      appointments.set(row.TherapyPlanId, {
        therapyPlanId: row.TherapyPlanId,
        therapy: {
          therapyId: row.TherapyId,
          therapyName: row.TherapyName,
        },
        practitioner: {
          practitionerId: row.PractitionerId,
          firstName: row.PractitionerFirstName,
          lastName: row.PractitionerLastName,
          specialization: row.Specialization,
        },
        numberOfSessions: row.NumberOfSessions,
        preferredStartDate: toDateKey(row.PreferredStartDate),
        preferredTime: toTime(row.PreferredTime),
        durationMinutes: row.DurationMinutes,
        costPerSession: row.CostPerSession,
        totalCost: row.TotalCost,
        status: row.PlanStatus,
        rejectionReason: row.RejectionReason,
        createdAt: row.PlanCreatedAt,
        sessions: [],
      });
    }

    if (row.SessionId !== null && row.SessionId !== undefined) {
      appointments.get(row.TherapyPlanId).sessions.push({
        sessionId: row.SessionId,
        sessionNumber: row.SessionNumber,
        sessionDate: toDateKey(row.SessionDate),
        startTime: toTime(row.StartTime),
        endTime: toTime(row.EndTime),
        status: row.SessionStatus,
      });
    }
  });

  return [...appointments.values()].map((appointment) => ({
    ...appointment,
    sessions: appointment.sessions.sort((first, second) => (
      first.sessionDate.localeCompare(second.sessionDate)
      || first.startTime.localeCompare(second.startTime)
      || first.sessionNumber - second.sessionNumber
    )),
  }));
};

const getAppointments = async (authenticatedUser) => {
  const userId = getUserId(authenticatedUser);
  if (!Number.isInteger(userId) || userId < 1) {
    throw new NotFoundError('Authenticated user could not be resolved');
  }

  const patient = await repository.getPatientByUserId(userId);
  if (!patient) throw new NotFoundError('Patient profile not found for the authenticated user');

  const rows = await repository.getAppointmentsByPatientId(patient.PatientId);
  return mapRows(rows);
};

module.exports = {
  getAppointments,
  __testables: {
    mapRows,
    getUserId,
  },
};