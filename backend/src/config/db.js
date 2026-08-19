const sql = require('mssql');
const dotenv = require('dotenv');

dotenv.config();

const dbConfig = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_DATABASE || 'PanchkarmaDB',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  options: {
    instanceName: 'SQLEXPRESS',
    encrypt: false,
    trustServerCertificate: true,
  },

  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let pool = null;

const createPool = async () => {
  if (pool) {
    return pool;
  }

  try {
    pool = await new sql.ConnectionPool(dbConfig).connect();

    console.log('Connected to SQL Server');

    return pool;
  } catch (err) {
    console.error('Database Connection Failed! Bad Config:', err);

    pool = null;

    return null;
  }
};

const poolPromise = createPool();

module.exports = {
  sql,
  poolPromise,
  getPool: createPool,
};