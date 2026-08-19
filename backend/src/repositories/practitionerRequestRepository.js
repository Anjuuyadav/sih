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

const getPractitionerByUserId = async (userId) => {
  const pool = await ensurePool();
  const result = await pool.request()
    .input('userId', sql.Int, userId)
    .query(`SELECT PractitionerId, UserId, FirstName, LastName, Specialization, IsActive
      FROM dbo.Practitioners
      WHERE UserId = @userId`);
  return result.recordset[0];
};

const planSelect = `
  SELECT p.TherapyPlanId, p.PatientId, p.TherapyId, p.PractitionerId,
    p.NumberOfSessions, p.PreferredStartDate, p.PreferredTime, p.Status,
    p.DurationMinutes, p.CostPerSession, p.TotalCost, p.RejectionReason,
    p.CreatedAt, p.UpdatedAt,
    u.Name AS PatientName, u.Email AS PatientEmail, u.ContactNumber AS PatientContactNumber,
    t.TherapyName, t.Description AS TherapyDescription,
    pr.FirstName AS PractitionerFirstName, pr.LastName AS PractitionerLastName,
    pr.Specialization AS PractitionerSpecialization,
    t.IsActive AS TherapyIsActive, pr.IsActive AS PractitionerIsActive
  FROM dbo.TherapyPlans p
  INNER JOIN dbo.Patients pt ON pt.PatientId = p.PatientId
  INNER JOIN dbo.Users u ON u.UserId = pt.UserId
  INNER JOIN dbo.Therapies t ON t.TherapyId = p.TherapyId
  INNER JOIN dbo.Practitioners pr ON pr.PractitionerId = p.PractitionerId`;

const mapPlan = (row) => ({
  therapyPlanId: row.TherapyPlanId,
  patientId: row.PatientId,
  patient: {
    patientId: row.PatientId,
    name: row.PatientName,
    email: row.PatientEmail,
    contactNumber: row.PatientContactNumber,
  },
  therapy: {
    therapyId: row.TherapyId,
    therapyName: row.TherapyName,
    description: row.TherapyDescription,
    durationMinutes: row.DurationMinutes,
    costPerSession: row.CostPerSession,
  },
  practitioner: {
    practitionerId: row.PractitionerId,
    firstName: row.PractitionerFirstName,
    lastName: row.PractitionerLastName,
    specialization: row.PractitionerSpecialization,
  },
  numberOfSessions: row.NumberOfSessions,
  preferredStartDate: row.PreferredStartDate,
  preferredTime: row.PreferredTime,
  status: row.Status,
  rejectionReason: row.RejectionReason,
  therapyIsActive: Boolean(row.TherapyIsActive),
  practitionerIsActive: Boolean(row.PractitionerIsActive),
  createdAt: row.CreatedAt,
  updatedAt: row.UpdatedAt,
});

const getSessions = async (db, therapyPlanId) => {
  const result = await db.request()
    .input('therapyPlanId', sql.Int, therapyPlanId)
    .query(`SELECT SessionId, TherapyPlanId, PractitionerId, SessionNumber,
        SessionDate, StartTime, EndTime, Status, CreatedAt, UpdatedAt
      FROM dbo.TherapySessions
      WHERE TherapyPlanId = @therapyPlanId
      ORDER BY SessionNumber`);
  return result.recordset;
};

const getPreferredDays = async (db, therapyPlanId) => {
  const result = await db.request()
    .input('therapyPlanId', sql.Int, therapyPlanId)
    .query(`SELECT TherapyPlanPreferredDayId, TherapyPlanId, DayOfWeek
      FROM dbo.TherapyPlanPreferredDays
      WHERE TherapyPlanId = @therapyPlanId
      ORDER BY DayOfWeek`);
  return result.recordset;
};

const getPendingRequestsByPractitionerId = async (practitionerId) => {
  const pool = await ensurePool();
  const result = await pool.request()
    .input('practitionerId', sql.Int, practitionerId)
    .query(`${planSelect}
      WHERE p.PractitionerId = @practitionerId
        AND p.Status = 'PENDING'
      ORDER BY p.CreatedAt DESC`);
  return Promise.all(result.recordset.map(async (row) => ({
    ...mapPlan(row),
    preferredDays: await getPreferredDays(pool, row.TherapyPlanId),
    sessions: await getSessions(pool, row.TherapyPlanId),
  })));
};

const getRequestDetailsByPractitionerId = async (practitionerId, therapyPlanId) => {
  const pool = await ensurePool();
  const result = await pool.request()
    .input('practitionerId', sql.Int, practitionerId)
    .input('therapyPlanId', sql.Int, therapyPlanId)
    .query(`${planSelect}
      WHERE p.PractitionerId = @practitionerId
        AND p.TherapyPlanId = @therapyPlanId`);
  const row = result.recordset[0];
  if (!row) return null;
  return {
    ...mapPlan(row),
    preferredDays: await getPreferredDays(pool, therapyPlanId),
    sessions: await getSessions(pool, therapyPlanId),
  };
};

const getRequestOwner = async (therapyPlanId) => {
  const pool = await ensurePool();
  const result = await pool.request()
    .input('therapyPlanId', sql.Int, therapyPlanId)
    .query(`SELECT TherapyPlanId, PractitionerId
      FROM dbo.TherapyPlans
      WHERE TherapyPlanId = @therapyPlanId`);
  return result.recordset[0] || null;
};

