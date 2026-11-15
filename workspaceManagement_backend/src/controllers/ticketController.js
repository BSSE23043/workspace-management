const HttpError = require('../utils/httpError');
const ticketService = require('../services/ticketService');

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
const SUBJECT_MAX_LENGTH = 200;
const CLOSED_STATUSES = ['RESOLVED', 'REJECTED'];

const normalizeEmail = (value) =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

const isValidDateOnly = (value) => {
  if (typeof value !== 'string' || !DATE_ONLY_RE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

const listMyTickets = async (req, res) => {
  const userEmail = normalizeEmail(req.query.userEmail);
  if (!userEmail) {
    throw new HttpError(400, 'userEmail query parameter is required');
  }

  const user = await ticketService.findUserByEmail(userEmail);
  if (!user) {
    throw new HttpError(404, `No user found with email ${userEmail}`);
  }

  const tickets = await ticketService.listTicketsByUser(userEmail);
  res.json({ data: tickets });
};

const createHrTicket = async (req, res) => {
  const { userEmail, subject, description, eventDate } = req.body || {};
  const email = normalizeEmail(userEmail);
  const trimmedSubject = typeof subject === 'string' ? subject.trim() : '';
  const trimmedDescription = typeof description === 'string' ? description.trim() : '';

  if (!email) {
    throw new HttpError(400, 'userEmail is required');
  }
  if (!trimmedSubject) {
    throw new HttpError(400, 'subject is required');
  }
  if (trimmedSubject.length > SUBJECT_MAX_LENGTH) {
    throw new HttpError(400, `subject must be at most ${SUBJECT_MAX_LENGTH} characters`);
  }
  if (!trimmedDescription) {
    throw new HttpError(400, 'description is required');
  }
  if (!isValidDateOnly(eventDate)) {
    throw new HttpError(400, 'eventDate must be a valid date in YYYY-MM-DD format');
  }

  const user = await ticketService.findUserByEmail(email);
  if (!user) {
    throw new HttpError(404, `No user found with email ${email}`);
  }
  if (!user.is_active) {
    throw new HttpError(403, 'This account is deactivated');
  }

  const ticket = await ticketService.createTicket({
    userEmail: email,
    subject: trimmedSubject,
    description: trimmedDescription,
    eventDate,
  });

  res.status(201).json({ data: ticket });
};

const addMessage = async (req, res) => {
  const { ticketId } = req.params;
  const { authorEmail, message } = req.body || {};
  const email = normalizeEmail(authorEmail);
  const trimmedMessage = typeof message === 'string' ? message.trim() : '';

  if (!email) {
    throw new HttpError(400, 'authorEmail is required');
  }
  if (!trimmedMessage) {
    throw new HttpError(400, 'message is required');
  }

  const user = await ticketService.findUserByEmail(email);
  if (!user) {
    throw new HttpError(404, `No user found with email ${email}`);
  }

  const ticket = await ticketService.findTicketById(ticketId);
  if (!ticket) {
    throw new HttpError(404, 'Ticket not found');
  }
  if (ticket.userId !== email) {
    throw new HttpError(403, 'You can only reply to your own tickets');
  }
  if (CLOSED_STATUSES.includes(ticket.status)) {
    throw new HttpError(400, 'This ticket is closed');
  }

  const updated = await ticketService.addTicketMessage({
    ticketId,
    authorEmail: email,
    message: trimmedMessage,
  });

  res.status(201).json({ data: updated });
};

module.exports = {
  listMyTickets,
  createHrTicket,
  addMessage,
};
