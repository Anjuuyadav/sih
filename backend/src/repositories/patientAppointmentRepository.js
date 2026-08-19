const { poolPromise, sql } = require('../config/db');

const ensurePool = async () => {
  const pool = await poolPromise;
  if (!pool) throw new Error('Database connection is unavailable');
  return pool;
};

const getPatientByUserId = async (userId) => {
  const pool = await ensurePool();
  const result = await pool.request()
    .input('userId', sql.Int, userId)
    .query(`SELECT PatientId, UserId
      FROM dbo.Patients
      WHERE UserId = @userId`);
  return result.recordset[0] || null;
};

const getAppointmentsByPatientId = async (patientId) => {
  const pool = await ensurePool();
  const result = await pool.request()
    .input('patientId', sql.Int, patientId)
    .query(`SELECT
        p.TherapyPlanId,
        p.PatientId,
        p.NumberOfSessions,
        p.PreferredStartDate,
        p.PreferredTime,
        p.Status AS PlanStatus,
        p.DurationMinutes,
        p.CostPerSession,
        p.TotalCost,
        p.RejectionReason,
        p.CreatedAt AS PlanCreatedAt,
        t.TherapyId,
        t.TherapyName,
        pr.PractitionerId,
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
      INNER JOIN dbo.Therapies t ON t.TherapyId = p.TherapyId
      INNER JOIN dbo.Practitioners pr ON pr.PractitionerId = p.PractitionerId
      LEFT JOIN dbo.TherapySessions s ON s.TherapyPlanId = p.TherapyPlanId
      WHERE p.PatientId = @patientId
      ORDER BY p.CreatedAt DESC, s.SessionDate ASC, s.StartTime ASC, s.SessionNumber ASC`);
  return result.recordset;
};

module.exports = {
  getPatientByUserId,
  getAppointmentsByPatientId,
};