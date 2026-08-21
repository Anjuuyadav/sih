const repository = require('../repositories/practitionerRequestRepository');
const notificationService = require('./notificationService');
const { BadRequestError, ConflictError, ForbiddenError, NotFoundError } = require('../utils/errors');

// const toMinutes = (value) => {
//   const match = String(value || '').match(/^(\d{2}):(\d{2})/);
//   return match ? Number(match[1]) * 60 + Number(match[2]) : null;
// };
const toMinutes = (value) => {
  if (value instanceof Date) {
    return value.getUTCHours() * 60 + value.getUTCMinutes();
  }

  const text = String(value || '').trim();

  // Handles HH:mm or HH:mm:ss
  const match = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);

  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (
    !Number.isInteger(hours)
    || !Number.isInteger(minutes)
    || hours < 0
    || hours > 23
    || minutes < 0
    || minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
};

const toDateKey = (value) => {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value || '').slice(0, 10);
};

const getDayOfWeek = (value) => {
  const date = new Date(`${toDateKey(value)}T00:00:00.000Z`);
  const day = date.getUTCDay();
  return day === 0 ? 7 : day;
};

const getUserId = (authenticatedUser) => Number(
  authenticatedUser?.UserId
  ?? authenticatedUser?.userId
  ?? authenticatedUser?.id
);

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

const mapSessions = (sessions) => sessions.map((session) => ({
  sessionId: session.SessionId,
  sessionNumber: session.SessionNumber,
  sessionDate: toDateKey(session.SessionDate),
  startTime: String(session.StartTime).slice(0, 5),
  endTime: String(session.EndTime).slice(0, 5),
  status: session.Status,
  createdAt: session.CreatedAt,
  updatedAt: session.UpdatedAt,
}));

const mapRequest = (request) => ({
  therapyPlanId: request.therapyPlanId,
  patient: request.patient,
  therapy: request.therapy,
  practitioner: request.practitioner,
  numberOfSessions: request.numberOfSessions,
  preferredStartDate: toDateKey(request.preferredStartDate),
  preferredDays: request.preferredDays.map((day) => day.DayOfWeek),
  preferredTime: String(request.preferredTime).slice(0, 5),
  status: request.status,
  rejectionReason: request.rejectionReason,
  createdAt: request.createdAt,
  updatedAt: request.updatedAt,
  sessions: mapSessions(request.sessions),
});

const listPendingRequests = async (authenticatedUser) => {
  const practitioner = await resolvePractitioner(authenticatedUser);
  const requests = await repository.getPendingRequestsByPractitionerId(practitioner.PractitionerId);
  return requests.map(mapRequest);
};

const getRequestDetails = async (therapyPlanId, authenticatedUser) => {
  const practitioner = await resolvePractitioner(authenticatedUser);
  const request = await repository.getRequestDetailsByPractitionerId(
    practitioner.PractitionerId,
    therapyPlanId
  );
  if (request) return mapRequest(request);

  const ownerCheck = await repository.getRequestOwner(therapyPlanId);
  if (ownerCheck) throw new ForbiddenError('You do not have access to this session request');
  throw new NotFoundError('Session request not found');
};

const assertPendingPlan = (plan) => {
  if (plan.Status === 'CONFIRMED') throw new ConflictError('Session request has already been confirmed.');
  if (plan.Status === 'REJECTED') throw new ConflictError('Session request has already been rejected.');
  if (plan.Status === 'CANCELLED') throw new ConflictError('Session request has been cancelled.');
  if (plan.Status === 'COMPLETED') throw new ConflictError('Session request has already been completed.');
  if (plan.Status !== 'PENDING') throw new ConflictError('Session request is not pending.');
};

