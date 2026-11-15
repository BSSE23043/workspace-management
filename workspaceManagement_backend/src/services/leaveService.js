const crypto = require('crypto');
const pool = require('../config/db');

const DAY_MS = 1000 * 60 * 60 * 24;

const countDays = (startDate, endDate) => {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  return Math.max(1, Math.round((end - start) / DAY_MS) + 1);
};

const toApi = (row) => ({
  id: row.id,
  userEmail: row.user_email,
  startDate: row.start_date,
  endDate: row.end_date,
  reason: row.reason,
  status: row.status,
  daysCount: countDays(row.start_date, row.end_date),
});

const findUserByEmail = async (email) => {
  const [rows] = await pool.execute(
    `SELECT email, name, role, company_id, is_active
       FROM users
      WHERE email = ?
      LIMIT 1`,
    [email]
  );
  return rows[0] || null;
};

const listLeavesByUser = async (userEmail) => {
  const [rows] = await pool.execute(
    `SELECT id, user_email, start_date, end_date, reason, status
       FROM leave_requests
      WHERE user_email = ?
      ORDER BY start_date DESC, id DESC`,
    [userEmail]
  );
  return rows.map(toApi);
};

const findOverlappingLeave = async (userEmail, startDate, endDate) => {
  const [rows] = await pool.execute(
    `SELECT id, start_date, end_date
       FROM leave_requests
      WHERE user_email = ?
        AND status <> 'REJECTED'
        AND start_date <= ?
        AND end_date >= ?
      LIMIT 1`,
    [userEmail, endDate, startDate]
  );
  return rows[0] || null;
};

const createLeave = async ({ userEmail, startDate, endDate, reason }) => {
  const id = crypto.randomUUID();
  await pool.execute(
    `INSERT INTO leave_requests (id, user_email, start_date, end_date, reason, status)
     VALUES (?, ?, ?, ?, ?, 'PENDING')`,
    [id, userEmail, startDate, endDate, reason]
  );

  const [rows] = await pool.execute(
    `SELECT id, user_email, start_date, end_date, reason, status
       FROM leave_requests
      WHERE id = ?`,
    [id]
  );
  return toApi(rows[0]);
};

module.exports = {
  countDays,
  findUserByEmail,
  listLeavesByUser,
  findOverlappingLeave,
  createLeave,
};
