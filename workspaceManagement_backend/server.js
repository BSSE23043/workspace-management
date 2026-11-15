// Workspace Management System — REST API
//
// Run with:  npm run dev   (nodemon)  or  npm start
// Requires MySQL/MariaDB with workspace_management created from
// src/schema/wms_schema.sql, and a .env file (see .env.example).

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const pool = require('./src/config/db');
const taskRoutes = require('./src/routes/taskRoutes');
const userRoutes = require('./src/routes/userRoutes');

const app = express();
const PORT = Number(process.env.PORT || 5000);

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'error', database: 'unavailable', message: err.message });
  }
});

app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);

app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Central error handler — every route passes errors here via next(err).
app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) {
    console.error('[API error]', err);
  }
  res.status(status).json({
    error: err.message || 'Internal server error',
    ...(err.code ? { code: err.code } : {}),
  });
});

const start = async () => {
  try {
    await pool.query('SELECT 1');
    console.log(
      `[db] connected to ${process.env.DB_NAME || 'workspace_management'} at ${
        process.env.DB_HOST || '127.0.0.1'
      }:${process.env.DB_PORT || 3306}`
    );
  } catch (err) {
    console.error(
      '\n[db] Could not connect to MySQL/MariaDB.\n' +
        '  1. Start MySQL (XAMPP Control Panel -> MySQL -> Start).\n' +
        '  2. Create the database by running src/schema/wms_schema.sql.\n' +
        '  3. Copy .env.example to .env and fill in DB_USER / DB_PASSWORD.\n'
    );
    console.error(`[db] ${err.message}`);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`[api] WMS backend listening on http://localhost:${PORT}`);
    console.log(`[api] Android emulator base URL: http://10.0.2.2:${PORT}/api`);
  });
};

start();
