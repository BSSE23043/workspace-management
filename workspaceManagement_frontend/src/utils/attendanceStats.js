// Absence derivation (no stored ABSENT rows): anyone on punch duty who has no
// attendance log for an elapsed working day is marked absent on the fly.
// Approved leave for that date counts as ON_LEAVE (not unexcused).

export const PUNCH_DUTY_ROLES = ['EMPLOYEE', 'MANAGER', 'HR'];

export const isWeekday = (dateStr) => {
  const [y, m, d] = (dateStr || '').split('-').map(Number);
  if (!y || !m || !d) return false;
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return day >= 1 && day <= 5;
};

// Absence counting starts when attendance tracking actually began — the date
// of the earliest attendance log ever recorded (or today if none yet). Days
// before that are not counted as absences (the app wasn't tracking then).
export const attendanceTrackingStart = (logs, todayStr) => {
  let min = null;
  for (const l of logs || []) {
    if (l.date && (!min || l.date < min)) min = l.date;
  }
  if (min && min <= todayStr) return min;
  return todayStr;
};

// Workdays from tracking start through today within the given month (Mon-Fri).
// For a past month, weekdays from tracking start (or month start) to month end.
export const elapsedWorkdaysInMonth = (monthPrefix, todayStr, trackingStart) => {
  if (!monthPrefix || !todayStr) return 0;
  const monthStart = `${monthPrefix}-01`;
  let from = monthStart;
  if (trackingStart && trackingStart > from) from = trackingStart;
  if (from > todayStr) return 0;
  const [y, m] = monthStart.split('-').map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  let count = 0;
  for (let d = 1; d <= lastDay; d++) {
    const ds = `${monthPrefix}-${String(d).padStart(2, '0')}`;
    if (ds >= from && ds <= todayStr && isWeekday(ds)) count++;
  }
  return count;
};

export const getUnexcusedAbsentDays = ({
  workdaysElapsed = 0,
  presentDays = 0,
  paidLeaveDays = 0,
}) => Math.max(0, workdaysElapsed - presentDays - paidLeaveDays);

export const isOnApprovedLeave = (leaves, userId, dateStr) =>
  (leaves || []).some(
    (l) =>
      l.userId === userId &&
      l.status === 'APPROVED' &&
      l.startDate <= dateStr &&
      l.endDate >= dateStr
  );
