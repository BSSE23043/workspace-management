const pool = require('../config/db');

const toApiConfig = (rows) => {
  const companyWide = {};
  const overrides = {};
  for (const r of rows) {
    const cfg = {
      baseSalary: Number(r.base_salary),
      workingDaysPerPeriod: r.working_days_per_month,
      deductionPerAbsentDay: Number(r.rate_absent),
    };
    if (r.user_email) {
      overrides[r.user_email] = cfg;
    } else {
      Object.assign(companyWide, cfg);
    }
  }
  return { companyWide, overrides };
};

const loadSalaryConfig = async (companyEmail) => {
  // companyEmail is the employee's email; resolve company via users
  const [urows] = await pool.execute(`SELECT company_id FROM users WHERE email = ? LIMIT 1`, [companyEmail]);
  const companyId = urows[0]?.company_id;
  const [rows] = await pool.execute(
    `SELECT user_email, base_salary, working_days_per_month, rate_absent
       FROM salary_configs WHERE company_id = ?`,
    [companyId || 'CO-001']
  );
  return toApiConfig(rows);
};

module.exports = { loadSalaryConfig };
