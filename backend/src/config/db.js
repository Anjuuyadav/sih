const sql = require('mssql');
const dotenv = require('dotenv');

dotenv.config();

const dbConfig = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_DATABASE || 'PanchkarmaDB',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'yourpassword',
  port: parseInt(process.env.DB_PORT, 10) || 1433,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_CERT === 'true',
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
    console.error('Database Connection Failed! Bad Config: ', err);
    return null;
  }
};

const poolPromise = createPool();

module.exports = {
  sql,
  poolPromise,
  getPool: createPool,
};
