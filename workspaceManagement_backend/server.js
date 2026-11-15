require('dotenv').config();

const app = require('./src/app');
const pool = require('./src/config/db');

const PORT = Number(process.env.PORT) || 5000;

const start = async () => {
  try {
    await pool.query('SELECT 1');
    console.log('[db] Connected to MySQL');
  } catch (error) {
    console.error('[db] Could not connect to MySQL:', error.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`[server] API listening on http://localhost:${PORT}`);
  });
};

start();
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { testConnection } = require('./src/config/db');
const authRoutes = require('./src/routes/authRoutes');
const superAdminRoutes = require('./src/routes/superAdminRoutes');
const adminRoutes = require('./src/routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    await testConnection();
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      message: err.message,
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/admin', adminRoutes);

app.listen(PORT, () => {
  console.log(`[WMS Backend] Server running on http://localhost:${PORT}`);
});

module.exports = app;
