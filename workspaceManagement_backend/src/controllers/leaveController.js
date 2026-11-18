const HttpError = require('../utils/httpError');
const leaveService = require('../services/leaveService');

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

const normalizeEmail = (value) =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

const isValidDateOnly = (value) => {
  if (typeof value !== 'string' || !DATE_ONLY_RE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

const listMyLeaves = async (req, res) => {
  const userEmail = normalizeEmail(req.query.userEmail);
  if (!userEmail) {
    throw new HttpError(400, 'userEmail query parameter is required');
  }

  const user = await leaveService.findUserByEmail(userEmail);
  if (!user) {
    throw new HttpError(404, `No user found with email ${userEmail}`);
  }

  const leaves = await leaveService.listLeavesByUser(userEmail);
  res.json({ data: leaves });
};

const createLeaveRequest = async (req, res) => {
  const { userEmail, startDate, endDate, reason } = req.body || {};
  const email = normalizeEmail(userEmail);

  if (!email) {
    throw new HttpError(400, 'userEmail is required');
  }
  if (!isValidDateOnly(startDate) || !isValidDateOnly(endDate)) {
    throw new HttpError(400, 'startDate and endDate must be valid dates in YYYY-MM-DD format');
  }
  if (startDate > endDate) {
    throw new HttpError(400, 'startDate cannot be after endDate');
  }
  if (typeof reason !== 'string' || !reason.trim()) {
    throw new HttpError(400, 'reason is required');
  }

  const user = await leaveService.findUserByEmail(email);
  if (!user) {
    throw new HttpError(404, `No user found with email ${email}`);
  }
  if (!user.is_active) {
    throw new HttpError(403, 'This account is deactivated');
  }

  const overlap = await leaveService.findOverlappingLeave(email, startDate, endDate);
  if (overlap) {
    throw new HttpError(
      409,
      `An overlapping leave request already exists for ${overlap.start_date} to ${overlap.end_date}`
    );
  }

  const leave = await leaveService.createLeave({
    userEmail: email,
    startDate,
    endDate,
    reason: reason.trim(),
  });

  res.status(201).json({ data: leave });
};

module.exports = {
  listMyLeaves,
  createLeaveRequest,
};
