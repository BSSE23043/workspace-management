const crypto = require('crypto');
const { pool } = require('../config/db');
const { mapUserRow } = require('./authController');

const ALLOWED_PROVISION_ROLES = ['EMPLOYEE', 'MANAGER', 'HR', 'CLIENT'];

const parseWorkingDays = (raw) => {
  if (!raw) return ['M', 'T1', 'W', 'T2', 'F'];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : ['M', 'T1', 'W', 'T2', 'F'];
  } catch {
    return ['M', 'T1', 'W', 'T2', 'F'];
  }
};

const mapCompanyRow = (row, salaryRow) => {
  if (!row) {
    return {
      companyId: '',
      enterpriseId: '',
      name: '',
      mainCampus: '',
      timezone: '',
      latitude: 31.5204,
      longitude: 74.3587,
      geofenceRadiusMeters: 200,
      workingDays: ['M', 'T1', 'W', 'T2', 'F'],
      standardWorkingDaysPerMonth: 22,
      defaultAbsenceDeduction: 5000,
      currency: 'PKR',
    };
  }

  return {
    companyId: row.company_id,
    enterpriseId: row.company_id,
    name: row.name || '',
    mainCampus: row.main_campus || '',
    timezone: row.timezone || 'Asia/Karachi (GMT+05:00)',
    latitude: row.geofence_lat !== null ? Number(row.geofence_lat) : 31.5204,
    longitude: row.geofence_lng !== null ? Number(row.geofence_lng) : 74.3587,
    geofenceRadiusMeters:
      row.geofence_radius_m !== null ? Number(row.geofence_radius_m) : 200,
    workingDays: parseWorkingDays(row.working_days),
    standardWorkingDaysPerMonth:
      salaryRow?.working_days_per_month !== undefined
        ? Number(salaryRow.working_days_per_month)
        : 22,
    defaultAbsenceDeduction:
      row.rate_absent !== null ? Number(row.rate_absent) : 5000,
    currency: row.currency || 'PKR',
  };
};

// GET /api/admin/company/:companyId
const getCompanyProfile = async (req, res) => {
  try {
    const { companyId } = req.params;
    if (!companyId) {
      return res
        .status(400)
        .json({ success: false, error: 'companyId is required' });
    }

    const [companyRows] = await pool.query(
      'SELECT * FROM companies WHERE company_id = ? LIMIT 1',
      [companyId]
    );

    const [salaryRows] = await pool.query(
      'SELECT * FROM salary_configs WHERE company_id = ? AND user_email IS NULL LIMIT 1',
      [companyId]
    );

    return res.json({
      success: true,
      company: mapCompanyRow(companyRows[0], salaryRows[0]),
    });
  } catch (err) {
    console.error('[adminController.getCompanyProfile] Error:', err);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to load company profile' });
  }
};

