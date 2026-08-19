const { poolPromise } = require('../config/db');

const ensurePool = async () => {
  const pool = await poolPromise;
  if (!pool) throw new Error('Database connection is unavailable');
  return pool;
};

const getActiveTherapies = async () => {
  const pool = await ensurePool();
  const result = await pool.request().query(`SELECT TherapyId, TherapyName, Cost, Duration, Description
    FROM dbo.Therapies
    WHERE IsActive = 1
    ORDER BY TherapyName ASC`);
  return result.recordset;
};

module.exports = { getActiveTherapies };