const assertPendingSessions = (sessions, expectedCount) => {
  if (sessions.length !== expectedCount) {
    throw new ConflictError('The session request does not contain the complete schedule.');
  }
  if (sessions.some((session) => session.Status !== 'PENDING')) {
    throw new ConflictError('All sessions must be pending before acceptance.');
  }
  if (sessions.some((session, index) => session.SessionNumber !== index + 1)) {
    throw new ConflictError('The session request has an invalid session sequence.');
  }
};

const validateCurrentAvailability = (plan, sessions, availability) => {
  const windowsByDay = availability.reduce((result, item) => {
    const day = Number(item.DayOfWeek);
    if (!result.has(day)) result.set(day, []);
    result.get(day).push(item);
    return result;
  }, new Map());

  const orderedSessions = [...sessions].sort((first, second) => (
    toDateKey(first.SessionDate).localeCompare(toDateKey(second.SessionDate))
    || toMinutes(first.StartTime) - toMinutes(second.StartTime)
  ));

  sessions.forEach((session) => {
    if (Number(session.PractitionerId) !== Number(plan.PractitionerId)) {
      throw new ConflictError('The session request contains an invalid practitioner assignment.');
    }
    const start = toMinutes(session.StartTime);
    const end = toMinutes(session.EndTime);
    if (start === null || end === null || end - start !== Number(plan.DurationMinutes)) {
      throw new ConflictError('One or more sessions no longer match the booked therapy duration.');
    }
    const windows = windowsByDay.get(getDayOfWeek(session.SessionDate)) || [];
    const fits = windows.some((window) => (
      start !== null
      && end !== null
      && start >= toMinutes(window.StartTime)
      && end <= toMinutes(window.EndTime)
      && end > start
    ));
    if (!fits) throw new ConflictError('One or more sessions no longer fit the practitioner\'s availability.');
  });

  orderedSessions.forEach((session, index) => {
    if (index === 0) return;
    const previous = orderedSessions[index - 1];
    if (toDateKey(previous.SessionDate) !== toDateKey(session.SessionDate)) return;
    if (toMinutes(previous.StartTime) < toMinutes(session.EndTime)
      && toMinutes(previous.EndTime) > toMinutes(session.StartTime)) {
      throw new ConflictError('The session request contains overlapping sessions.');
    }
  });
};

