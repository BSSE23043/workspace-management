// User sync API.
//
// The final schema stores identity in `users` (PK = email) and companies in
// `companies`. The mobile app still keeps its account list in AsyncStorage for
// authentication, so this endpoint mirrors those accounts into MySQL before any
// task is created (tasks have FOREIGN KEYs to users/companies).
//
// POST /api/users/sync  { users: [...] }

const express = require('express');
const { pool } = require('../config/db');

const router = express.Router();

const ROLES = ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE', 'CLIENT'];
const DEFAULT_COMPANY_ID = 'CO-DEFAULT';

const normaliseEmail = (value) => (value ? String(value).trim().toLowerCase() : '');
const trimTo = (value, max) => (value ? String(value).trim().slice(0, max) : null);

router.post('/sync', async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const incoming = Array.isArray(req.body.users) ? req.body.users : [];

    // Last-wins de-duplication by email.
    const byEmail = new Map();
    incoming.forEach((raw) => {
      const email = normaliseEmail(raw?.email);
      const role = String(raw?.role || '').trim().toUpperCase();
      if (!email || !ROLES.includes(role)) return;

      byEmail.set(email, {
        email,
        role,
        id: raw.id ? String(raw.id) : null,
        name: trimTo(raw.name || email, 120),
        password: raw.password ? String(raw.password) : 'password123',
        phone: trimTo(raw.phone, 30),
        companyId: trimTo(raw.companyId, 20) || DEFAULT_COMPANY_ID,
        companyName: trimTo(raw.companyName, 150),
        avatarKey: trimTo(raw.avatarKey || raw.avatarCustomUri, 255),
        isActive: raw.isActive === false ? 0 : 1,
        managerId: raw.managerId ? String(raw.managerId) : null,
      });
    });

    const users = Array.from(byEmail.values());
    if (users.length === 0) {
      return res.json({ synced: 0 });
    }

    // Companies must exist before users (FK users.company_id -> companies).
    const companies = new Map();
    users.forEach((user) => {
      if (!companies.has(user.companyId)) {
        companies.set(user.companyId, user.companyName || `Company ${user.companyId}`);
      } else if (user.role === 'ADMIN' && user.companyName) {
        // Prefer the real company name supplied on the Admin account.
        companies.set(user.companyId, user.companyName);
      }
    });

    await connection.beginTransaction();

    // Insert companies; never overwrite a profile an Admin already saved.
    for (const [companyId, name] of companies.entries()) {
      await connection.query(
        `INSERT INTO companies (company_id, name)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE company_id = VALUES(company_id)`,
        [companyId, name]
      );
    }

    // First pass: upsert users without manager_email (FK ordering safe).
    for (const user of users) {
      await connection.query(
        `INSERT INTO users
           (email, company_id, manager_email, name, password, phone, role,
            company_name, avatar_key, is_active)
         VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           company_id = VALUES(company_id),
           name = VALUES(name),
           password = VALUES(password),
           phone = VALUES(phone),
           role = VALUES(role),
           company_name = VALUES(company_name),
           avatar_key = VALUES(avatar_key),
           is_active = VALUES(is_active)`,
        [
          user.email,
          user.companyId,
          user.name,
          user.password,
          user.phone,
          user.role,
          user.companyName,
          user.avatarKey,
          user.isActive,
        ]
      );
    }

    // Second pass: resolve managerId (app-level) to manager_email (DB FK).
    const emailById = new Map();
    users.forEach((user) => {
      if (user.id) emailById.set(user.id, user.email);
    });

    for (const user of users) {
      const managerEmail =
        user.role === 'EMPLOYEE' && user.managerId ? emailById.get(user.managerId) || null : null;

      await connection.query('UPDATE users SET manager_email = ? WHERE email = ?', [
        managerEmail,
        user.email,
      ]);
    }

    await connection.commit();
    res.json({ synced: users.length });
  } catch (err) {
    try {
      await connection.rollback();
    } catch (rollbackErr) {
      // ignore
    }
    next(err);
  } finally {
    connection.release();
  }
});

module.exports = router;
