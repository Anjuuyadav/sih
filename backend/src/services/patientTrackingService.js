const repository = require('../repositories/patientAppointmentRepository');
const { NotFoundError } = require('../utils/errors');

const TRACKABLE_PLAN_STATUSES = new Set(['CONFIRMED', 'COMPLETED']);

const getUserId = (authenticatedUser) => Number(
  authenticatedUser?.UserId
  ?? authenticatedUser?.userId
  ?? authenticatedUser?.id
);

const toDateKey = (value) => (value instanceof Date
  ? value.toISOString().slice(0, 10)
  : String(value || '').slice(0, 10));

const toTime = (value) => String(value || '').slice(0, 5);

const compareSessionDateTime = (first, second) => (
  first.sessionDate.localeCompare(second.sessionDate)
  || first.startTime.localeCompare(second.startTime)
  || first.sessionNumber - second.sessionNumber
);

const mapRowsToPlans = (rows) => {
  const plans = new Map();

  rows.forEach((row) => {
    if (!TRACKABLE_PLAN_STATUSES.has(String(row.PlanStatus || '').toUpperCase())) return;

    if (!plans.has(row.TherapyPlanId)) {
      plans.set(row.TherapyPlanId, {
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
        status: row.PlanStatus,
        createdAt: row.PlanCreatedAt,
        sessions: [],
      });
    }

    if (row.SessionId !== null && row.SessionId !== undefined) {
      plans.get(row.TherapyPlanId).sessions.push({
        sessionId: row.SessionId,
        sessionNumber: row.SessionNumber,
        sessionDate: toDateKey(row.SessionDate),
        startTime: toTime(row.StartTime),
        endTime: toTime(row.EndTime),
        status: row.SessionStatus,
      });
    }
  });

  return [...plans.values()].map((plan) => {
    const sessions = plan.sessions.sort(compareSessionDateTime);
    const totalSessions = Number(plan.numberOfSessions || sessions.length || 0);
    const completedSessions = sessions.filter((session) => session.status === 'COMPLETED').length;
    const remainingSessions = Math.max(totalSessions - completedSessions, 0);
    const progressPercentage = totalSessions > 0
      ? Math.round((completedSessions / totalSessions) * 100)
      : 0;

    return {
      ...plan,
      sessions,
      totalSessions,
      completedSessions,
      remainingSessions,
      progressPercentage,
      upcomingSessions: sessions
        .filter((session) => session.status !== 'COMPLETED')
        .sort(compareSessionDateTime),
      completedSessionHistory: sessions
        .filter((session) => session.status === 'COMPLETED')
        .sort((first, second) => compareSessionDateTime(second, first)),
    };
  }).sort((first, second) => String(second.createdAt || '').localeCompare(String(first.createdAt || '')));
};

const getTherapyTracking = async (authenticatedUser) => {
  const userId = getUserId(authenticatedUser);
  if (!Number.isInteger(userId) || userId < 1) {
    throw new NotFoundError('Authenticated user could not be resolved');
  }

  const patient = await repository.getPatientByUserId(userId);
  if (!patient) throw new NotFoundError('Patient profile not found for the authenticated user');

  const rows = await repository.getAppointmentsByPatientId(patient.PatientId);
  const plans = mapRowsToPlans(rows);

  const totals = plans.reduce((result, plan) => ({
    totalSessions: result.totalSessions + plan.totalSessions,
    completedSessions: result.completedSessions + plan.completedSessions,
  }), { totalSessions: 0, completedSessions: 0 });

  const remainingSessions = Math.max(totals.totalSessions - totals.completedSessions, 0);
  const progressPercentage = totals.totalSessions > 0
    ? Math.round((totals.completedSessions / totals.totalSessions) * 100)
    : 0;

  return {
    totalSessions: totals.totalSessions,
    completedSessions: totals.completedSessions,
    remainingSessions,
    progressPercentage,
    plans,
  };
};

module.exports = {
  getTherapyTracking,
  __testables: {
    mapRowsToPlans,
    getUserId,
  },
};
