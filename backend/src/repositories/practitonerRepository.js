const { poolPromise, sql } = require('../config/db');
const bcrypt = require('bcrypt');

const ensurePool = async () => {
  const pool = await poolPromise;
  if (!pool) throw new Error('Database connection is unavailable');
  return pool;
};

const normalizeTime = (value) => { const match = String(value || '').match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/); if (!match) throw new Error('Time must use HH:mm:ss'); return `${match[1]}:${match[2]}:${match[3] || '00'}`; };

const replaceAvailability = async (transaction, practitionerId, availability) => {
  await transaction.request()
    .input('practitionerId', sql.Int, practitionerId)
    .query('DELETE FROM dbo.PractitionerAvailability WHERE PractitionerId = @practitionerId');

  for (const item of availability) {
    await transaction.request()
      .input('practitionerId', sql.Int, practitionerId)
      .input('dayOfWeek', sql.TinyInt, item.dayOfWeek)
      .input('startTime', sql.VarChar(8), normalizeTime(item.startTime))
      .input('endTime', sql.VarChar(8), normalizeTime(item.endTime))
      .input('isAvailable', sql.Bit, item.isAvailable === undefined ? true : item.isAvailable)
      .query(`INSERT INTO dbo.PractitionerAvailability
        (PractitionerId, DayOfWeek, StartTime, EndTime, IsAvailable)
        VALUES (@practitionerId, @dayOfWeek, CONVERT(TIME, @startTime),
          CONVERT(TIME, @endTime), @isAvailable)`);
  }
};

const getAvailability = async (practitionerId, db = null) => {
  const pool = db || await ensurePool();
  const result = await pool.request()
    .input('practitionerId', sql.Int, practitionerId)
    .query(`SELECT AvailabilityId, PractitionerId, DayOfWeek, StartTime, EndTime, IsAvailable
      FROM dbo.PractitionerAvailability WHERE PractitionerId = @practitionerId ORDER BY DayOfWeek`);
  return result.recordset;
};

const getPractitionerById = async (id, db = null) => {
  const pool = db || await ensurePool();
  const result = await pool.request()
    .input('practitionerId', sql.Int, id)
    .query(`SELECT p.PractitionerId, p.UserId, p.FirstName, p.LastName,
      COALESCE(u.Email, p.Email) AS Email, u.Role, p.ContactNumber,
      p.Specialization, p.IsActive, p.CreatedAt, p.UpdatedAt
      FROM dbo.Practitioners p LEFT JOIN dbo.Users u ON u.UserId = p.UserId
      WHERE p.PractitionerId = @practitionerId`);
  const practitioner = result.recordset[0];
  if (practitioner) practitioner.Availability = await getAvailability(id, pool);
  return practitioner;
};