const getTherapyPlanForUpdate = async (transaction, practitionerId, therapyPlanId) => {
  const result = await transaction.request()
    .input('practitionerId', sql.Int, practitionerId)
    .input('therapyPlanId', sql.Int, therapyPlanId)
    .query(`${planSelect.replace('FROM dbo.TherapyPlans p', 'FROM dbo.TherapyPlans p WITH (UPDLOCK, HOLDLOCK)')}
      WHERE p.PractitionerId = @practitionerId
        AND p.TherapyPlanId = @therapyPlanId`);
  return result.recordset[0] || null;
};

const getTherapyPlanOwnerForUpdate = async (transaction, therapyPlanId) => {
  const result = await transaction.request()
    .input('therapyPlanId', sql.Int, therapyPlanId)
    .query(`SELECT TherapyPlanId, PractitionerId, Status
      FROM dbo.TherapyPlans WITH (UPDLOCK, HOLDLOCK)
      WHERE TherapyPlanId = @therapyPlanId`);
  return result.recordset[0] || null;
};

const getTherapySessionsForUpdate = async (transaction, therapyPlanId) => {
  const result = await transaction.request()
    .input('therapyPlanId', sql.Int, therapyPlanId)
    .query(`SELECT SessionId, TherapyPlanId, PractitionerId, SessionNumber,
        SessionDate, StartTime, EndTime, Status
      FROM dbo.TherapySessions WITH (UPDLOCK, HOLDLOCK)
      WHERE TherapyPlanId = @therapyPlanId
      ORDER BY SessionNumber`);
  return result.recordset;
};

const getPractitionerAvailabilityForUpdate = async (transaction, practitionerId) => {
  const result = await transaction.request()
    .input('practitionerId', sql.Int, practitionerId)
    .query(`SELECT PractitionerId, DayOfWeek, StartTime, EndTime, IsAvailable
      FROM dbo.PractitionerAvailability WITH (UPDLOCK, HOLDLOCK)
      WHERE PractitionerId = @practitionerId
        AND IsAvailable = 1
      ORDER BY DayOfWeek, StartTime`);
  return result.recordset;
};

const findConflictingSessions = async (transaction, session, excludedSessionIds) => {
  const request = transaction.request()
    .input('practitionerId', sql.Int, session.PractitionerId)
    .input('sessionDate', sql.Date, session.SessionDate)
    .input('startTime', sql.VarChar(8), session.StartTime)
    .input('endTime', sql.VarChar(8), session.EndTime);
  const exclusions = excludedSessionIds.map((id, index) => {
    const parameter = `excludedSessionId${index}`;
    request.input(parameter, sql.Int, id);
    return `@${parameter}`;
  });
  const exclusionClause = exclusions.length ? `AND SessionId NOT IN (${exclusions.join(', ')})` : '';
  const result = await request.query(`SELECT TOP (1) SessionId, TherapyPlanId
    FROM dbo.TherapySessions WITH (UPDLOCK, HOLDLOCK)
    WHERE PractitionerId = @practitionerId
      AND SessionDate = @sessionDate
      AND Status IN ('PENDING', 'CONFIRMED')
      AND StartTime < CONVERT(TIME, @endTime)
      AND EndTime > CONVERT(TIME, @startTime)
      ${exclusionClause}`);
  return result.recordset[0] || null;
};

const updateTherapyPlanToConfirmed = async (transaction, therapyPlanId) => {
  const result = await transaction.request()
    .input('therapyPlanId', sql.Int, therapyPlanId)
    .query(`UPDATE dbo.TherapyPlans
      SET Status = 'CONFIRMED', UpdatedAt = GETUTCDATE()
      WHERE TherapyPlanId = @therapyPlanId AND Status = 'PENDING'`);
  return result.rowsAffected[0];
};

const updateSessionsToConfirmed = async (transaction, therapyPlanId) => {
  const result = await transaction.request()
    .input('therapyPlanId', sql.Int, therapyPlanId)
    .query(`UPDATE dbo.TherapySessions
      SET Status = 'CONFIRMED', UpdatedAt = GETUTCDATE()
      WHERE TherapyPlanId = @therapyPlanId AND Status = 'PENDING'`);
  return result.rowsAffected[0];
};

const updateTherapyPlanToRejected = async (transaction, therapyPlanId, rejectionReason) => {
  const result = await transaction.request()
    .input('therapyPlanId', sql.Int, therapyPlanId)
    .input('rejectionReason', sql.NVarChar(500), rejectionReason)
    .query(`UPDATE dbo.TherapyPlans
      SET Status = 'REJECTED', RejectionReason = @rejectionReason, UpdatedAt = GETUTCDATE()
      WHERE TherapyPlanId = @therapyPlanId AND Status = 'PENDING'`);
  return result.rowsAffected[0];
};

const updateSessionsToRejected = async (transaction, therapyPlanId) => {
  const result = await transaction.request()
    .input('therapyPlanId', sql.Int, therapyPlanId)
    .query(`UPDATE dbo.TherapySessions
      SET Status = 'REJECTED', UpdatedAt = GETUTCDATE()
      WHERE TherapyPlanId = @therapyPlanId AND Status = 'PENDING'`);
  return result.rowsAffected[0];
};

module.exports = {
  getTransaction,
  getPractitionerByUserId,
  getPendingRequestsByPractitionerId,
  getRequestDetailsByPractitionerId,
  getRequestOwner,
  getTherapyPlanForUpdate,
  getTherapyPlanOwnerForUpdate,
  getTherapySessionsForUpdate,
  getPractitionerAvailabilityForUpdate,
  findConflictingSessions,
  updateTherapyPlanToConfirmed,
  updateSessionsToConfirmed,
  updateTherapyPlanToRejected,
  updateSessionsToRejected,
};