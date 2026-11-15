const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const taskController = require('../controllers/taskController');

const router = express.Router();

router.get('/', asyncHandler(taskController.listMyTasks));
router.put('/:id/status', asyncHandler(taskController.updateStatus));
router.post('/:id/logs', asyncHandler(taskController.addLog));
// Task domain REST API.
//
// Uses the tables from src/schema/wms_schema.sql:
//   tasks, task_assignments, task_logs, users
//
// task metadata now has real columns (priority, is_milestone_synced,
// created_at) and the timeline lives in task_logs — no JSON workaround.
// Rows are returned in the camelCase shape the React Native app already uses.

const express = require('express');
const crypto = require('crypto');
const pool = require('../config/db');

const router = express.Router();

const TASK_STATUSES = ['TO_DO', 'IN_PROGRESS', 'COMPLETED'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

// MySQL DATE/DATETIME columns come back as strings (dateStrings: true).
// Convert DATETIME to an ISO-ish value the mobile app can parse with new Date().
const toIso = (value) => (value ? String(value).replace(' ', 'T') : null);

const asDateOrNull = (value) => {
  if (!value) return null;
  const str = String(value).trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(str) ? str : null;
};

const normaliseEmail = (value) => (value ? String(value).trim().toLowerCase() : '');

const computeBufferDays = (internalDeadline, clientDeadline) => {
  if (!internalDeadline || !clientDeadline) return 0;
  const internal = new Date(`${internalDeadline}T00:00:00`).getTime();
  const client = new Date(`${clientDeadline}T00:00:00`).getTime();
  return Math.round((client - internal) / (24 * 60 * 60 * 1000));
};

const httpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const normaliseEmailList = (value) =>
  Array.from(
    new Set((Array.isArray(value) ? value : []).map(normaliseEmail).filter(Boolean))
  );

const buildConflictDetails = (
  title,
  internalDeadline,
  clientDeadline,
  bufferDays,
  hasConflict
) =>
  hasConflict
    ? `${title} • ${Math.abs(bufferDays)}d slack • Internal Employee Due: ${internalDeadline} vs External Client Due: ${clientDeadline}`
    : null;

// Ensures a log author exists in `users` (task_logs.author_email is a FK).
// Falls back to the task creator so logging can never block the real action.
const resolveAuthorEmail = async (executor, authorEmail, fallbackEmail) => {
  const email = normaliseEmail(authorEmail);
  if (email) {
    const [rows] = await executor.query('SELECT email FROM users WHERE email = ? LIMIT 1', [
      email,
    ]);
    if (rows.length > 0) return email;
  }

  const fallback = normaliseEmail(fallbackEmail);
  if (!fallback) return null;
  const [rows] = await executor.query('SELECT email FROM users WHERE email = ? LIMIT 1', [
    fallback,
  ]);
  return rows.length > 0 ? fallback : null;
};

const insertTaskLog = async (executor, { taskId, authorEmail, authorName, note }) => {
  if (!note) return;
  await executor.query(
    'INSERT INTO task_logs (id, task_id, author_email, author_name, note) VALUES (?, ?, ?, ?, ?)',
    [crypto.randomUUID(), taskId, authorEmail || null, authorName || null, note]
  );
};

const mapLog = (row) => ({
  id: row.id,
  taskId: row.taskId,
  authorEmail: row.authorEmail || null,
  author: row.authorName || row.authorEmail || null,
  note: row.note,
  createdAt: toIso(row.createdAt),
  time: toIso(row.createdAt),
});

const mapTask = (row, assignments = [], logs = []) => {
  const bufferDays = computeBufferDays(row.internalDueDate, row.clientDeadline);
  const hasConflict = Boolean(row.hasConflict) || bufferDays < 0;

  return {
    id: row.id,
    code: `#${row.id}`,
    title: row.title,
    description: row.description || '',
    status: row.status,
    priority: row.priority || 'MEDIUM',
    progressPercent: Number(row.progressPercent) || 0,
    internalDeadline: row.internalDueDate,
    clientDeadline: row.clientDeadline,
    internalRemainingDays: row.internalRemainingDays,
    bufferDays,
    hasConflict,
    conflictDetails: buildConflictDetails(
      row.title,
      row.internalDueDate,
      row.clientDeadline,
      bufferDays,
      hasConflict
    ),
    isMilestoneSynced: Boolean(row.isMilestoneSynced),
    createdByEmail: row.createdByEmail,
    createdByName: row.createdByName || null,
    createdAt: toIso(row.createdAt),
    assignedToEmails: assignments.map((a) => a.email),
    assignedToNames: assignments.map((a) => a.name || a.email),
    logs,
  };
};

const taskSelect = `
  SELECT
    t.id,
    t.created_by_email AS createdByEmail,
    creator.name AS createdByName,
    t.title,
    t.description,
    t.status,
    t.priority,
    t.progress_percent AS progressPercent,
    t.internal_due_date AS internalDueDate,
    t.client_due_date AS clientDeadline,
    t.internal_remaining_days AS internalRemainingDays,
    t.has_conflict AS hasConflict,
    t.is_milestone_synced AS isMilestoneSynced,
    t.created_at AS createdAt
  FROM tasks t
  LEFT JOIN users creator ON creator.email = t.created_by_email
`;

const hydrateTasks = async (rows) => {
  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.id);

  const [assignmentRows] = await pool.query(
    `SELECT ta.task_id AS taskId, ta.user_email AS email, u.name
     FROM task_assignments ta
     LEFT JOIN users u ON u.email = ta.user_email
     WHERE ta.task_id IN (?)
     ORDER BY u.name ASC`,
    [ids]
  );

  const [logRows] = await pool.query(
    `SELECT id, task_id AS taskId, author_email AS authorEmail, author_name AS authorName,
            note, created_at AS createdAt
     FROM task_logs
     WHERE task_id IN (?)
     ORDER BY created_at DESC, id DESC`,
    [ids]
  );

  const assignmentsByTask = new Map();
  assignmentRows.forEach((assignment) => {
    if (!assignmentsByTask.has(assignment.taskId)) {
      assignmentsByTask.set(assignment.taskId, []);
    }
    assignmentsByTask.get(assignment.taskId).push(assignment);
  });

  const logsByTask = new Map();
  logRows.forEach((log) => {
    if (!logsByTask.has(log.taskId)) logsByTask.set(log.taskId, []);
    logsByTask.get(log.taskId).push(mapLog(log));
  });

  return rows.map((row) =>
    mapTask(row, assignmentsByTask.get(row.id) || [], logsByTask.get(row.id) || [])
  );
};