// PUT /api/admin/company/:companyId
const updateCompanyProfile = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { companyId } = req.params;
    if (!companyId) {
      return res
        .status(400)
        .json({ success: false, error: 'companyId is required' });
    }

    const {
      name,
      mainCampus,
      timezone,
      latitude,
      longitude,
      geofenceRadiusMeters,
      workingDays,
      standardWorkingDaysPerMonth,
      defaultAbsenceDeduction,
    } = req.body;

    const trimmedName = String(name || '').trim() || 'Company';
    const trimmedCampus =
      mainCampus !== undefined && String(mainCampus).trim()
        ? String(mainCampus).trim()
        : null;
    const trimmedTimezone =
      String(timezone || '').trim() || 'Asia/Karachi (GMT+05:00)';
    const lat = Number.isFinite(Number(latitude)) ? Number(latitude) : 31.5204;
    const lng = Number.isFinite(Number(longitude)) ? Number(longitude) : 74.3587;
    const radius = Number.isFinite(Number(geofenceRadiusMeters))
      ? parseInt(geofenceRadiusMeters, 10)
      : 200;
    const daysJson = JSON.stringify(
      Array.isArray(workingDays) && workingDays.length > 0
        ? workingDays
        : ['M', 'T1', 'W', 'T2', 'F']
    );
    const workingDaysMonth = Number.isFinite(Number(standardWorkingDaysPerMonth))
      ? parseInt(standardWorkingDaysPerMonth, 10)
      : 22;
    const rateAbsent = Number.isFinite(Number(defaultAbsenceDeduction))
      ? Number(defaultAbsenceDeduction)
      : 5000;

    await connection.beginTransaction();

    const [existingRows] = await connection.query(
      'SELECT company_id FROM companies WHERE company_id = ? LIMIT 1',
      [companyId]
    );

    if (existingRows.length === 0) {
      await connection.query(
        `INSERT INTO companies
          (company_id, name, main_campus, timezone, geofence_lat, geofence_lng, geofence_radius_m, working_days, rate_absent, currency)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PKR')`,
        [
          companyId,
          trimmedName,
          trimmedCampus,
          trimmedTimezone,
          lat,
          lng,
          radius,
          daysJson,
          rateAbsent,
        ]
      );
    } else {
      await connection.query(
        `UPDATE companies
         SET name = ?,
             main_campus = ?,
             timezone = ?,
             geofence_lat = ?,
             geofence_lng = ?,
             geofence_radius_m = ?,
             working_days = ?,
             rate_absent = ?
         WHERE company_id = ?`,
        [
          trimmedName,
          trimmedCampus,
          trimmedTimezone,
          lat,
          lng,
          radius,
          daysJson,
          rateAbsent,
          companyId,
        ]
      );
    }

    // Keep company_name in sync on ADMIN user rows for this company
    await connection.query(
      "UPDATE users SET company_name = ? WHERE company_id = ? AND role = 'ADMIN'",
      [trimmedName, companyId]
    );

    // Upsert company-wide default in salary_configs (where user_email IS NULL)
    const [salaryRows] = await connection.query(
      'SELECT id FROM salary_configs WHERE company_id = ? AND user_email IS NULL LIMIT 1',
      [companyId]
    );

    if (salaryRows.length === 0) {
      await connection.query(
        `INSERT INTO salary_configs
          (id, company_id, user_email, base_salary, working_days_per_month, rate_absent)
         VALUES (?, ?, NULL, 150000.00, ?, ?)`,
        [crypto.randomUUID(), companyId, workingDaysMonth, rateAbsent]
      );
    } else {
      await connection.query(
        `UPDATE salary_configs
         SET working_days_per_month = ?, rate_absent = ?
         WHERE id = ?`,
        [workingDaysMonth, rateAbsent, salaryRows[0].id]
      );
    }

    await connection.commit();

    const [updatedCompanyRows] = await connection.query(
      'SELECT * FROM companies WHERE company_id = ? LIMIT 1',
      [companyId]
    );
    const [updatedSalaryRows] = await connection.query(
      'SELECT * FROM salary_configs WHERE company_id = ? AND user_email IS NULL LIMIT 1',
      [companyId]
    );

    return res.json({
      success: true,
      company: mapCompanyRow(updatedCompanyRows[0], updatedSalaryRows[0]),
    });
  } catch (err) {
    await connection.rollback();
    console.error('[adminController.updateCompanyProfile] Error:', err);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to save company profile' });
  } finally {
    connection.release();
  }
};

// GET /api/admin/users?companyId=CO-###
const getCompanyUsers = async (req, res) => {
  try {
    const companyId = req.query.companyId || req.params.companyId;
    if (!companyId) {
      return res
        .status(400)
        .json({ success: false, error: 'companyId is required' });
    }

    const [rows] = await pool.query(
      `SELECT u.*, c.name AS company_table_name, c.main_campus, m.name AS manager_name
       FROM users u
       LEFT JOIN companies c ON u.company_id = c.company_id
       LEFT JOIN users m ON u.manager_email = m.email
       WHERE u.company_id = ? AND u.role != 'ADMIN'
       ORDER BY u.created_at DESC`,
      [companyId]
    );

    return res.json({
      success: true,
      users: rows.map(mapUserRow),
    });
  } catch (err) {
    console.error('[adminController.getCompanyUsers] Error:', err);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to load company users' });
  }
};

