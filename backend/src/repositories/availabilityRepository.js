const { poolPromise, sql } = require('../config/db');

const ensurePool = async () => {
  const pool = await poolPromise;
  if (!pool) {
    throw new Error('Database connection is unavailable');
  }
  return pool;
};

const getActiveTherapy = async (therapyId) => {
  const pool = await ensurePool();
  const result = await pool.request()
    .input('therapyId', sql.Int, therapyId)
    .query(`SELECT TherapyId, TherapyName, Cost, Duration, Description
      FROM dbo.Therapies
      WHERE TherapyId = @therapyId AND IsActive = 1`);
  return result.recordset[0];
};

const getTherapy = async (therapyId) => {
  const pool = await ensurePool();
  const result = await pool.request()
    .input('therapyId', sql.Int, therapyId)
    .query(`SELECT TherapyId, TherapyName, Cost, Duration, Description, IsActive
      FROM dbo.Therapies
      WHERE TherapyId = @therapyId`);
  return result.recordset[0];
};

const getActivePractitioners = async () => {
  const pool = await ensurePool();
  const result = await pool.request().query(`SELECT PractitionerId, FirstName, LastName, Specialization
    FROM dbo.Practitioners
    WHERE IsActive = 1
    ORDER BY PractitionerId`);
  return result.recordset;
};

const getAvailability = async (practitionerIds) => {
  if (!practitionerIds.length) return [];
  const pool = await ensurePool();
  const request = pool.request();
  const parameters = practitionerIds.map((id, index) => {
    const name = `practitionerId${index}`;
    request.input(name, sql.Int, id);
    return `@${name}`;
  });
  const result = await request.query(`SELECT PractitionerId, DayOfWeek, StartTime, EndTime, IsAvailable
    FROM dbo.PractitionerAvailability
    WHERE PractitionerId IN (${parameters.join(', ')})
      AND IsAvailable = 1
    ORDER BY PractitionerId, DayOfWeek, StartTime`);
  return result.recordset;
};

const getBlockingSessions = async (practitionerIds, startDate, endDate) => {
  if (!practitionerIds.length) return [];
  const pool = await ensurePool();
  const request = pool.request()
    .input('startDate', sql.Date, startDate)
    .input('endDate', sql.Date, endDate);
  const parameters = practitionerIds.map((id, index) => {
    const name = `practitionerId${index}`;
    request.input(name, sql.Int, id);
    return `@${name}`;
  });
  const result = await request.query(`SELECT SessionId, TherapyPlanId, PractitionerId, SessionDate,
      StartTime, EndTime, Status
    FROM dbo.TherapySessions
    WHERE PractitionerId IN (${parameters.join(', ')})
      AND SessionDate BETWEEN @startDate AND @endDate
      AND Status IN ('PENDING', 'CONFIRMED')
    ORDER BY PractitionerId, SessionDate, StartTime`);
  return result.recordset;
};

module.exports = {
  getTherapy,
  getActiveTherapy,
  getActivePractitioners,
  getAvailability,
  getBlockingSessions,
};