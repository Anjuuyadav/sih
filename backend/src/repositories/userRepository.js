const { poolPromise, sql } = require('../config/db');

const ensurePool = async () => {
  const pool = await poolPromise;
  if (!pool) {
    throw new Error('Database connection is unavailable');
  }
  return pool;
};

const getUserByEmail = async (email) => {
  const pool = await ensurePool();
  const result = await pool.request()
    .input('email', sql.VarChar(255), String(email || '').trim().toLowerCase())
    .query('SELECT * FROM Users WHERE LOWER(Email) = LOWER(@email)');
  return result.recordset[0];
};

const createUser = async ({ name, email, passwordHash, role, status }) => {
  const pool = await ensurePool();
  const result = await pool.request()
    .input('name', sql.VarChar(255), name)
    .input('email', sql.VarChar(255), email)
    .input('passwordHash', sql.VarChar(255), passwordHash)
    .input('role', sql.VarChar(50), role)
    .input('status', sql.VarChar(50), status)
    .query(
      `INSERT INTO Users (Name, Email, PasswordHash, Role, Status, CreatedAt, UpdatedAt)
       OUTPUT INSERTED.*
       VALUES (@name, @email, @passwordHash, @role, @status, GETUTCDATE(), GETUTCDATE())`
    );
  return result.recordset[0];
};


module.exports = {
  getUserByEmail,
  createUser,
};
