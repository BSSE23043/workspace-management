const { pool } = require('../config/db');

const SUPER_ADMIN_EMAIL = 'superadmin@wms.com';
const SUPER_ADMIN_PASSWORD = 'SuperAdmin@123';
const SUPER_ADMIN_USER = {
  id: 'SUP-001',
  name: 'WMS Platform Owner',
  email: SUPER_ADMIN_EMAIL,
  role: 'SUPER_ADMIN',
  title: 'Super Admin (Platform Owner)',
  location: 'WMS Head Office',
  phone: '+92 300 0000001',
  department: 'Platform Management',
  avatarKey: 'appLogo',
  isActive: true,
  reportsTo: null,
};

const mapUserRow = (row) => {
  if (!row) return null;
  const defaultAvatar = row.role === 'ADMIN' ? 'dpAdminUsman' : 'dpEmpAli';
  return {
    id: row.email,
    email: row.email,
    companyId: row.company_id,
    name: row.name,
    password: row.password,
    phone: row.phone || '+92 300 0000000',
    role: row.role,
    companyName: row.company_name || row.company_table_name || '',
    avatarKey: row.avatar_key || defaultAvatar,
    avatarCustomUri: row.avatar_key || null,
    isActive: Boolean(row.is_active),
    managerId: row.manager_email || null,
    managerEmail: row.manager_email || null,
    reportsTo: row.manager_name || null,
    title:
      row.role === 'ADMIN'
        ? 'Company Administrator'
        : `${row.role} Specialist`,
    location: row.main_campus || 'HQ - Main Office',
    createdAt: row.created_at,
  };
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, error: 'Email and password are required' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // 1. Check hardcoded Super Admin credentials first
    if (normalizedEmail === SUPER_ADMIN_EMAIL) {
      if (password !== SUPER_ADMIN_PASSWORD) {
        return res
          .status(401)
          .json({ success: false, error: 'Incorrect password entered' });
      }
      return res.json({ success: true, user: SUPER_ADMIN_USER });
    }

    // 2. Look up user in MySQL users table
    const [rows] = await pool.query(
      `SELECT u.*, c.name AS company_table_name, c.main_campus, m.name AS manager_name
       FROM users u
       LEFT JOIN companies c ON u.company_id = c.company_id
       LEFT JOIN users m ON u.manager_email = m.email
       WHERE LOWER(u.email) = ?
       LIMIT 1`,
      [normalizedEmail]
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: 'No user found with this email address' });
    }

    const userRow = rows[0];

    if (userRow.password !== password) {
      return res
        .status(401)
        .json({ success: false, error: 'Incorrect password entered' });
    }

    if (!userRow.is_active) {
      return res.status(403).json({
        success: false,
        error: 'Account has been deactivated. Contact Admin.',
      });
    }

    return res.json({
      success: true,
      user: mapUserRow(userRow),
    });
  } catch (err) {
    console.error('[authController.login] Error:', err);
    return res
      .status(500)
      .json({ success: false, error: 'Database error during login' });
  }
};

// PUT /api/auth/profile
const updateProfile = async (req, res) => {
  try {
    const { email, name, phone, avatarKey, avatarCustomUri } = req.body;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, error: 'User email is required' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const [existingRows] = await pool.query(
      'SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1',
      [normalizedEmail]
    );

    if (existingRows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: 'User not found in database' });
    }

    const current = existingRows[0];
    const updatedName = name !== undefined ? String(name).trim() : current.name;
    const updatedPhone = phone !== undefined ? String(phone).trim() : current.phone;
    const updatedAvatar =
      avatarKey !== undefined
        ? avatarKey
        : avatarCustomUri !== undefined
        ? avatarCustomUri
        : current.avatar_key;

    await pool.query(
      `UPDATE users
       SET name = ?, phone = ?, avatar_key = ?
       WHERE email = ?`,
      [updatedName, updatedPhone, updatedAvatar, current.email]
    );

    const [updatedRows] = await pool.query(
      `SELECT u.*, c.name AS company_table_name, c.main_campus, m.name AS manager_name
       FROM users u
       LEFT JOIN companies c ON u.company_id = c.company_id
       LEFT JOIN users m ON u.manager_email = m.email
       WHERE u.email = ?
       LIMIT 1`,
      [current.email]
    );

    const mapped = mapUserRow(updatedRows[0]);
    // Preserve optional display-only fields sent from the profile form
    if (req.body.title !== undefined) mapped.title = req.body.title;
    if (req.body.location !== undefined) mapped.location = req.body.location;

    return res.json({
      success: true,
      user: mapped,
    });
  } catch (err) {
    console.error('[authController.updateProfile] Error:', err);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to update user profile' });
  }
};

module.exports = {
  login,
  updateProfile,
  mapUserRow,
};
