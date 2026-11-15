const express = require('express');
const cors = require('cors');

const pool = require('./config/db');
const leaveRoutes = require('./routes/leaveRoutes');
const requirementRoutes = require('./routes/requirementRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'error', database: 'unavailable' });
  }
});

app.use('/api/leaves', leaveRoutes);
app.use('/api/requirements', requirementRoutes);

app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
});

app.use((error, req, res, next) => {
  const statusCode = error.statusCode || 500;
  if (statusCode >= 500) {
    console.error(error);
  }
  res.status(statusCode).json({ error: error.message || 'Internal server error' });
});

module.exports = app;
