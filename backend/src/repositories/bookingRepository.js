const { poolPromise, sql } = require('../config/db');

const ensurePool = async () => {
  const pool = await poolPromise;
  if (!pool) {
    throw new Error('Database connection is unavailable');
  }
  return pool;
};

const getTransaction = async () => {
  const pool = await ensurePool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  return transaction;
};

const getPatientByUserId = async (transaction, userId) => {
  const result = await transaction.request()
    .input('userId', sql.Int, userId)
    .query(`SELECT PatientId, UserId
      FROM dbo.Patients WITH (UPDLOCK, HOLDLOCK)
      WHERE UserId = @userId`);
  return result.recordset[0];
};

const getTherapy = async (transaction, therapyId) => {
  const result = await transaction.request()
    .input('therapyId', sql.Int, therapyId)
    .query(`SELECT TherapyId, TherapyName, Cost, Duration, Description, IsActive
      FROM dbo.Therapies WITH (UPDLOCK, HOLDLOCK)
      WHERE TherapyId = @therapyId`);
  return result.recordset[0];
};

const getPractitioner = async (transaction, practitionerId) => {
  const result = await transaction.request()
    .input('practitionerId', sql.Int, practitionerId)
    .query(`SELECT PractitionerId, FirstName, LastName, Specialization, IsActive
      FROM dbo.Practitioners WITH (UPDLOCK, HOLDLOCK)
      WHERE PractitionerId = @practitionerId`);
  return result.recordset[0];
};

const getAvailability = async (transaction, practitionerId) => {
  const result = await transaction.request()
    .input('practitionerId', sql.Int, practitionerId)
    .query(`SELECT PractitionerId, DayOfWeek, StartTime, EndTime, IsAvailable
      FROM dbo.PractitionerAvailability WITH (UPDLOCK, HOLDLOCK)
      WHERE PractitionerId = @practitionerId
        AND IsAvailable = 1
      ORDER BY DayOfWeek, StartTime`);
  return result.recordset;
};

const getBlockingSessions = async (transaction, practitionerId, startDate, endDate) => {
  const result = await transaction.request()
    .input('practitionerId', sql.Int, practitionerId)
    .input('startDate', sql.Date, startDate)
    .input('endDate', sql.Date, endDate)
    .query(`SELECT SessionId, TherapyPlanId, PractitionerId, SessionDate,
        StartTime, EndTime, Status
      FROM dbo.TherapySessions WITH (UPDLOCK, HOLDLOCK)
      WHERE PractitionerId = @practitionerId
        AND SessionDate BETWEEN @startDate AND @endDate
        AND Status IN ('PENDING', 'CONFIRMED')
      ORDER BY SessionDate, StartTime`);
  return result.recordset;
};

const getDuplicatePendingPlan = async (transaction, values) => {
  const result = await transaction.request()
    .input('patientId', sql.Int, values.patientId)
    .input('therapyId', sql.Int, values.therapyId)
    .input('practitionerId', sql.Int, values.practitionerId)
    .input('preferredStartDate', sql.Date, values.preferredStartDate)
    .input('preferredTime', sql.VarChar(8), values.preferredTime)
    .input('numberOfSessions', sql.Int, values.numberOfSessions)
    .query(`SELECT TOP (1) TherapyPlanId
      FROM dbo.TherapyPlans WITH (UPDLOCK, HOLDLOCK)
      WHERE PatientId = @patientId
        AND TherapyId = @therapyId
        AND PractitionerId = @practitionerId
        AND PreferredStartDate = @preferredStartDate
        AND PreferredTime = CONVERT(TIME, @preferredTime)
        AND NumberOfSessions = @numberOfSessions
        AND Status = 'PENDING'
        AND CreatedAt >= DATEADD(MINUTE, -5, GETUTCDATE())
      ORDER BY CreatedAt DESC`);
  return result.recordset[0];
};