const acceptRequest = async (therapyPlanId, authenticatedUser) => {
  const practitioner = await resolvePractitioner(authenticatedUser);
  const transaction = await repository.getTransaction();
  try {
    const plan = await repository.getTherapyPlanForUpdate(
      transaction,
      practitioner.PractitionerId,
      therapyPlanId
    );
    console.log('========== ACCEPT REQUEST DEBUG ==========');
console.log('therapyPlanId:', therapyPlanId);
console.log('practitionerId:', practitioner.PractitionerId);
console.log('plan:', plan);
console.log('plan.Status:', plan?.Status);
console.log('plan.therapyIsActive:', plan?.therapyIsActive);
console.log('plan.practitionerIsActive:', plan?.practitionerIsActive);
console.log('==========================================');
    if (!plan) {
      const owner = await repository.getTherapyPlanOwnerForUpdate(transaction, therapyPlanId);
      if (owner) throw new ForbiddenError('You do not have access to this session request');
      throw new NotFoundError('Session request not found');
    }
    assertPendingPlan(plan);
    if (!plan.therapyIsActive) throw new ConflictError('The selected therapy is no longer active.');
    if (!plan.practitionerIsActive) throw new ConflictError('The practitioner is no longer active.');

    const sessions = await repository.getTherapySessionsForUpdate(transaction, therapyPlanId);
    assertPendingSessions(sessions, plan.NumberOfSessions);
     console.log('========== SESSION DEBUG ==========');
console.log('sessions:', sessions);
console.log('expected sessions:', plan.NumberOfSessions);
console.log('actual sessions:', sessions.length);
console.log('===================================');

assertPendingSessions(sessions, plan.NumberOfSessions);

console.log('✅ assertPendingSessions PASSED');

    const availability = await repository.getPractitionerAvailabilityForUpdate(
      transaction,
      practitioner.PractitionerId
    );

    console.log('========== AVAILABILITY DEBUG ==========');
console.log('availability:', availability);
console.log('========================================');


    validateCurrentAvailability(plan, sessions, availability);

    console.log('VALIDATION INPUT:', {
  duration: plan.DurationMinutes,
  sessions: sessions.map((s) => ({
    date: s.SessionDate,
    start: s.StartTime,
    startMinutes: toMinutes(s.StartTime),
    end: s.EndTime,
    endMinutes: toMinutes(s.EndTime),
  })),
  availability: availability.map((a) => ({
    day: a.DayOfWeek,
    start: a.StartTime,
    startMinutes: toMinutes(a.StartTime),
    end: a.EndTime,
    endMinutes: toMinutes(a.EndTime),
  })),
});

    const sessionIds = sessions.map((session) => session.SessionId);
    for (const session of sessions) {
      const conflict = await repository.findConflictingSessions(
        transaction,
        session,
        sessionIds
      );
      if (conflict) throw new ConflictError('One or more sessions are no longer available.');
    }

    const planUpdated = await repository.updateTherapyPlanToConfirmed(transaction, therapyPlanId);
    const sessionsConfirmed = await repository.updateSessionsToConfirmed(transaction, therapyPlanId);
    if (planUpdated !== 1 || sessionsConfirmed !== sessions.length) {
      throw new ConflictError('The session request changed while it was being accepted.');
    }

    await transaction.commit();
    const notificationResult = await notificationService.sendBookingAcceptedNotifications(therapyPlanId);
    return {
      therapyPlanId: Number(therapyPlanId),
      status: 'CONFIRMED',
      sessionsConfirmed,
      notificationStatus: notificationResult.status,
    };
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (rollbackError) {
      // Preserve the original workflow error.
    }
    throw error;
  }
};

const rejectRequest = async (therapyPlanId, rejectionReason, authenticatedUser) => {
  if (typeof rejectionReason !== 'string' || !rejectionReason.trim() || rejectionReason.trim().length > 500) {
    throw new BadRequestError('Rejection reason must be between 1 and 500 characters');
  }
  const practitioner = await resolvePractitioner(authenticatedUser);
  const transaction = await repository.getTransaction();
  try {
    const plan = await repository.getTherapyPlanForUpdate(
      transaction,
      practitioner.PractitionerId,
      therapyPlanId
    );
    if (!plan) {
      const owner = await repository.getTherapyPlanOwnerForUpdate(transaction, therapyPlanId);
      if (owner) throw new ForbiddenError('You do not have access to this session request');
      throw new NotFoundError('Session request not found');
    }
    assertPendingPlan(plan);
    const sessions = await repository.getTherapySessionsForUpdate(transaction, therapyPlanId);
    assertPendingSessions(sessions, plan.NumberOfSessions);

    const planUpdated = await repository.updateTherapyPlanToRejected(
      transaction,
      therapyPlanId,
      rejectionReason.trim()
    );
    const sessionsRejected = await repository.updateSessionsToRejected(transaction, therapyPlanId);
    if (planUpdated !== 1 || sessionsRejected !== sessions.length) {
      throw new ConflictError('The session request changed while it was being rejected.');
    }

    await transaction.commit();
    const notificationResult = await notificationService.sendBookingRejectedNotifications(therapyPlanId);
    return {
      therapyPlanId: Number(therapyPlanId),
      status: 'REJECTED',
      notificationStatus: notificationResult.status,
    };
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (rollbackError) {
      // Preserve the original workflow error.
    }
    throw error;
  }
};

module.exports = {
  listPendingRequests,
  getRequestDetails,
  acceptRequest,
  rejectRequest,
  __testables: {
    assertPendingPlan,
    assertPendingSessions,
    validateCurrentAvailability,
  },
};