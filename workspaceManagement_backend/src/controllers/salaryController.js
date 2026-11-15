const HttpError = require('../utils/httpError');
const salaryService = require('../services/salaryService');

const normalizeEmail = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : '');

const getSalaryConfig = async (req, res) => {
  const email = normalizeEmail(req.query.userEmail);
  if (!email) throw new HttpError(400, 'userEmail query parameter is required');
  const data = await salaryService.loadSalaryConfig(email);
  res.json({ data });
};

module.exports = { getSalaryConfig };
