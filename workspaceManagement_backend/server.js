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
