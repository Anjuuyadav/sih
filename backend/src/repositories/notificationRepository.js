const { poolPromise, sql } = require('../config/db');

const ensurePool = async () => {
  const pool = await poolPromise;
  if (!pool) throw new Error('Database connection is unavailable');
  return pool;
};

const getBookingNotificationContext = async (therapyPlanId) => {
  const pool = await ensurePool();
  const planResult = await pool.request()
    .input('therapyPlanId', sql.Int, therapyPlanId)
    .query(`SELECT p.TherapyPlanId, p.PatientId, p.PractitionerId, p.NumberOfSessions,
        p.Status, p.RejectionReason,
        u.UserId, u.Name AS PatientName, u.Email, u.ContactNumber,
        t.TherapyName,
        pr.FirstName AS PractitionerFirstName, pr.LastName AS PractitionerLastName
      FROM dbo.TherapyPlans p
      INNER JOIN dbo.Patients pt ON pt.PatientId = p.PatientId
      INNER JOIN dbo.Users u ON u.UserId = pt.UserId
      INNER JOIN dbo.Therapies t ON t.TherapyId = p.TherapyId
      INNER JOIN dbo.Practitioners pr ON pr.PractitionerId = p.PractitionerId
      WHERE p.TherapyPlanId = @therapyPlanId`);
  const plan = planResult.recordset[0];
  if (!plan) return null;

  const sessionsResult = await pool.request()
    .input('therapyPlanId', sql.Int, therapyPlanId)
    .query(`SELECT SessionId, SessionNumber, SessionDate, StartTime, EndTime, Status
      FROM dbo.TherapySessions
      WHERE TherapyPlanId = @therapyPlanId
      ORDER BY SessionNumber`);
  return { ...plan, sessions: sessionsResult.recordset };
};

const getExistingNotification = async (values) => {
  const pool = await ensurePool();
  const result = await pool.request()
    .input('userId', sql.Int, values.userId)
    .input('therapyPlanId', sql.Int, values.therapyPlanId)
    .input('notificationType', sql.NVarChar(40), values.notificationType)
    .input('channel', sql.NVarChar(10), values.channel)
    .query(`SELECT TOP (1) NotificationId, Status, ErrorMessage, SentAt
      FROM dbo.Notifications
      WHERE UserId = @userId
        AND TherapyPlanId = @therapyPlanId
        AND NotificationType = @notificationType
        AND Channel = @channel
      ORDER BY NotificationId DESC`);
  return result.recordset[0] || null;
};

const createNotification = async (values) => {
  const pool = await ensurePool();
  const result = await pool.request()
    .input('userId', sql.Int, values.userId)
    .input('therapyPlanId', sql.Int, values.therapyPlanId)
    .input('sessionId', sql.Int, values.sessionId || null)
    .input('notificationType', sql.NVarChar(40), values.notificationType)
    .input('channel', sql.NVarChar(10), values.channel)
    .input('subject', sql.NVarChar(255), values.subject || null)
    .input('message', sql.NVarChar(2000), values.message)
    .input('status', sql.NVarChar(20), 'PENDING')
    .query(`INSERT INTO dbo.Notifications
        (UserId, TherapyPlanId, SessionId, NotificationType, Channel,
         Subject, Message, Status, CreatedAt)
      OUTPUT INSERTED.NotificationId
      VALUES (@userId, @therapyPlanId, @sessionId, @notificationType, @channel,
        @subject, @message, @status, GETUTCDATE())`);
  return result.recordset[0].NotificationId;
};

const createNotificationIfAbsent = async (values) => {
  const pool = await ensurePool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    const existingResult = await transaction.request()
      .input('userId', sql.Int, values.userId)
      .input('therapyPlanId', sql.Int, values.therapyPlanId)
      .input('notificationType', sql.NVarChar(40), values.notificationType)
      .input('channel', sql.NVarChar(10), values.channel)
      .query(`SELECT TOP (1) NotificationId, Status
        FROM dbo.Notifications WITH (UPDLOCK, HOLDLOCK)
        WHERE UserId = @userId
          AND TherapyPlanId = @therapyPlanId
          AND NotificationType = @notificationType
          AND Channel = @channel
        ORDER BY NotificationId DESC`);
    if (existingResult.recordset[0]) {
      await transaction.commit();
      return { notificationId: existingResult.recordset[0].NotificationId, duplicate: true, status: existingResult.recordset[0].Status };
    }

    const result = await transaction.request()
      .input('userId', sql.Int, values.userId)
      .input('therapyPlanId', sql.Int, values.therapyPlanId)
      .input('sessionId', sql.Int, values.sessionId || null)
      .input('notificationType', sql.NVarChar(40), values.notificationType)
      .input('channel', sql.NVarChar(10), values.channel)
      .input('subject', sql.NVarChar(255), values.subject || null)
      .input('message', sql.NVarChar(2000), values.message)
      .input('status', sql.NVarChar(20), 'PENDING')
      .query(`INSERT INTO dbo.Notifications
          (UserId, TherapyPlanId, SessionId, NotificationType, Channel,
           Subject, Message, Status, CreatedAt)
        OUTPUT INSERTED.NotificationId
        VALUES (@userId, @therapyPlanId, @sessionId, @notificationType, @channel,
          @subject, @message, @status, GETUTCDATE())`);
    await transaction.commit();
    return { notificationId: result.recordset[0].NotificationId, duplicate: false, status: 'PENDING' };
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (rollbackError) {
      // Preserve the original notification error.
    }
    throw error;
  }
};

const markNotificationSent = async (notificationId) => {
  const pool = await ensurePool();
  await pool.request()
    .input('notificationId', sql.Int, notificationId)
    .query(`UPDATE dbo.Notifications
      SET Status = 'SENT', SentAt = GETUTCDATE(), ErrorMessage = NULL
      WHERE NotificationId = @notificationId`);
};

const markNotificationFailed = async (notificationId, errorMessage) => {
  const pool = await ensurePool();
  await pool.request()
    .input('notificationId', sql.Int, notificationId)
    .input('errorMessage', sql.NVarChar(1000), String(errorMessage || 'Notification delivery failed').slice(0, 1000))
    .query(`UPDATE dbo.Notifications
      SET Status = 'FAILED', ErrorMessage = @errorMessage
      WHERE NotificationId = @notificationId`);
};

const getNotificationsByUserId = async (userId) => {
  const pool = await ensurePool();
  const result = await pool.request()
    .input('userId', sql.Int, userId)
    .query(`SELECT NotificationId, UserId, TherapyPlanId, SessionId,
        NotificationType, Channel, Subject, Message, Status, SentAt,
        ErrorMessage, CreatedAt
      FROM dbo.Notifications
      WHERE UserId = @userId
      ORDER BY CreatedAt DESC`);
  return result.recordset;
};

module.exports = {
  getBookingNotificationContext,
  getExistingNotification,
  createNotification,
  createNotificationIfAbsent,
  markNotificationSent,
  markNotificationFailed,
  getNotificationsByUserId,
};