const getTaskById = async (executor, taskId) => {
  const [rows] = await executor.query(`${taskSelect} WHERE t.id = ?`, [taskId]);
  if (rows.length === 0) return null;
  const [task] = await hydrateTasks(rows);
  return task;
};

const nextTaskId = async (executor) => {
  const [rows] = await executor.query(
    "SELECT COALESCE(MAX(CAST(SUBSTRING(id, 5) AS UNSIGNED)), 0) AS maxNum FROM tasks WHERE id LIKE 'TSK-%'"
  );
  return `TSK-${String(Number(rows[0].maxNum) + 1).padStart(3, '0')}`;
};

const orderByNewestTask =
  'ORDER BY t.created_at DESC, CAST(SUBSTRING(t.id, 5) AS UNSIGNED) DESC';

// ---------------------------------------------------------------------------
// GET /api/tasks?companyId=CO-123&assignedToEmail=a@b.com
// ---------------------------------------------------------------------------
router.get('/', async (req, res, next) => {
  try {
    const { companyId, assignedToEmail } = req.query;
    const where = [];
    const params = [];

    if (companyId) {
      where.push(`(
        EXISTS (
          SELECT 1 FROM users cu
          WHERE cu.email = t.created_by_email AND cu.company_id = ?
        )
        OR EXISTS (
          SELECT 1 FROM task_assignments cta
          JOIN users cau ON cau.email = cta.user_email
          WHERE cta.task_id = t.id AND cau.company_id = ?
        )
      )`);
      params.push(companyId, companyId);
    }

    if (assignedToEmail) {
      where.push(
        'EXISTS (SELECT 1 FROM task_assignments ata WHERE ata.task_id = t.id AND ata.user_email = ?)'
      );
      params.push(normaliseEmail(assignedToEmail));
    }

    const sql = `${taskSelect} ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ${orderByNewestTask}`;

    const [rows] = await pool.query(sql, params);
    const tasks = await hydrateTasks(rows);
    res.json({ tasks });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/tasks/:id
// ---------------------------------------------------------------------------
router.get('/:id', async (req, res, next) => {
  try {
    const task = await getTaskById(pool, req.params.id);
    if (!task) throw httpError(404, 'Task not found.');
    res.json({ task });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/tasks
// body: {
//   createdByEmail, title, description, priority,
//   internalDeadline, clientDeadline, assignedToEmails: string[]
// }
// ---------------------------------------------------------------------------
router.post('/', async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const createdByEmail = normaliseEmail(req.body.createdByEmail);
    const title = String(req.body.title || '').trim();
    const description = req.body.description ? String(req.body.description) : '';
    const priority = PRIORITIES.includes(req.body.priority) ? req.body.priority : 'MEDIUM';
    const status = TASK_STATUSES.includes(req.body.status) ? req.body.status : 'TO_DO';
    const internalDeadline = asDateOrNull(req.body.internalDeadline);
    const clientDeadline = asDateOrNull(req.body.clientDeadline);
    const assignedToEmails = normaliseEmailList(req.body.assignedToEmails);

    if (!createdByEmail) throw httpError(400, 'createdByEmail is required.');
    if (!title) throw httpError(400, 'Task title is required.');
    if (assignedToEmails.length === 0) {
      throw httpError(400, 'At least one assignee (assignedToEmails) is required.');
    }

    const [creatorRows] = await connection.query(
      'SELECT email, name FROM users WHERE email = ? LIMIT 1',
      [createdByEmail]
    );
    if (creatorRows.length === 0) {
      throw httpError(400, `Creator ${createdByEmail} is not registered in the database.`);
    }

    const [assigneeRows] = await connection.query(
      'SELECT email, name FROM users WHERE email IN (?)',
      [assignedToEmails]
    );
    if (assigneeRows.length !== assignedToEmails.length) {
      const found = new Set(assigneeRows.map((row) => row.email));
      const missing = assignedToEmails.filter((email) => !found.has(email));
      throw httpError(400, `Assignee(s) not registered in the database: ${missing.join(', ')}`);
    }

    await connection.beginTransaction();

    const taskId = await nextTaskId(connection);
    const creator = creatorRows[0];
    const assigneeNames = assigneeRows.map((row) => row.name || row.email);

    await connection.query(
      `INSERT INTO tasks
        (id, created_by_email, title, description, status, priority,
         progress_percent, internal_due_date, client_due_date, internal_remaining_days)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, DATEDIFF(?, CURDATE()))`,
      [
        taskId,
        createdByEmail,
        title,
        description || `Task assigned by ${creator.name || createdByEmail}`,
        status,
        priority,
        internalDeadline,
        clientDeadline,
        internalDeadline,
      ]
    );

    await Promise.all(
      assignedToEmails.map((email) =>
        connection.query(
          'INSERT INTO task_assignments (task_id, user_email) VALUES (?, ?)',
          [taskId, email]
        )
      )
    );

    await insertTaskLog(connection, {
      taskId,
      authorEmail: createdByEmail,
      authorName: creator.name || null,
      note: `Task created and assigned to ${assigneeNames.join(', ')} by ${
        creator.name || 'Management'
      }.`,
    });

    await connection.commit();

    const task = await getTaskById(pool, taskId);
    res.status(201).json({ task });
  } catch (err) {
    try {
      await connection.rollback();
    } catch (rollbackErr) {
      // ignore — the original error is more useful
    }
    next(err);
  } finally {
    connection.release();
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/tasks/:id
// body: { title, description, priority, internalDeadline, clientDeadline,
//         assignedToEmails, authorEmail, authorName, note }
// ---------------------------------------------------------------------------
router.patch('/:id', async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const taskId = req.params.id;

    await connection.beginTransaction();

    const [existingRows] = await connection.query(
      'SELECT * FROM tasks WHERE id = ? LIMIT 1 FOR UPDATE',
      [taskId]
    );
    if (existingRows.length === 0) throw httpError(404, 'Task not found.');
    const existing = existingRows[0];

    const fields = [];
    const values = [];

    if (req.body.title !== undefined) {
      const title = String(req.body.title).trim();
      if (!title) throw httpError(400, 'Task title cannot be empty.');
      fields.push('title = ?');
      values.push(title);
    }

    if (req.body.description !== undefined) {
      fields.push('description = ?');
      values.push(req.body.description ? String(req.body.description) : null);
    }

    if (req.body.priority !== undefined) {
      if (!PRIORITIES.includes(req.body.priority)) throw httpError(400, 'Invalid priority.');
      fields.push('priority = ?');
      values.push(req.body.priority);
    }

    if (req.body.internalDeadline !== undefined) {
      const internalDeadline = asDateOrNull(req.body.internalDeadline);
      fields.push('internal_due_date = ?', 'internal_remaining_days = DATEDIFF(?, CURDATE())');
      values.push(internalDeadline, internalDeadline);
    }

    if (req.body.clientDeadline !== undefined) {
      fields.push('client_due_date = ?');
      values.push(asDateOrNull(req.body.clientDeadline));
    }

    let assignedToEmails = null;
    if (req.body.assignedToEmails !== undefined) {
      assignedToEmails = normaliseEmailList(req.body.assignedToEmails);
      if (assignedToEmails.length === 0) {
        throw httpError(400, 'At least one assignee is required.');
      }
      const [assigneeRows] = await connection.query(
        'SELECT email FROM users WHERE email IN (?)',
        [assignedToEmails]
      );
      if (assigneeRows.length !== assignedToEmails.length) {
        const found = new Set(assigneeRows.map((row) => row.email));
        const missing = assignedToEmails.filter((email) => !found.has(email));
        throw httpError(400, `Assignee(s) not registered in the database: ${missing.join(', ')}`);
      }
    }

    if (fields.length > 0) {
      values.push(taskId);
      await connection.query(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, values);
    }

    if (assignedToEmails) {
      await connection.query('DELETE FROM task_assignments WHERE task_id = ?', [taskId]);
      await Promise.all(
        assignedToEmails.map((email) =>
          connection.query('INSERT INTO task_assignments (task_id, user_email) VALUES (?, ?)', [
            taskId,
            email,
          ])
        )
      );
    }

    const authorEmail = await resolveAuthorEmail(
      connection,
      req.body.authorEmail,
      existing.created_by_email
    );
    await insertTaskLog(connection, {
      taskId,
      authorEmail,
      authorName: req.body.authorName || null,
      note: req.body.note || 'Manager edited task parameters and deadlines.',
    });

    await connection.commit();

    const task = await getTaskById(pool, taskId);
    res.json({ task });
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

// ---------------------------------------------------------------------------
// PATCH /api/tasks/:id/status
// body: { status, progressPercent, note, authorEmail, authorName }
// ---------------------------------------------------------------------------
router.patch('/:id/status', async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const taskId = req.params.id;

    await connection.beginTransaction();

    const [rows] = await connection.query(
      'SELECT * FROM tasks WHERE id = ? LIMIT 1 FOR UPDATE',
      [taskId]
    );
    if (rows.length === 0) throw httpError(404, 'Task not found.');
    const existing = rows[0];

    const fields = [];
    const values = [];

    if (req.body.status !== undefined) {
      if (!TASK_STATUSES.includes(req.body.status)) throw httpError(400, 'Invalid task status.');
      fields.push('status = ?');
      values.push(req.body.status);
    }

    if (req.body.progressPercent !== undefined) {
      const progress = Number(req.body.progressPercent);
      if (Number.isNaN(progress) || progress < 0 || progress > 100) {
        throw httpError(400, 'progressPercent must be a number between 0 and 100.');
      }
      fields.push('progress_percent = ?');
      values.push(Math.round(progress));
    }

    if (fields.length === 0 && !req.body.note) {
      throw httpError(400, 'Nothing to update.');
    }

    if (fields.length > 0) {
      values.push(taskId);
      await connection.query(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, values);
    }

    if (req.body.note) {
      const authorEmail = await resolveAuthorEmail(
        connection,
        req.body.authorEmail,
        existing.created_by_email
      );
      await insertTaskLog(connection, {
        taskId,
        authorEmail,
        authorName: req.body.authorName || null,
        note: String(req.body.note),
      });
    }

    await connection.commit();

    const task = await getTaskById(pool, taskId);
    res.json({ task });
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

// ---------------------------------------------------------------------------
// PATCH /api/tasks/:id/milestone-sync
// body: { isSynced, authorEmail, authorName }
// ---------------------------------------------------------------------------
router.patch('/:id/milestone-sync', async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const taskId = req.params.id;
    const isSynced = Boolean(req.body.isSynced);

    await connection.beginTransaction();

    const [rows] = await connection.query(
      'SELECT * FROM tasks WHERE id = ? LIMIT 1 FOR UPDATE',
      [taskId]
    );
    if (rows.length === 0) throw httpError(404, 'Task not found.');
    const existing = rows[0];

    await connection.query(
      `UPDATE tasks
       SET is_milestone_synced = ?, status = ?, progress_percent = ?
       WHERE id = ?`,
      [isSynced ? 1 : 0, isSynced ? 'COMPLETED' : 'IN_PROGRESS', isSynced ? 100 : 75, taskId]
    );

    const authorEmail = await resolveAuthorEmail(
      connection,
      req.body.authorEmail,
      existing.created_by_email
    );
    await insertTaskLog(connection, {
      taskId,
      authorEmail,
      authorName: req.body.authorName || null,
      note: isSynced
        ? 'Marked as Ready for Client Milestone Sync'
        : 'Reverted Client Milestone Sync status',
    });

    await connection.commit();

    const task = await getTaskById(pool, taskId);
    res.json({ task });
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

// ---------------------------------------------------------------------------
// POST /api/tasks/:id/logs
// body: { note, authorEmail, authorName }
// ---------------------------------------------------------------------------
router.post('/:id/logs', async (req, res, next) => {
  try {
    const taskId = req.params.id;
    const note = String(req.body.note || '').trim();
    if (!note) throw httpError(400, 'Log note is required.');

    const [rows] = await pool.query('SELECT created_by_email FROM tasks WHERE id = ? LIMIT 1', [
      taskId,
    ]);
    if (rows.length === 0) throw httpError(404, 'Task not found.');

    const authorEmail = await resolveAuthorEmail(
      pool,
      req.body.authorEmail,
      rows[0].created_by_email
    );
    await insertTaskLog(pool, {
      taskId,
      authorEmail,
      authorName: req.body.authorName || null,
      note,
    });

    const task = await getTaskById(pool, taskId);
    res.status(201).json({ task });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
