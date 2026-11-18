const { pool } = require('../config/db');
const { mapUserRow } = require('./authController');

// Helper: generate a unique CO-### company_id
const generateUniqueCompanyId = async (connection) => {
  for (let attempt = 0; attempt < 20; attempt++) {
    const randomNum = Math.floor(100 + Math.random() * 900);
    const candidate = `CO-${randomNum}`;
    const [rows] = await connection.query(
      'SELECT company_id FROM companies WHERE company_id = ? LIMIT 1',
      [candidate]
    );
    if (rows.length === 0) {
      return candidate;
    }
  }
  return `CO-${Date.now().toString().slice(-6)}`;
};

// GET /api/super-admin/stats
const getPlatformStats = async (req, res) => {
  try {
    const [[adminCountRow]] = await pool.query(
      "SELECT COUNT(*) AS adminCount FROM users WHERE role = 'ADMIN'"
    );
    const [[companyCountRow]] = await pool.query(
      'SELECT COUNT(*) AS companyCount FROM companies'
    );

    return res.json({
      success: true,
      adminCount: Number(adminCountRow?.adminCount || 0),
      companyCount: Number(companyCountRow?.companyCount || 0),
    });
  } catch (err) {
    console.error('[superAdminController.getPlatformStats] Error:', err);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to load platform statistics' });
  }
};

// GET /api/super-admin/admins
const getCompanyAdmins = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.*, c.name AS company_table_name, c.main_campus
       FROM users u
       LEFT JOIN companies c ON u.company_id = c.company_id
       WHERE u.role = 'ADMIN'
       ORDER BY u.created_at DESC`
    );

    return res.json({
      success: true,
      admins: rows.map(mapUserRow),
    });
  } catch (err) {
    console.error('[superAdminController.getCompanyAdmins] Error:', err);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to load Company Admins' });
  }
};

// POST /api/super-admin/admins
const createCompanyAdmin = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { companyName, adminName, email, password } = req.body;

    if (!companyName || !String(companyName).trim()) {
      return res
        .status(400)
        .json({ success: false, error: 'Please enter the company name' });
    }
    if (!adminName || !String(adminName).trim()) {
      return res
        .status(400)
        .json({ success: false, error: 'Please enter the admin full name' });
    }
    if (!email || !String(email).trim()) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid work email address',
      });
    }
    if (!password || String(password).length < 6) {
      return res.status(400).json({
        success: false,
        error: '! Password must be at least 6 characters',
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const trimmedCompany = String(companyName).trim();
    const trimmedName = String(adminName).trim();

    // Check global email uniqueness across all roles and companies
    const [existingUsers] = await connection.query(
      'SELECT email FROM users WHERE LOWER(email) = ? LIMIT 1',
      [normalizedEmail]
    );
    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email already exists',
      });
    }

    await connection.beginTransaction();

    const companyId = await generateUniqueCompanyId(connection);
    const defaultWorkingDays = JSON.stringify(['M', 'T1', 'W', 'T2', 'F']);

    // 1. Insert company row into companies table
    await connection.query(
      `INSERT INTO companies
        (company_id, name, main_campus, timezone, geofence_lat, geofence_lng, geofence_radius_m, working_days, rate_absent, currency)
       VALUES (?, ?, NULL, 'Asia/Karachi (GMT+05:00)', 31.5204000, 74.3587000, 200, ?, 5000.00, 'PKR')`,
      [companyId, trimmedCompany, defaultWorkingDays]
    );

    // 2. Insert Company Admin user into users table
    await connection.query(
      `INSERT INTO users
        (email, company_id, manager_email, name, password, phone, role, company_name, avatar_key, is_active)
       VALUES (?, ?, NULL, ?, ?, '+92 300 0000000', 'ADMIN', ?, 'dpAdminUsman', 1)`,
      [normalizedEmail, companyId, trimmedName, password, trimmedCompany]
    );

    await connection.commit();

    const [createdRows] = await connection.query(
      `SELECT u.*, c.name AS company_table_name, c.main_campus
       FROM users u
       LEFT JOIN companies c ON u.company_id = c.company_id
       WHERE u.email = ?
       LIMIT 1`,
      [normalizedEmail]
    );

    return res.status(201).json({
      success: true,
      admin: mapUserRow(createdRows[0]),
    });
  } catch (err) {
    await connection.rollback();
    console.error('[superAdminController.createCompanyAdmin] Error:', err);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to create Company Admin' });
  } finally {
    connection.release();
  }
};

// DELETE /api/super-admin/admins/:email
const deleteCompanyAdmin = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const rawEmail = req.params.email || '';
    const normalizedEmail = decodeURIComponent(rawEmail).trim().toLowerCase();

    const [rows] = await connection.query(
      "SELECT email, company_id FROM users WHERE LOWER(email) = ? AND role = 'ADMIN' LIMIT 1",
      [normalizedEmail]
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: 'Company Admin not found' });
    }

    const { email, company_id: companyId } = rows[0];

    await connection.beginTransaction();

    await connection.query('DELETE FROM users WHERE email = ?', [email]);

    // If no other users exist under this company, remove the company record too
    const [[remainingRow]] = await connection.query(
      'SELECT COUNT(*) AS count FROM users WHERE company_id = ?',
      [companyId]
    );
    if (Number(remainingRow?.count || 0) === 0) {
      await connection.query('DELETE FROM companies WHERE company_id = ?', [
        companyId,
      ]);
    }

    await connection.commit();

    return res.json({
      success: true,
      message: 'Company Admin removed successfully',
    });
  } catch (err) {
    await connection.rollback();
    console.error('[superAdminController.deleteCompanyAdmin] Error:', err);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to remove Company Admin' });
  } finally {
    connection.release();
  }
};

module.exports = {
  getPlatformStats,
  getCompanyAdmins,
  createCompanyAdmin,
  deleteCompanyAdmin,
};
