const bookingRepository = require('../repositories/bookingRepository');
const { __testables } = require('./availabilityService');
const { BadRequestError, ConflictError, NotFoundError } = require('../utils/errors');

const {
  formatDate,
  groupAvailability,
  groupSessions,
  buildSchedule,
  parseDate,
  toMinutes,
} = __testables;

const MAX_SEARCH_DAYS = 3650;

const addDays = (date, days) => {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
};

const getDayOfWeek = (date) => {
  const day = date.getUTCDay();
  return day === 0 ? 7 : day;
};

const normalizeTime = (value) => {
  const minutes = toMinutes(value);
  return minutes === null ? null : `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
};

const toDateValue = (value) => {
  if (value instanceof Date) return formatDate(value);
  return String(value || '').slice(0, 10);
};

const validateRequest = (data) => {
  const therapyId = Number(data.therapyId);
  const numberOfSessions = Number(data.numberOfSessions);
  const preferredStartDate = parseDate(data.preferredStartDate);
  const preferredTime = normalizeTime(data.preferredTime);
  const preferredDays = Array.isArray(data.preferredDays) ? data.preferredDays.map(Number) : [];
  const practitionerId = Number(data.practitionerId);
  const schedule = Array.isArray(data.schedule) ? data.schedule : [];

  if (!Number.isInteger(therapyId) || therapyId < 1) throw new BadRequestError('Therapy id must be a positive integer');
  if (!Number.isInteger(numberOfSessions) || numberOfSessions < 1) throw new BadRequestError('Number of sessions must be greater than zero');
  if (!preferredStartDate) throw new BadRequestError('Preferred start date must use a valid YYYY-MM-DD date');
  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  if (preferredStartDate < todayUtc) throw new BadRequestError('Preferred start date cannot be in the past');
  if (!preferredDays.length || preferredDays.some((day) => !Number.isInteger(day) || day < 1 || day > 7)) {
    throw new BadRequestError('Preferred days must contain values from 1 to 7');
  }
  if (new Set(preferredDays).size !== preferredDays.length) throw new BadRequestError('Preferred days cannot contain duplicates');
  if (preferredTime === null) throw new BadRequestError('Preferred time must use a valid HH:mm time');
  if (!Number.isInteger(practitionerId) || practitionerId < 1) throw new BadRequestError('Practitioner id must be a positive integer');
  if (schedule.length !== numberOfSessions) throw new BadRequestError('Schedule must contain exactly the requested number of sessions');

  const normalizedSchedule = schedule.map((item, index) => {
    const sessionNumber = Number(item?.sessionNumber);
    const sessionDate = parseDate(item?.sessionDate);
    const startTime = normalizeTime(item?.startTime);
    const endTime = normalizeTime(item?.endTime);
    if (!Number.isInteger(sessionNumber) || sessionNumber !== index + 1) {
      throw new BadRequestError('Session numbers must be sequential starting at 1');
    }
    if (!sessionDate || !startTime || !endTime) throw new BadRequestError('Each schedule entry must contain valid date and time values');
    if (sessionDate < preferredStartDate) throw new BadRequestError('Session dates cannot be before the preferred start date');
    if (!preferredDays.includes(getDayOfWeek(sessionDate))) throw new BadRequestError('Every session must fall on a preferred day');
    const startMinutes = toMinutes(startTime);
    const endMinutes = toMinutes(endTime);
    if (startMinutes >= endMinutes) throw new BadRequestError('Session start time must be before end time');
    return {
      sessionNumber,
      sessionDate: formatDate(sessionDate),
      startTime,
      endTime,
      startMinutes,
      endMinutes,
    };
  });

  const uniqueSessionKeys = new Set();
  normalizedSchedule.forEach((session, index) => {
    const key = `${session.sessionDate}|${session.startTime}|${session.endTime}`;
    if (uniqueSessionKeys.has(key)) throw new BadRequestError('Schedule cannot contain duplicate sessions');
    uniqueSessionKeys.add(key);
    if (index > 0) {
      const previous = normalizedSchedule[index - 1];
      const previousKey = `${previous.sessionDate}|${previous.startTime}`;
      const currentKey = `${session.sessionDate}|${session.startTime}`;
      if (currentKey <= previousKey) throw new BadRequestError('Sessions must be ordered chronologically');
    }
  });

  return {
    therapyId,
    numberOfSessions,
    preferredStartDate,
    preferredStartDateValue: formatDate(preferredStartDate),
    preferredDays,
    preferredTime,
    practitionerId,
    schedule: normalizedSchedule,
  };
};

const validateWorkingWindows = (schedule, availability, durationMinutes) => {
  const windowsByDay = availability.reduce((result, item) => {
    const day = Number(item.DayOfWeek);
    if (!result.has(day)) result.set(day, []);
    result.get(day).push(item);
    return result;
  }, new Map());

  schedule.forEach((session) => {
    const windows = windowsByDay.get(getDayOfWeek(parseDate(session.sessionDate))) || [];
    const fits = windows.some((window) => {
      const start = toMinutes(window.StartTime);
      const end = toMinutes(window.EndTime);
      return start !== null
        && end !== null
        && session.startMinutes >= start
        && session.endMinutes <= end
        && session.endMinutes - session.startMinutes === durationMinutes;
    });
    if (!fits) throw new ConflictError('The selected practitioner is no longer available for the requested schedule. Please search for availability again.');
  });
};

const sameSchedule = (proposed, fresh) => proposed.length === fresh.length
  && proposed.every((session, index) => {
    const current = fresh[index];
    return session.sessionNumber === current.sessionNumber
      && session.sessionDate === current.date
      && session.startTime === current.startTime
      && session.endTime === current.endTime;
  });

const createBooking = async (data, authenticatedUser) => {
  const input = validateRequest(data);
  const userId = Number(authenticatedUser?.UserId ?? authenticatedUser?.userId ?? authenticatedUser?.id);
  if (!Number.isInteger(userId) || userId < 1) throw new NotFoundError('Authenticated user could not be resolved');

  const transaction = await bookingRepository.getTransaction();
  try {
    const patient = await bookingRepository.getPatientByUserId(transaction, userId);
    if (!patient) throw new NotFoundError('Patient profile not found for the authenticated user');

    const therapy = await bookingRepository.getTherapy(transaction, input.therapyId);
    if (!therapy) throw new NotFoundError('Therapy not found');
    if (!therapy.IsActive) throw new BadRequestError('Therapy is inactive');
    if (!Number.isInteger(therapy.Duration) || therapy.Duration < 1) throw new BadRequestError('Therapy duration is invalid');

    const practitioner = await bookingRepository.getPractitioner(transaction, input.practitionerId);
    if (!practitioner) throw new NotFoundError('Practitioner not found');
    if (!practitioner.IsActive) throw new BadRequestError('Practitioner is inactive');

    const duplicate = await bookingRepository.getDuplicatePendingPlan(transaction, {
      patientId: patient.PatientId,
      therapyId: input.therapyId,
      practitionerId: input.practitionerId,
      preferredStartDate: input.preferredStartDateValue,
      preferredTime: input.preferredTime,
      numberOfSessions: input.numberOfSessions,
    });
    if (duplicate) throw new ConflictError('This booking request was already submitted recently');

    const availability = await bookingRepository.getAvailability(transaction, input.practitionerId);
    validateWorkingWindows(input.schedule, availability, therapy.Duration);

    const searchEndDate = addDays(input.preferredStartDate, MAX_SEARCH_DAYS - 1);
    const blockingSessions = await bookingRepository.getBlockingSessions(
      transaction,
      input.practitionerId,
      input.preferredStartDateValue,
      formatDate(searchEndDate)
    );
    const availabilityByPractitioner = groupAvailability(availability);
    const sessionsByPractitioner = groupSessions(blockingSessions);
    const freshResult = buildSchedule(
      { PractitionerId: input.practitionerId },
      availabilityByPractitioner,
      sessionsByPractitioner,
      {
        startDate: input.preferredStartDate,
        preferredDays: new Set(input.preferredDays),
        preferredMinutes: toMinutes(input.preferredTime),
        numberOfSessions: input.numberOfSessions,
      },
      therapy.Duration
    );
    if (!freshResult || !sameSchedule(input.schedule, freshResult.schedule)) {
      throw new ConflictError('The selected practitioner is no longer available for the requested schedule. Please search for availability again.');
    }

    for (const session of input.schedule) {
      const conflict = await bookingRepository.findConflict(transaction, {
        practitionerId: input.practitionerId,
        sessionDate: session.sessionDate,
        startTime: session.startTime,
        endTime: session.endTime,
      });
      if (conflict) {
        throw new ConflictError('One or more selected sessions were just booked. Please search for availability again.');
      }
    }

    const therapyPlanId = await bookingRepository.createTherapyPlan(transaction, {
      patientId: patient.PatientId,
      therapyId: therapy.TherapyId,
      practitionerId: practitioner.PractitionerId,
      numberOfSessions: input.numberOfSessions,
      preferredStartDate: input.preferredStartDateValue,
      preferredTime: input.preferredTime,
      durationMinutes: therapy.Duration,
      costPerSession: therapy.Cost,
      totalCost: Number(therapy.Cost) * input.numberOfSessions,
    });

    for (const day of input.preferredDays) {
      await bookingRepository.createPreferredDay(transaction, therapyPlanId, day);
    }

    for (const session of input.schedule) {
      await bookingRepository.createTherapySession(transaction, {
        therapyPlanId,
        practitionerId: practitioner.PractitionerId,
        sessionNumber: session.sessionNumber,
        sessionDate: session.sessionDate,
        startTime: session.startTime,
        endTime: session.endTime,
      });
    }

    await transaction.commit();
    return {
      therapyPlanId,
      status: 'PENDING',
      therapy: {
        therapyId: therapy.TherapyId,
        therapyName: therapy.TherapyName,
      },
      practitioner: {
        practitionerId: practitioner.PractitionerId,
        firstName: practitioner.FirstName,
        lastName: practitioner.LastName,
      },
      numberOfSessions: input.numberOfSessions,
      durationMinutes: therapy.Duration,
      costPerSession: therapy.Cost,
      totalCost: Number(therapy.Cost) * input.numberOfSessions,
      sessions: input.schedule.map((session) => ({
        sessionNumber: session.sessionNumber,
        sessionDate: session.sessionDate,
        startTime: session.startTime,
        endTime: session.endTime,
        status: 'PENDING',
      })),
    };
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (rollbackError) {
      // Preserve the original booking error.
    }
    throw error;
  }
};

module.exports = {
  createBooking,
  __testables: {
    validateRequest,
    sameSchedule,
  },
};