const findConflict = async (transaction, session) => {
  const result = await transaction.request()
    .input('practitionerId', sql.Int, session.practitionerId)
    .input('sessionDate', sql.Date, session.sessionDate)
    .input('startTime', sql.VarChar(8), session.startTime)
    .input('endTime', sql.VarChar(8), session.endTime)
    .query(`SELECT TOP (1) SessionId
      FROM dbo.TherapySessions WITH (UPDLOCK, HOLDLOCK)
      WHERE PractitionerId = @practitionerId
        AND SessionDate = @sessionDate
        AND Status IN ('PENDING', 'CONFIRMED')
        AND StartTime < CONVERT(TIME, @endTime)
        AND EndTime > CONVERT(TIME, @startTime)`);
  return result.recordset[0];
};

const createTherapyPlan = async (transaction, plan) => {
  const result = await transaction.request()
    .input('patientId', sql.Int, plan.patientId)
    .input('therapyId', sql.Int, plan.therapyId)
    .input('practitionerId', sql.Int, plan.practitionerId)
    .input('numberOfSessions', sql.Int, plan.numberOfSessions)
    .input('preferredStartDate', sql.Date, plan.preferredStartDate)
    .input('preferredTime', sql.VarChar(8), plan.preferredTime)
    .input('status', sql.NVarChar(20), 'PENDING')
    .input('durationMinutes', sql.Int, plan.durationMinutes)
    .input('costPerSession', sql.Decimal(10, 2), plan.costPerSession)
    .input('totalCost', sql.Decimal(12, 2), plan.totalCost)
    .query(`INSERT INTO dbo.TherapyPlans
        (PatientId, TherapyId, PractitionerId, NumberOfSessions, PreferredStartDate,
         PreferredTime, Status, DurationMinutes, CostPerSession, TotalCost,
         RejectionReason, CreatedAt)
      OUTPUT INSERTED.TherapyPlanId
      VALUES (@patientId, @therapyId, @practitionerId, @numberOfSessions, @preferredStartDate,
        CONVERT(TIME, @preferredTime), @status, @durationMinutes, @costPerSession,
        @totalCost, NULL, GETUTCDATE())`);
  return result.recordset[0].TherapyPlanId;
};

const createPreferredDay = async (transaction, therapyPlanId, dayOfWeek) => {
  await transaction.request()
    .input('therapyPlanId', sql.Int, therapyPlanId)
    .input('dayOfWeek', sql.TinyInt, dayOfWeek)
    .query(`INSERT INTO dbo.TherapyPlanPreferredDays
        (TherapyPlanId, DayOfWeek, CreatedAt)
      VALUES (@therapyPlanId, @dayOfWeek, GETUTCDATE())`);
};

const createTherapySession = async (transaction, session) => {
  const result = await transaction.request()
    .input('therapyPlanId', sql.Int, session.therapyPlanId)
    .input('practitionerId', sql.Int, session.practitionerId)
    .input('sessionNumber', sql.Int, session.sessionNumber)
    .input('sessionDate', sql.Date, session.sessionDate)
    .input('startTime', sql.VarChar(8), session.startTime)
    .input('endTime', sql.VarChar(8), session.endTime)
    .input('status', sql.NVarChar(20), 'PENDING')
    .query(`INSERT INTO dbo.TherapySessions
        (TherapyPlanId, PractitionerId, SessionNumber, SessionDate,
         StartTime, EndTime, Status, CreatedAt)
      OUTPUT INSERTED.SessionId
      VALUES (@therapyPlanId, @practitionerId, @sessionNumber, @sessionDate,
        CONVERT(TIME, @startTime), CONVERT(TIME, @endTime), @status, GETUTCDATE())`);
  return result.recordset[0].SessionId;
};

module.exports = {
  getTransaction,
  getPatientByUserId,
  getTherapy,
  getPractitioner,
  getAvailability,
  getBlockingSessions,
  getDuplicatePendingPlan,
  findConflict,
  createTherapyPlan,
  createPreferredDay,
  createTherapySession,
};