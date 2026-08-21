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
  await transaction.begin();
  return transaction;
};

const getUserByEmail = async (email) => {
  const pool = await ensurePool();
  const result = await pool.request()
    .input('email', sql.VarChar(255), String(email || '').trim().toLowerCase())
    .query('SELECT * FROM Users WHERE LOWER(Email) = LOWER(@email)');
  return result.recordset[0];
};

const createUser = async ({ name, email, contactNumber, passwordHash, role, status }) => {
  const pool = await ensurePool();
  const result = await pool.request()
    .input('name', sql.VarChar(255), name)
    .input('email', sql.VarChar(255), email)
    .input('contactNumber', sql.VarChar(15), contactNumber)
    .input('passwordHash', sql.VarChar(255), passwordHash)
    .input('role', sql.VarChar(50), role)
    .input('status', sql.VarChar(50), status)
    .query(
      `INSERT INTO Users (Name, Email, ContactNumber, PasswordHash, Role, Status, CreatedAt, UpdatedAt)
       OUTPUT INSERTED.*
       VALUES (@name, @email, @contactNumber, @passwordHash, @role, @status, GETUTCDATE(), GETUTCDATE())`
    );
  return result.recordset[0];
};

const createUserInTransaction = async (transaction, { name, email, contactNumber, passwordHash, role, status }) => {
  const result = await transaction.request()
    .input('name', sql.VarChar(255), name)
    .input('email', sql.VarChar(255), email)
    .input('contactNumber', sql.VarChar(15), contactNumber)
    .input('passwordHash', sql.VarChar(255), passwordHash)
    .input('role', sql.VarChar(50), role)
    .input('status', sql.VarChar(50), status)
    .query(
      `INSERT INTO Users (Name, Email, ContactNumber, PasswordHash, Role, Status, CreatedAt, UpdatedAt)
       OUTPUT INSERTED.UserId
       VALUES (@name, @email, @contactNumber, @passwordHash, @role, @status, GETUTCDATE(), GETUTCDATE())`
    );
  return result.recordset[0];
};

const createPatientProfile = async (transaction, userId) => {
  await transaction.request()
    .input('userId', sql.Int, userId)
    .query(`INSERT INTO dbo.Patients (UserId, CreatedAt)
      VALUES (@userId, GETUTCDATE())`);
};


module.exports = {
  getTransaction,
  getUserByEmail,
  createUser,
  createUserInTransaction,
  createPatientProfile,
};