const createPractitioner = async ({ firstName, lastName, email, password, contactNumber, specialization, availability = [] }) => {
  const pool = await ensurePool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    const normalizedEmail = String(email).trim().toLowerCase();
    const passwordHash = await bcrypt.hash(password, 12);
    const userResult = await transaction.request()
      .input('name', sql.NVarChar(255), [firstName, lastName].filter(Boolean).join(' '))
      .input('email', sql.NVarChar(255), normalizedEmail)
      .input('passwordHash', sql.NVarChar(500), passwordHash)
      .input('role', sql.NVarChar(50), 'Practitioner')
      .input('status', sql.NVarChar(50), 'Active')
      .query(`INSERT INTO dbo.Users (Name, Email, PasswordHash, Role, Status, CreatedAt, UpdatedAt)
        OUTPUT INSERTED.UserId
        VALUES (@name, @email, @passwordHash, @role, @status, GETUTCDATE(), GETUTCDATE())`);
    const result = await transaction.request()
      .input('userId', sql.Int, userResult.recordset[0].UserId)
      .input('firstName', sql.NVarChar(100), firstName)
      .input('lastName', sql.NVarChar(100), lastName || null)
      .input('email', sql.NVarChar(255), normalizedEmail)
      .input('contactNumber', sql.VarChar(15), contactNumber)
      .input('specialization', sql.NVarChar(150), specialization || null)
      .query(`INSERT INTO dbo.Practitioners
        (UserId, FirstName, LastName, Email, ContactNumber, Specialization)
        OUTPUT INSERTED.PractitionerId
        VALUES (@userId, @firstName, @lastName, @email, @contactNumber, @specialization)`);
    await replaceAvailability(transaction, result.recordset[0].PractitionerId, availability);
    await transaction.commit();
    return getPractitionerById(result.recordset[0].PractitionerId);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const getPractitioners = async () => {
  const pool = await ensurePool();
  const result = await pool.request().query(`SELECT p.PractitionerId, p.UserId, p.FirstName, p.LastName,
    COALESCE(u.Email, p.Email) AS Email, u.Role, p.ContactNumber, p.Specialization,
    p.IsActive, p.CreatedAt, p.UpdatedAt
    FROM dbo.Practitioners p LEFT JOIN dbo.Users u ON u.UserId = p.UserId
    ORDER BY p.PractitionerId DESC`);
  return Promise.all(result.recordset.map(async (item) => ({ ...item, Availability: await getAvailability(item.PractitionerId, pool) })));
};

const updatePractitioner = async (id, data) => {
  const pool = await ensurePool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    const fields = [];
    const request = transaction.request().input('practitionerId', sql.Int, id);
    const values = [
      ['firstName', sql.NVarChar(100), 'FirstName'], ['lastName', sql.NVarChar(100), 'LastName'],
      ['email', sql.NVarChar(255), 'Email'], ['contactNumber', sql.VarChar(15), 'ContactNumber'],
      ['specialization', sql.NVarChar(150), 'Specialization'], ['isActive', sql.Bit, 'IsActive'],
    ];
    values.forEach(([key, type, column]) => {
      if (data[key] !== undefined) {
        fields.push(`${column} = @${key}`);
        request.input(key, type, data[key]);
      }
    });
    if (fields.length) {
      fields.push('UpdatedAt = GETDATE()');
      await request.query(`UPDATE dbo.Practitioners SET ${fields.join(', ')} WHERE PractitionerId = @practitionerId`);
    }
    const practitionerResult = await transaction.request()
      .input('practitionerId', sql.Int, id)
      .query('SELECT UserId FROM dbo.Practitioners WHERE PractitionerId = @practitionerId');
    const userId = practitionerResult.recordset[0]?.UserId;
    if (userId) {
      const userRequest = transaction.request()
        .input('userId', sql.Int, userId)
        .input('email', sql.NVarChar(255), String(data.email).trim().toLowerCase())
        .input('name', sql.NVarChar(255), [data.firstName, data.lastName].filter(Boolean).join(' '));
      const userFields = ['Email = @email', 'Name = @name', "Role = 'Practitioner'"];
      if (data.newPassword) {
        userRequest.input('passwordHash', sql.NVarChar(500), await bcrypt.hash(data.newPassword, 12));
        userFields.push('PasswordHash = @passwordHash');
      }
      userFields.push('UpdatedAt = GETUTCDATE()');
      await userRequest.query(`UPDATE dbo.Users SET ${userFields.join(', ')} WHERE UserId = @userId`);
    }
    if (Array.isArray(data.availability)) await replaceAvailability(transaction, id, data.availability);
    await transaction.commit();
    return getPractitionerById(id);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const softDeletePractitioner = async (id) => {
  const pool = await ensurePool();
  await pool.request()
    .input('practitionerId', sql.Int, id)
    .query('UPDATE dbo.Practitioners SET IsActive = 0, UpdatedAt = GETDATE() WHERE PractitionerId = @practitionerId');
};

module.exports = { createPractitioner, getPractitioners, getPractitionerById, getAvailability, updatePractitioner, softDeletePractitioner };
