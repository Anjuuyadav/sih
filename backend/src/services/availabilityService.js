const availabilityRepository = require('../repositories/availabilityRepository');
const { BadRequestError, NotFoundError } = require('../utils/errors');

const SCHEDULING_INTERVAL_MINUTES = 15;
const MAX_SEARCH_DAYS = 3650;
const BLOCKING_STATUSES = new Set(['PENDING', 'CONFIRMED']);

const toMinutes = (value) => {
  const match = String(value || '').match(/^(\d{2}):(\d{2})(?::\d{2})?/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

const formatTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
};

const parseDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return null;
  const [year, month, day] = String(value).split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) return null;
  return date;
};

const formatDate = (date) => date.toISOString().slice(0, 10);

const addDays = (date, days) => {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
};

const getDayOfWeek = (date) => {
  const day = date.getUTCDay();
  return day === 0 ? 7 : day;
};

const normalizeTime = (value) => String(value || '').slice(0, 5);

const toSession = (session) => ({
  startTime: toMinutes(session.StartTime),
  endTime: toMinutes(session.EndTime),
  status: String(session.Status || '').toUpperCase(),
});

const conflictsWithExistingSession = (candidateStart, candidateEnd, sessions) => sessions.some((session) => {
  if (!BLOCKING_STATUSES.has(session.status)) return false;
  return session.startTime < candidateEnd && session.endTime > candidateStart;
});

const buildCandidateTimes = (windowStart, windowEnd, durationMinutes, preferredMinutes) => {
  const latestStart = windowEnd - durationMinutes;
  if (latestStart < windowStart) return [];

  const candidates = new Set();
  for (let start = windowStart; start <= latestStart; start += SCHEDULING_INTERVAL_MINUTES) {
    candidates.add(start);
  }
  if (preferredMinutes >= windowStart && preferredMinutes <= latestStart) {
    candidates.add(preferredMinutes);
  }

  return [...candidates].sort((first, second) => {
    const firstDistance = Math.abs(first - preferredMinutes);
    const secondDistance = Math.abs(second - preferredMinutes);
    if (firstDistance !== secondDistance) return firstDistance - secondDistance;
    return second - first;
  });
};

const getBestTimeForDate = (date, windows, sessions, durationMinutes, preferredMinutes) => {
  const dateSessions = sessions
    .filter((session) => session.date === date)
    .map(toSession);

  const candidates = [];
  windows.forEach((window) => {
    const windowStart = toMinutes(window.StartTime);
    const windowEnd = toMinutes(window.EndTime);
    if (windowStart === null || windowEnd === null) return;

    buildCandidateTimes(windowStart, windowEnd, durationMinutes, preferredMinutes)
      .forEach((start) => {
        const end = start + durationMinutes;
        if (!conflictsWithExistingSession(start, end, dateSessions)) {
          candidates.push({ start, end });
        }
      });
  });

  candidates.sort((first, second) => {
    const firstDistance = Math.abs(first.start - preferredMinutes);
    const secondDistance = Math.abs(second.start - preferredMinutes);
    if (firstDistance !== secondDistance) return firstDistance - secondDistance;
    return second.start - first.start;
  });

  return candidates[0] || null;
};

const validateInput = ({ therapyId, numberOfSessions, preferredStartDate, preferredDays, preferredTime }) => {
  const parsedTherapyId = Number(therapyId);
  const parsedSessions = Number(numberOfSessions);
  const startDate = parseDate(preferredStartDate);
  const preferredMinutes = toMinutes(preferredTime);
  const days = Array.isArray(preferredDays) ? preferredDays.map(Number) : [];

  if (!Number.isInteger(parsedTherapyId) || parsedTherapyId < 1) {
    throw new BadRequestError('Therapy id must be a positive integer');
  }
  if (!Number.isInteger(parsedSessions) || parsedSessions < 1) {
    throw new BadRequestError('Number of sessions must be greater than zero');
  }
  if (!startDate) {
    throw new BadRequestError('Preferred start date must use a valid YYYY-MM-DD date');
  }

  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  if (startDate < todayUtc) {
    throw new BadRequestError('Preferred start date cannot be in the past');
  }
  if (!days.length || days.some((day) => !Number.isInteger(day) || day < 1 || day > 7)) {
    throw new BadRequestError('Preferred days must contain values from 1 to 7');
  }
  if (new Set(days).size !== days.length) {
    throw new BadRequestError('Preferred days cannot contain duplicates');
  }
  if (preferredMinutes === null || preferredMinutes >= 1440) {
    throw new BadRequestError('Preferred time must use a valid HH:mm time');
  }

  return {
    therapyId: parsedTherapyId,
    numberOfSessions: parsedSessions,
    startDate,
    preferredDays: new Set(days),
    preferredMinutes,
  };
};

