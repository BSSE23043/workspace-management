const crypto = require('crypto');
const pool = require('../config/db');

const toApiTask = async (taskRow) => {
  const [assignees] = await pool.execute(
    `SELECT user_email FROM task_assignments WHERE task_id = ?`,
    [taskRow.id]
  );
  const [logs] = await pool.execute(
    `SELECT id, author_email, note, created_at FROM task_logs WHERE task_id = ? ORDER BY created_at ASC`,
    [taskRow.id]
  );
  const emails = assignees.map((a) => a.user_email);
  return {
    id: taskRow.id,
    code: taskRow.id,
    title: taskRow.title,
    description: taskRow.description,
    status: taskRow.status,
    progressPercent: taskRow.progress_percent,
    priority: 'MEDIUM',
    assignedToId: emails[0] || null,
    assignedToIds: emails,
    assignedToEmails: emails,
    assignedToNames: emails,
    internalDeadline: taskRow.internal_due_date,
    clientDeadline: taskRow.client_due_date,
    bufferDays: taskRow.internal_remaining_days,
    hasConflict: Boolean(taskRow.has_conflict),
    notes: '',
    logs: logs.map((l) => ({
      id: l.id,
      note: l.note,
      author: l.author_email,
      createdAt: new Date(l.created_at).getTime(),
      time: 'Just now',
    })),
  };
};

const listTasksByAssignee = async (userEmail) => {
  const [rows] = await pool.execute(
    `SELECT t.id, t.title, t.description, t.status, t.progress_percent,
            t.internal_due_date, t.client_due_date, t.internal_remaining_days, t.has_conflict
       FROM tasks t
       JOIN task_assignments ta ON ta.task_id = t.id
      WHERE ta.user_email = ?
      ORDER BY t.id DESC`,
    [userEmail]
  );
  const out = [];
  for (const r of rows) out.push(await toApiTask(r));
  return out;
};

const listAllTasks = async () => {
  const [rows] = await pool.execute(
    `SELECT id, title, description, status, progress_percent,
            internal_due_date, client_due_date, internal_remaining_days, has_conflict
       FROM tasks ORDER BY id DESC`
  );
  const out = [];
  for (const r of rows) out.push(await toApiTask(r));
  return out;
};

const updateTaskStatus = async ({ taskId, status, progressPercent, note, authorEmail }) => {
  await pool.execute(
    `UPDATE tasks SET status = ?, progress_percent = ? WHERE id = ?`,
    [status, progressPercent, taskId]
  );
  if (note) {
    const id = crypto.randomUUID();
    await pool.execute(
      `INSERT INTO task_logs (id, task_id, author_email, note) VALUES (?, ?, ?, ?)`,
      [id, taskId, authorEmail || null, note]
    );
  }
  const [rows] = await pool.execute(
    `SELECT id, title, description, status, progress_percent,
            internal_due_date, client_due_date, internal_remaining_days, has_conflict
       FROM tasks WHERE id = ?`,
    [taskId]
  );
  if (!rows[0]) return null;
  return toApiTask(rows[0]);
};

const addTaskLog = async ({ taskId, note, authorEmail }) => {
  const id = crypto.randomUUID();
  await pool.execute(
    `INSERT INTO task_logs (id, task_id, author_email, note) VALUES (?, ?, ?, ?)`,
    [id, taskId, authorEmail || null, note]
  );
  const [rows] = await pool.execute(
    `SELECT id, title, description, status, progress_percent,
            internal_due_date, client_due_date, internal_remaining_days, has_conflict
       FROM tasks WHERE id = ?`,
    [taskId]
  );
  if (!rows[0]) return null;
  return toApiTask(rows[0]);
};

module.exports = {
  listTasksByAssignee,
  listAllTasks,
  updateTaskStatus,
  addTaskLog,
};
