const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
// MySQL connection pool.
// All database settings come from workspaceManagement_backend/.env
// (see .env.example for the expected keys).
require('dotenv').config();

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'workspace_management',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
});

const testConnection = async () => {
  const connection = await pool.getConnection();
  try {
    await connection.ping();
    return true;
  } finally {
    connection.release();
  }
};

module.exports = {
  pool,
  testConnection,
};
  // Return DATE/DATETIME columns as strings so the mobile app receives
  // 'YYYY-MM-DD' and 'YYYY-MM-DD HH:mm:ss' values instead of JS Dates.
  dateStrings: true,
  charset: 'utf8mb4',
});

module.exports = pool;