const groupAvailability = (availability) => availability.reduce((result, item) => {
  const key = Number(item.PractitionerId);
  if (!result.has(key)) result.set(key, new Map());
  const byDay = result.get(key);
  const day = Number(item.DayOfWeek);
  if (!byDay.has(day)) byDay.set(day, []);
  byDay.get(day).push(item);
  return result;
}, new Map());

const groupSessions = (sessions) => sessions.reduce((result, item) => {
  const practitionerId = Number(item.PractitionerId);
  if (!result.has(practitionerId)) result.set(practitionerId, []);
  result.get(practitionerId).push({
    ...item,
    date: formatDate(new Date(item.SessionDate)),
  });
  return result;
}, new Map());

const buildSchedule = (practitioner, availabilityByPractitioner, sessionsByPractitioner, input, durationMinutes) => {
  const practitionerAvailability = availabilityByPractitioner.get(practitioner.PractitionerId) || new Map();
  const practitionerSessions = sessionsByPractitioner.get(practitioner.PractitionerId) || [];
  const schedule = [];
  let date = new Date(input.startDate.getTime());
  let daysChecked = 0;
  let totalDeviation = 0;

  while (schedule.length < input.numberOfSessions && daysChecked < MAX_SEARCH_DAYS) {
    const dateKey = formatDate(date);
    if (input.preferredDays.has(getDayOfWeek(date))) {
      const windows = practitionerAvailability.get(getDayOfWeek(date)) || [];
      const bestTime = getBestTimeForDate(
        dateKey,
        windows,
        practitionerSessions,
        durationMinutes,
        input.preferredMinutes
      );
      if (bestTime) {
        totalDeviation += Math.abs(bestTime.start - input.preferredMinutes);
        schedule.push({
          sessionNumber: schedule.length + 1,
          date: dateKey,
          startTime: formatTime(bestTime.start),
          endTime: formatTime(bestTime.end),
        });
      }
    }
    date = addDays(date, 1);
    daysChecked += 1;
  }

  if (schedule.length !== input.numberOfSessions) return null;
  return { schedule, totalDeviation };
};

const searchAvailability = async (data) => {
  const input = validateInput(data);
  const therapy = await availabilityRepository.getTherapy(input.therapyId);
  if (!therapy) throw new NotFoundError('Therapy not found');
  if (!therapy.IsActive) throw new BadRequestError('Therapy is inactive');
  if (!Number.isInteger(therapy.Duration) || therapy.Duration < 1) {
    throw new BadRequestError('Therapy duration is invalid');
  }

  const practitioners = await availabilityRepository.getActivePractitioners();
  const practitionerIds = practitioners.map((practitioner) => practitioner.PractitionerId);
  const availability = await availabilityRepository.getAvailability(practitionerIds);
  const availabilityByPractitioner = groupAvailability(availability);
  const endDate = addDays(input.startDate, MAX_SEARCH_DAYS - 1);
  const blockingSessions = await availabilityRepository.getBlockingSessions(
    practitionerIds,
    formatDate(input.startDate),
    formatDate(endDate)
  );
  const sessionsByPractitioner = groupSessions(blockingSessions);

  const matches = practitioners
    .map((practitioner) => {
      const result = buildSchedule(
        practitioner,
        availabilityByPractitioner,
        sessionsByPractitioner,
        input,
        therapy.Duration
      );
      if (!result) return null;
      return {
        practitionerId: practitioner.PractitionerId,
        firstName: practitioner.FirstName,
        lastName: practitioner.LastName,
        specialization: practitioner.Specialization,
        schedule: result.schedule,
        allSessionsAvailable: true,
        totalDeviationMinutes: result.totalDeviation,
      };
    })
    .filter(Boolean)
    .sort((first, second) => (
      first.totalDeviationMinutes - second.totalDeviationMinutes
      || first.schedule[0].date.localeCompare(second.schedule[0].date)
      || first.practitionerId - second.practitionerId
    ))
    .map(({ totalDeviationMinutes, ...match }) => match);

  return { therapy, practitioners: matches };
};

module.exports = {
  searchAvailability,
  __testables: {
    buildCandidateTimes,
    conflictsWithExistingSession,
    buildSchedule,
    groupAvailability,
    groupSessions,
    parseDate,
    formatTime,
    formatDate,
    toMinutes,
  },
};