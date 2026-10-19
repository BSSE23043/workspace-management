// HR-Configurable Salary Calculation Formula (Formula 4.2)
// A_unexcused = max(0, W - (P + L_paid + L_unpaid))
// D_total = (A_unexcused * R_absent) + (L_unpaid * R_unpaid)
// S_net = S_base - D_total
// (the syllabus formula's B allowance term was removed — allowances no
// longer exist in config or payroll)

export const calculateSalaryEstimate = ({
  baseSalary = 150000,
  workingDaysPerPeriod = 22,
  presentDays = 19,
  paidLeaveDays = 1,
  unpaidLeaveDays = 1,
  absentDays = null, // if provided, overrides unexcused formula or verifies it
  deductionPerAbsentDay = 5000,
  deductionPerUnpaidLeaveDay = 3500,
}) => {
  const S_base = Number(baseSalary) || 0;
  const W = Number(workingDaysPerPeriod) || 22;
  const P = Number(presentDays) || 0;
  const L_paid = Number(paidLeaveDays) || 0;
  const L_unpaid = Number(unpaidLeaveDays) || 0;

  // Unexcused absence count
  const calculatedUnexcused = Math.max(0, W - (P + L_paid + L_unpaid));
  const A_unexcused = absentDays !== null && absentDays !== undefined ? Number(absentDays) : calculatedUnexcused;

  const R_absent = Number(deductionPerAbsentDay) || 0;
  const R_unpaid = Number(deductionPerUnpaidLeaveDay) || 0;

  const absentDeductionTotal = A_unexcused * R_absent;
  const unpaidLeaveDeductionTotal = L_unpaid * R_unpaid;
  const totalDeductions = absentDeductionTotal + unpaidLeaveDeductionTotal;

  // Daily pro-rata rate for reference
  const dailyProRataRate = W > 0 ? Math.round(S_base / W) : 0;

  const netSalary = S_base - totalDeductions;

  return {
    baseSalary: S_base,
    workingDaysPerPeriod: W,
    presentDays: P,
    paidLeaveDays: L_paid,
    unpaidLeaveDays: L_unpaid,
    unexcusedAbsentDays: A_unexcused,
    dailyProRataRate,
    rateAbsent: R_absent,
    rateUnpaidLeave: R_unpaid,
    absentDeductionTotal,
    unpaidLeaveDeductionTotal,
    totalDeductions,
    netSalary,
  };
};

export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '0 PKR';
  return `${Number(amount).toLocaleString('en-US')} PKR`;
};
