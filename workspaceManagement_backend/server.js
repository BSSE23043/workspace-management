const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { testConnection } = require('./src/config/db');

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

app.listen(PORT, () => {
  console.log(`[WMS Backend] Server running on http://localhost:${PORT}`);
});

module.exports = app;
