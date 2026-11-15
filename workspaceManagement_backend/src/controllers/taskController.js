const HttpError = require('../utils/httpError');
const taskService = require('../services/taskService');

const normalizeEmail = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : '');

const listMyTasks = async (req, res) => {
  const email = normalizeEmail(req.query.userEmail);
  if (!email) throw new HttpError(400, 'userEmail query parameter is required');
  const data = await taskService.listTasksByAssignee(email);
  res.json({ data });
};

const updateStatus = async (req, res) => {
  const { id } = req.params;
  const { status, progressPercent, note, authorEmail } = req.body || {};
  const updated = await taskService.updateTaskStatus({
    taskId: id,
    status: status || 'IN_PROGRESS',
    progressPercent: Number(progressPercent) || 0,
    note,
    authorEmail: normalizeEmail(authorEmail),
  });
  if (!updated) throw new HttpError(404, 'Task not found');
  res.json({ data: updated });
};

const addLog = async (req, res) => {
  const { id } = req.params;
  const { note, authorEmail } = req.body || {};
  if (typeof note !== 'string' || !note.trim()) throw new HttpError(400, 'note is required');
  const updated = await taskService.addTaskLog({
    taskId: id,
    note: note.trim(),
    authorEmail: normalizeEmail(authorEmail),
  });
  if (!updated) throw new HttpError(404, 'Task not found');
  res.status(201).json({ data: updated });
};

module.exports = { listMyTasks, updateStatus, addLog };
