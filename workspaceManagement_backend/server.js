require('dotenv').config();

const app = require('./src/app');
const { pool } = require('./src/config/db');

const PORT = Number(process.env.PORT) || 5000;

const start = async () => {
  try {
    await pool.query('SELECT 1');
    console.log('[db] Connected to MySQL');
  } catch (error) {
    console.error(
      '\n[db] Could not connect to MySQL/MariaDB.\n' +
        '  1. Start MySQL (XAMPP Control Panel -> MySQL -> Start).\n' +
        '  2. Create the database by running src/schema/wms_schema.sql.\n' +
        '  3. Copy .env.example to .env and fill in DB_USER / DB_PASSWORD.\n'
    );
    console.error(`[db] ${error.message}`);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`[server] API listening on http://localhost:${PORT}`);
    console.log(`[api] Android emulator base URL: http://10.0.2.2:${PORT}/api`);
  });
};

start();

module.exports = app;
