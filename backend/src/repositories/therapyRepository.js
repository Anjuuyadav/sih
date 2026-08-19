const { poolPromise, sql } = require('../config/db');
const ensurePool = async () => { const pool = await poolPromise; if (!pool) throw new Error('Database connection is unavailable'); return pool; };
const getTherapies = async () => (await (await ensurePool()).request().query('SELECT * FROM dbo.Therapies ORDER BY TherapyId DESC')).recordset;
const getTherapyById = async (id) => (await (await ensurePool()).request().input('therapyId', sql.Int, id).query('SELECT * FROM dbo.Therapies WHERE TherapyId = @therapyId')).recordset[0];
const createTherapy = async ({ therapyName, cost, duration, description, isActive = true }) => {
  const result = await (await ensurePool()).request().input('therapyName', sql.NVarChar(150), therapyName).input('cost', sql.Decimal(10, 2), Number(cost)).input('duration', sql.Int, Number(duration)).input('description', sql.NVarChar(500), description || null).input('isActive', sql.Bit, isActive).query(`INSERT INTO dbo.Therapies (TherapyName, Cost, Duration, Description, IsActive) OUTPUT INSERTED.* VALUES (@therapyName, @cost, @duration, @description, @isActive)`);
  return result.recordset[0];
};
const updateTherapy = async (id, data) => {
  const fields = []; const request = (await ensurePool()).request().input('therapyId', sql.Int, id);
  [['therapyName', sql.NVarChar(150), 'TherapyName'], ['cost', sql.Decimal(10, 2), 'Cost'], ['duration', sql.Int, 'Duration'], ['description', sql.NVarChar(500), 'Description'], ['isActive', sql.Bit, 'IsActive']].forEach(([key, type, column]) => { if (data[key] !== undefined) { fields.push(`${column} = @${key}`); request.input(key, type, key === 'cost' || key === 'duration' ? Number(data[key]) : data[key]); } });
  if (fields.length) { fields.push('UpdatedAt = GETDATE()'); await request.query(`UPDATE dbo.Therapies SET ${fields.join(', ')} WHERE TherapyId = @therapyId`); }
  return getTherapyById(id);
};
const softDeleteTherapy = async (id) => (await (await ensurePool()).request().input('therapyId', sql.Int, id).query('UPDATE dbo.Therapies SET IsActive = 0, UpdatedAt = GETDATE() WHERE TherapyId = @therapyId'));
module.exports = { getTherapies, getTherapyById, createTherapy, updateTherapy, softDeleteTherapy };
