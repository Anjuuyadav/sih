const { poolPromise, sql } = require('../config/db');

const ensurePool = async () => {
  const pool = await poolPromise;
  if (!pool) throw new Error('Database connection is unavailable');
  return pool;
};

const getTransaction = async () => {
  const pool = await ensurePool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  return transaction;
};

const getPractitionerByUserId = async (userId) => {
  const pool = await ensurePool();
  const result = await pool.request()
    .input('userId', sql.Int, userId)
    .query(`SELECT PractitionerId, UserId, IsActive
      FROM dbo.Practitioners
      WHERE UserId = @userId`);
  return result.recordset[0] || null;
};

const planSessionSelect = `
  SELECT
    p.TherapyPlanId,
    p.PatientId,
    p.PractitionerId,
    p.TherapyId,
    p.NumberOfSessions,
    p.PreferredStartDate,
    p.PreferredTime,
    p.Status AS PlanStatus,
    p.CreatedAt AS PlanCreatedAt,
    u.Name AS PatientName,
    u.Email AS PatientEmail,
    u.ContactNumber AS PatientContactNumber,
    t.TherapyName,
    pr.FirstName AS PractitionerFirstName,
    pr.LastName AS PractitionerLastName,
    pr.Specialization,
    s.SessionId,
    s.SessionNumber,
    s.SessionDate,
    s.StartTime,
    s.EndTime,
    s.Status AS SessionStatus
  FROM dbo.TherapyPlans p
  INNER JOIN dbo.Patients pt ON pt.PatientId = p.PatientId
  INNER JOIN dbo.Users u ON u.UserId = pt.UserId
  INNER JOIN dbo.Therapies t ON t.TherapyId = p.TherapyId
  INNER JOIN dbo.Practitioners pr ON pr.PractitionerId = p.PractitionerId
  LEFT JOIN dbo.TherapySessions s ON s.TherapyPlanId = p.TherapyPlanId`;

const getTrackedPlansByPractitionerId = async (practitionerId) => {
  const pool = await ensurePool();
  const result = await pool.request()
    .input('practitionerId', sql.Int, practitionerId)
    .query(`${planSessionSelect}
      WHERE p.PractitionerId = @practitionerId
        AND p.Status IN ('CONFIRMED', 'COMPLETED')
      ORDER BY p.CreatedAt DESC, s.SessionDate ASC, s.StartTime ASC, s.SessionNumber ASC`);
  return result.recordset;
};

const getTrackedPlansByPractitionerAndPatient = async (practitionerId, patientId) => {
  const pool = await ensurePool();
  const result = await pool.request()
    .input('practitionerId', sql.Int, practitionerId)
    .input('patientId', sql.Int, patientId)
    .query(`${planSessionSelect}
      WHERE p.PractitionerId = @practitionerId
        AND p.PatientId = @patientId
        AND p.Status IN ('CONFIRMED', 'COMPLETED')
      ORDER BY p.CreatedAt DESC, s.SessionDate ASC, s.StartTime ASC, s.SessionNumber ASC`);
  return result.recordset;
};

const patientHasTrackedPlans = async (patientId) => {
  const pool = await ensurePool();
  const result = await pool.request()
    .input('patientId', sql.Int, patientId)
    .query(`SELECT TOP (1) TherapyPlanId
      FROM dbo.TherapyPlans
      WHERE PatientId = @patientId
        AND Status IN ('CONFIRMED', 'COMPLETED')`);
  return Boolean(result.recordset[0]);
};

const getSessionForCompletionById = async (transaction, sessionId) => {
  const result = await transaction.request()
    .input('sessionId', sql.Int, sessionId)
    .query(`SELECT
        s.SessionId,
        s.TherapyPlanId,
        s.PractitionerId,
        s.Status AS SessionStatus,
        p.PatientId,
        p.Status AS PlanStatus
      FROM dbo.TherapySessions s WITH (UPDLOCK, HOLDLOCK)
      INNER JOIN dbo.TherapyPlans p WITH (UPDLOCK, HOLDLOCK) ON p.TherapyPlanId = s.TherapyPlanId
      WHERE s.SessionId = @sessionId`);
  return result.recordset[0] || null;
};

const updateSessionToCompleted = async (transaction, sessionId) => {
  const result = await transaction.request()
    .input('sessionId', sql.Int, sessionId)
    .query(`UPDATE dbo.TherapySessions
      SET Status = 'COMPLETED', UpdatedAt = GETUTCDATE()
      WHERE SessionId = @sessionId
        AND Status = 'CONFIRMED'`);
  return result.rowsAffected[0];
};

const getPlanSessionCounts = async (transaction, therapyPlanId) => {
  const result = await transaction.request()
    .input('therapyPlanId', sql.Int, therapyPlanId)
    .query(`SELECT
        COUNT(*) AS TotalSessions,
        SUM(CASE WHEN Status = 'COMPLETED' THEN 1 ELSE 0 END) AS CompletedSessions
      FROM dbo.TherapySessions
      WHERE TherapyPlanId = @therapyPlanId`);
  return result.recordset[0] || { TotalSessions: 0, CompletedSessions: 0 };
};

const updatePlanToCompleted = async (transaction, therapyPlanId) => {
  const result = await transaction.request()
    .input('therapyPlanId', sql.Int, therapyPlanId)
    .query(`UPDATE dbo.TherapyPlans
      SET Status = 'COMPLETED', UpdatedAt = GETUTCDATE()
      WHERE TherapyPlanId = @therapyPlanId
        AND Status = 'CONFIRMED'`);
  return result.rowsAffected[0];
};

const getSessionById = async (sessionId) => {
  const pool = await ensurePool();
  const result = await pool.request()
    .input('sessionId', sql.Int, sessionId)
    .query(`SELECT SessionId, TherapyPlanId, SessionNumber, SessionDate, StartTime, EndTime, Status
      FROM dbo.TherapySessions
      WHERE SessionId = @sessionId`);
  return result.recordset[0] || null;
};

module.exports = {
  getTransaction,
  getPractitionerByUserId,
  getTrackedPlansByPractitionerId,
  getTrackedPlansByPractitionerAndPatient,
  patientHasTrackedPlans,
  getSessionForCompletionById,
  updateSessionToCompleted,
  getPlanSessionCounts,
  updatePlanToCompleted,
  getSessionById,
};
