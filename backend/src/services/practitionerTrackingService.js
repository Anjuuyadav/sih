const repository = require('../repositories/practitionerTrackingRepository');
const { ConflictError, ForbiddenError, NotFoundError } = require('../utils/errors');

const PLAN_TRACKING_STATUSES = new Set(['CONFIRMED', 'COMPLETED']);
const COMPLETABLE_SESSION_STATUS = 'CONFIRMED';
const COMPLETED_SESSION_STATUS = 'COMPLETED';

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
    if (!plans.has(row.TherapyPlanId)) {
      plans.set(row.TherapyPlanId, {
        therapyPlanId: row.TherapyPlanId,
        patient: {
          patientId: row.PatientId,
          name: row.PatientName,
          email: row.PatientEmail,
          contactNumber: row.PatientContactNumber,
        },
        practitioner: {
          practitionerId: row.PractitionerId,
          firstName: row.PractitionerFirstName,
          lastName: row.PractitionerLastName,
          specialization: row.Specialization,
        },
        therapy: {
          therapyId: row.TherapyId,
          therapyName: row.TherapyName,
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

  return [...plans.values()]
    .map((plan) => ({
      ...plan,
      sessions: plan.sessions.sort(compareSessionDateTime),
    }))
    .sort((first, second) => String(second.createdAt || '').localeCompare(String(first.createdAt || '')));
};

const withProgress = (plan) => {
  const totalSessions = Number(plan.numberOfSessions || plan.sessions.length || 0);
  const completedSessions = plan.sessions.filter((session) => session.status === COMPLETED_SESSION_STATUS).length;
  const remainingSessions = Math.max(totalSessions - completedSessions, 0);
  const progressPercentage = totalSessions > 0
    ? Math.round((completedSessions / totalSessions) * 100)
    : 0;

  const nextSession = plan.sessions
    .filter((session) => session.status === COMPLETABLE_SESSION_STATUS)
    .sort(compareSessionDateTime)[0] || null;

  return {
    ...plan,
    totalSessions,
    completedSessions,
    remainingSessions,
    progressPercentage,
    nextSession,
  };
};

const resolvePractitioner = async (authenticatedUser) => {
  const userId = getUserId(authenticatedUser);
  if (!Number.isInteger(userId) || userId < 1) {
    throw new NotFoundError('Authenticated practitioner could not be resolved');
  }

  const practitioner = await repository.getPractitionerByUserId(userId);
  if (!practitioner) throw new ForbiddenError('Practitioner profile not found');
  if (!practitioner.IsActive) throw new ForbiddenError('Practitioner account is inactive');
  return practitioner;
};

const listTrackedPatients = async (authenticatedUser) => {
  const practitioner = await resolvePractitioner(authenticatedUser);
  const rows = await repository.getTrackedPlansByPractitionerId(practitioner.PractitionerId);
  const plans = mapRowsToPlans(rows).map(withProgress);

  const patients = plans.reduce((result, plan) => {
    const patientId = Number(plan.patient?.patientId);
    if (!result.has(patientId)) {
      result.set(patientId, {
        patient: plan.patient,
        practitioner: plan.practitioner,
        therapies: new Set(),
        planCount: 0,
        totalSessions: 0,
        completedSessions: 0,
        remainingSessions: 0,
        nextSession: null,
      });
    }

    const current = result.get(patientId);
    current.planCount += 1;
    current.totalSessions += plan.totalSessions;
    current.completedSessions += plan.completedSessions;
    current.remainingSessions += plan.remainingSessions;
    if (plan.therapy?.therapyName) current.therapies.add(plan.therapy.therapyName);

    if (plan.nextSession) {
      if (!current.nextSession || compareSessionDateTime(plan.nextSession, current.nextSession) < 0) {
        current.nextSession = plan.nextSession;
      }
    }

    return result;
  }, new Map());

  return [...patients.values()]
    .map((item) => {
      const progressPercentage = item.totalSessions > 0
        ? Math.round((item.completedSessions / item.totalSessions) * 100)
        : 0;
      return {
        patient: item.patient,
        practitioner: item.practitioner,
        therapies: [...item.therapies],
        planCount: item.planCount,
        totalSessions: item.totalSessions,
        completedSessions: item.completedSessions,
        remainingSessions: item.remainingSessions,
        progressPercentage,
        status: item.remainingSessions > 0 ? 'IN_PROGRESS' : 'COMPLETED',
        nextSession: item.nextSession,
      };
    })
    .sort((first, second) => String(first.patient?.name || '').localeCompare(String(second.patient?.name || '')));
};

const getPatientTrackingDetails = async (patientId, authenticatedUser) => {
  const practitioner = await resolvePractitioner(authenticatedUser);
  const rows = await repository.getTrackedPlansByPractitionerAndPatient(practitioner.PractitionerId, patientId);

  if (!rows.length) {
    const existsElsewhere = await repository.patientHasTrackedPlans(patientId);
    if (existsElsewhere) throw new ForbiddenError('You do not have access to this patient therapy tracking data');
    throw new NotFoundError('No accepted therapy tracking found for this patient');
  }

  const plans = mapRowsToPlans(rows).map(withProgress);
  const aggregate = plans.reduce((result, plan) => ({
    totalSessions: result.totalSessions + plan.totalSessions,
    completedSessions: result.completedSessions + plan.completedSessions,
  }), { totalSessions: 0, completedSessions: 0 });

  const remainingSessions = Math.max(aggregate.totalSessions - aggregate.completedSessions, 0);
  const progressPercentage = aggregate.totalSessions > 0
    ? Math.round((aggregate.completedSessions / aggregate.totalSessions) * 100)
    : 0;

  return {
    patient: plans[0].patient,
    practitioner: plans[0].practitioner,
    totalSessions: aggregate.totalSessions,
    completedSessions: aggregate.completedSessions,
    remainingSessions,
    progressPercentage,
    plans,
  };
};

const markSessionCompleted = async (sessionId, authenticatedUser) => {
  const practitioner = await resolvePractitioner(authenticatedUser);
  const transaction = await repository.getTransaction();

  try {
    const session = await repository.getSessionForCompletionById(transaction, sessionId);
    if (!session) throw new NotFoundError('Therapy session not found');
    if (Number(session.PractitionerId) !== Number(practitioner.PractitionerId)) {
      throw new ForbiddenError('You do not have permission to update this therapy session');
    }
    if (!PLAN_TRACKING_STATUSES.has(String(session.PlanStatus || '').toUpperCase())) {
      throw new ConflictError('This therapy plan is not active for tracking');
    }
    if (String(session.SessionStatus || '').toUpperCase() === COMPLETED_SESSION_STATUS) {
      throw new ConflictError('Session is already marked as completed');
    }
    if (String(session.SessionStatus || '').toUpperCase() !== COMPLETABLE_SESSION_STATUS) {
      throw new ConflictError('Only confirmed sessions can be marked completed');
    }

    const updated = await repository.updateSessionToCompleted(transaction, sessionId);
    if (updated !== 1) {
      throw new ConflictError('Session status changed while updating. Please refresh and try again.');
    }

    const counts = await repository.getPlanSessionCounts(transaction, session.TherapyPlanId);
    if (Number(counts.TotalSessions) > 0 && Number(counts.CompletedSessions) === Number(counts.TotalSessions)) {
      await repository.updatePlanToCompleted(transaction, session.TherapyPlanId);
    }

    await transaction.commit();

    const updatedSession = await repository.getSessionById(sessionId);
    return {
      session: {
        sessionId: updatedSession.SessionId,
        therapyPlanId: updatedSession.TherapyPlanId,
        sessionNumber: updatedSession.SessionNumber,
        sessionDate: toDateKey(updatedSession.SessionDate),
        startTime: toTime(updatedSession.StartTime),
        endTime: toTime(updatedSession.EndTime),
        status: updatedSession.Status,
      },
    };
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (rollbackError) {
      // Keep original error.
    }
    throw error;
  }
};

module.exports = {
  listTrackedPatients,
  getPatientTrackingDetails,
  markSessionCompleted,
  __testables: {
    mapRowsToPlans,
    withProgress,
    getUserId,
  },
};
