const HttpError = require('../utils/httpError');
const requirementService = require('../services/requirementService');

const normalizeEmail = (value) =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

const listByClient = async (req, res) => {
  const clientEmail = normalizeEmail(req.query.clientEmail);
  if (!clientEmail) {
    throw new HttpError(400, 'clientEmail query parameter is required');
  }
  const data = await requirementService.listRequirementsByClient(clientEmail);
  res.json({ data });
};

const addReply = async (req, res) => {
  const { id } = req.params;
  const { authorEmail, message } = req.body || {};
  const author = normalizeEmail(authorEmail);
  if (!author) throw new HttpError(400, 'authorEmail is required');
  if (typeof message !== 'string' || !message.trim()) {
    throw new HttpError(400, 'message is required');
  }
  const updated = await requirementService.addClarificationReply({
    reqId: id,
    authorEmail: author,
    message: message.trim(),
  });
  if (!updated) throw new HttpError(404, 'Requirement not found');
  res.status(201).json({ data: updated });
};

module.exports = { listByClient, addReply };
