const crypto = require('crypto');
const { pool } = require('../config/db');

const TICKET_COLUMNS = `
  t.id,
  t.user_email,
  t.subject,
  t.description,
  t.event_date,
  t.status,
  t.created_at,
  u.name AS user_name
`;

const toTimestamp = (value) => (value ? new Date(value).getTime() : null);

const toApiTicket = (row, timeline) => ({
  id: row.id,
  userId: row.user_email,
  userName: row.user_name || '',
  subject: row.subject,
  explanation: row.description || '',
  date: row.event_date || (row.created_at ? String(row.created_at).slice(0, 10) : ''),
  status: row.status,
  createdAt: toTimestamp(row.created_at),
  timeline: timeline || [],
});

const getTimelinesByTicketIds = async (ticketIds) => {
  const timelines = new Map();
  if (ticketIds.length === 0) return timelines;

  const placeholders = ticketIds.map(() => '?').join(', ');
  const [rows] = await pool.execute(
    `SELECT m.id, m.ticket_id, m.author_email, m.body, m.created_at,
            u.name AS author_name
       FROM ticket_messages m
       LEFT JOIN users u ON u.email = m.author_email
      WHERE m.ticket_id IN (${placeholders})
      ORDER BY m.created_at ASC, m.id ASC`,
    ticketIds
  );

  for (const row of rows) {
    if (!timelines.has(row.ticket_id)) timelines.set(row.ticket_id, []);
    timelines.get(row.ticket_id).push({
      sender: row.author_name || row.author_email,
      time: 'Just now',
      createdAt: toTimestamp(row.created_at),
      message: row.body,
    });
  }

  return timelines;
};

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

const listTicketsByUser = async (userEmail) => {
  const [rows] = await pool.execute(
    `SELECT ${TICKET_COLUMNS}
       FROM hr_tickets t
       JOIN users u ON u.email = t.user_email
      WHERE t.user_email = ?
      ORDER BY t.created_at DESC, t.id DESC`,
    [userEmail]
  );

  const timelines = await getTimelinesByTicketIds(rows.map((row) => row.id));
  return rows.map((row) => toApiTicket(row, timelines.get(row.id) || []));
};

const findTicketById = async (ticketId) => {
  const [rows] = await pool.execute(
    `SELECT ${TICKET_COLUMNS}
       FROM hr_tickets t
       JOIN users u ON u.email = t.user_email
      WHERE t.id = ?
      LIMIT 1`,
    [ticketId]
  );
  if (!rows[0]) return null;

  const timelines = await getTimelinesByTicketIds([ticketId]);
  return toApiTicket(rows[0], timelines.get(ticketId) || []);
};

const nextTicketId = async (connection) => {
  const [rows] = await connection.execute(
    `SELECT MAX(CAST(SUBSTRING(id, 5) AS UNSIGNED)) AS max_num
       FROM hr_tickets
      WHERE id LIKE 'TKT-%'`
  );
  const highest = rows[0] && rows[0].max_num ? Number(rows[0].max_num) : 100;
  return `TKT-${String(highest + 1).padStart(3, '0')}`;
};

const createTicket = async ({ userEmail, subject, description, eventDate }) => {
  const connection = await pool.getConnection();
  let ticketId;

  try {
    await connection.beginTransaction();
    ticketId = await nextTicketId(connection);

    await connection.execute(
      `INSERT INTO hr_tickets (id, user_email, subject, description, event_date, status)
       VALUES (?, ?, ?, ?, ?, 'OPEN')`,
      [ticketId, userEmail, subject, description, eventDate]
    );

    await connection.execute(
      `INSERT INTO ticket_messages (id, ticket_id, author_email, body)
       VALUES (?, ?, ?, ?)`,
      [crypto.randomUUID(), ticketId, userEmail, description]
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return findTicketById(ticketId);
};

const addTicketMessage = async ({ ticketId, authorEmail, message }) => {
  await pool.execute(
    `INSERT INTO ticket_messages (id, ticket_id, author_email, body)
     VALUES (?, ?, ?, ?)`,
    [crypto.randomUUID(), ticketId, authorEmail, message]
  );
  return findTicketById(ticketId);
};

module.exports = {
  findUserByEmail,
  listTicketsByUser,
  findTicketById,
  createTicket,
  addTicketMessage,
};