// POST /api/admin/users
const createCompanyUser = async (req, res) => {
  try {
    const {
      companyId,
      name,
      email,
      password,
      phone,
      role,
      managerEmail,
      managerId,
      avatarKey,
      isActive,
    } = req.body;

    if (!companyId) {
      return res
        .status(400)
        .json({ success: false, error: 'companyId is required' });
    }
    if (!name || !String(name).trim()) {
      return res
        .status(400)
        .json({ success: false, error: 'Full Name is required' });
    }
    if (!email || !String(email).trim()) {
      return res
        .status(400)
        .json({ success: false, error: 'Valid work email address is required' });
    }
    if (!ALLOWED_PROVISION_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        error:
          'Company Admin can only provision EMPLOYEE, MANAGER, HR, or CLIENT accounts.',
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const trimmedName = String(name).trim();
    const userPassword = String(password || 'password123');
    const userPhone = phone ? String(phone).trim() : '+92 300 0000000';
    const userAvatar = avatarKey || 'dpEmpAli';
    const activeFlag = isActive === false ? 0 : 1;

    // Global email uniqueness check
    const [existing] = await pool.query(
      'SELECT email FROM users WHERE LOWER(email) = ? LIMIT 1',
      [normalizedEmail]
    );
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        error: `The email "${normalizedEmail}" is already registered to another user. Each user must have a unique email address.`,
      });
    }

    // Resolve manager_email when role is EMPLOYEE
    let resolvedManagerEmail = null;
    const candidateManager = managerEmail || managerId || null;
    if (role === 'EMPLOYEE' && candidateManager) {
      const [mgrRows] = await pool.query(
        "SELECT email FROM users WHERE LOWER(email) = LOWER(?) AND company_id = ? AND role = 'MANAGER' LIMIT 1",
        [String(candidateManager).trim(), companyId]
      );
      if (mgrRows.length > 0) {
        resolvedManagerEmail = mgrRows[0].email;
      }
    }

    await pool.query(
      `INSERT INTO users
        (email, company_id, manager_email, name, password, phone, role, company_name, avatar_key, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
      [
        normalizedEmail,
        companyId,
        resolvedManagerEmail,
        trimmedName,
        userPassword,
        userPhone,
        role,
        userAvatar,
        activeFlag,
      ]
    );

    const [createdRows] = await pool.query(
      `SELECT u.*, c.name AS company_table_name, c.main_campus, m.name AS manager_name
       FROM users u
       LEFT JOIN companies c ON u.company_id = c.company_id
       LEFT JOIN users m ON u.manager_email = m.email
       WHERE u.email = ?
       LIMIT 1`,
      [normalizedEmail]
    );

    return res.status(201).json({
      success: true,
      user: mapUserRow(createdRows[0]),
    });
  } catch (err) {
    console.error('[adminController.createCompanyUser] Error:', err);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to provision user' });
  }
};

// PUT /api/admin/users/:email
const updateCompanyUser = async (req, res) => {
  try {
    const targetEmail = decodeURIComponent(req.params.email || '')
      .trim()
      .toLowerCase();
    if (!targetEmail) {
      return res
        .status(400)
        .json({ success: false, error: 'Target user email is required' });
    }

    const [existingRows] = await pool.query(
      'SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1',
      [targetEmail]
    );
    if (existingRows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: 'User not found' });
    }

    const current = existingRows[0];
    if (current.role === 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Company Admin accounts cannot be modified via Employee Form.',
      });
    }

    const {
      name,
      email,
      password,
      phone,
      role,
      managerEmail,
      managerId,
      avatarKey,
      isActive,
    } = req.body;

    const updatedRole = role || current.role;
    if (!ALLOWED_PROVISION_ROLES.includes(updatedRole)) {
      return res.status(400).json({
        success: false,
        error:
          'Company Admin can only assign EMPLOYEE, MANAGER, HR, or CLIENT roles.',
      });
    }

    const newEmail = email
      ? String(email).trim().toLowerCase()
      : current.email.toLowerCase();

    if (newEmail !== current.email.toLowerCase()) {
      const [emailCheck] = await pool.query(
        'SELECT email FROM users WHERE LOWER(email) = ? LIMIT 1',
        [newEmail]
      );
      if (emailCheck.length > 0) {
        return res.status(409).json({
          success: false,
          error: `The email "${newEmail}" is already registered to another user. Each user must have a unique email address.`,
        });
      }
    }

    let resolvedManagerEmail = null;
    const candidateManager =
      managerEmail !== undefined
        ? managerEmail
        : managerId !== undefined
        ? managerId
        : current.manager_email;

    if (updatedRole === 'EMPLOYEE' && candidateManager) {
      const [mgrRows] = await pool.query(
        "SELECT email FROM users WHERE LOWER(email) = LOWER(?) AND company_id = ? AND role = 'MANAGER' LIMIT 1",
        [String(candidateManager).trim(), current.company_id]
      );
      if (mgrRows.length > 0) {
        resolvedManagerEmail = mgrRows[0].email;
      }
    }

    const updatedName = name ? String(name).trim() : current.name;
    const updatedPassword = password || current.password;
    const updatedPhone = phone !== undefined ? String(phone).trim() : current.phone;
    const updatedAvatar = avatarKey || current.avatar_key;
    const updatedActive =
      isActive !== undefined ? (isActive ? 1 : 0) : current.is_active;

    await pool.query(
      `UPDATE users
       SET email = ?,
           name = ?,
           password = ?,
           phone = ?,
           role = ?,
           manager_email = ?,
           avatar_key = ?,
           is_active = ?
       WHERE email = ?`,
      [
        newEmail,
        updatedName,
        updatedPassword,
        updatedPhone,
        updatedRole,
        resolvedManagerEmail,
        updatedAvatar,
        updatedActive,
        current.email,
      ]
    );

    const [updatedRows] = await pool.query(
      `SELECT u.*, c.name AS company_table_name, c.main_campus, m.name AS manager_name
       FROM users u
       LEFT JOIN companies c ON u.company_id = c.company_id
       LEFT JOIN users m ON u.manager_email = m.email
       WHERE u.email = ?
       LIMIT 1`,
      [newEmail]
    );

    return res.json({
      success: true,
      user: mapUserRow(updatedRows[0]),
    });
  } catch (err) {
    console.error('[adminController.updateCompanyUser] Error:', err);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to update user record' });
  }
};

// PATCH /api/admin/users/:email/status
const toggleUserActiveStatus = async (req, res) => {
  try {
    const targetEmail = decodeURIComponent(req.params.email || '')
      .trim()
      .toLowerCase();

    const [rows] = await pool.query(
      'SELECT email, is_active FROM users WHERE LOWER(email) = ? LIMIT 1',
      [targetEmail]
    );
    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: 'User not found' });
    }

    const current = rows[0];
    const nextStatus =
      req.body.isActive !== undefined
        ? req.body.isActive
          ? 1
          : 0
        : current.is_active
        ? 0
        : 1;

    await pool.query('UPDATE users SET is_active = ? WHERE email = ?', [
      nextStatus,
      current.email,
    ]);

    const [updatedRows] = await pool.query(
      `SELECT u.*, c.name AS company_table_name, c.main_campus, m.name AS manager_name
       FROM users u
       LEFT JOIN companies c ON u.company_id = c.company_id
       LEFT JOIN users m ON u.manager_email = m.email
       WHERE u.email = ?
       LIMIT 1`,
      [current.email]
    );

    return res.json({
      success: true,
      user: mapUserRow(updatedRows[0]),
    });
  } catch (err) {
    console.error('[adminController.toggleUserActiveStatus] Error:', err);
    return res
      .status(500)
      .json({ success: false, error: 'Failed to toggle user active status' });
  }
};

module.exports = {
  getCompanyProfile,
  updateCompanyProfile,
  getCompanyUsers,
  createCompanyUser,
  updateCompanyUser,
  toggleUserActiveStatus,
};
