// Comprehensive Seed Data strictly aligned with Figma screens & Syllabus

// Company identity fields start EMPTY on purpose: each company sets their own
// name, campus and timezone from the Admin "Company Profile" screen instead of
// seeing demo placeholder values. The numeric fields below are functional
// defaults (geofence + payroll policy), not company branding.
export const SEED_COMPANY = {
  name: '',
  enterpriseId: '',
  mainCampus: '',
  latitude: 31.5204,
  longitude: 74.3587,
  geofenceRadiusMeters: 200,
  timezone: '',
  workingDays: ['M', 'T', 'W', 'T', 'F'],
  standardWorkingDaysPerMonth: 22,
  defaultAbsenceDeduction: 5000,
  defaultUnpaidLeaveDeduction: 3500,
};

// ---------------------------------------------------------------------------
// SEED USERS + DEPARTMENTS REMOVED (no demo users, no department logic).
// The user database starts EMPTY and users are typed by ROLE only
// (EMPLOYEE / MANAGER / HR / ADMIN / CLIENT). Real accounts only come from:
//   1. The hardcoded Super Admin (see utils/superAdminConfig.js, not stored here)
//   2. Company Admins created by the Super Admin (AsyncStorage USERS, role ADMIN)
//   3. Users those Company Admins create from the Employee Form
// Every real user carries a companyId (company scope key, "CO-###").
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// MANAGER / SHARED DEMO SEEDS REMOVED.
// Attendance logs, leave requests, tasks and client requirements now start
// EMPTY and are built up at runtime by real users:
//   - employees punch attendance (attendanceSlice.checkIn / checkOut)
//   - employees submit leave (leavesSlice.applyLeave)
//   - managers create tasks (services/taskService.createTask)
//   - managers create client requirements (services/requirementService.addRequirement)
// This removes all pre-filled demo data associated with the demo manager.
// ---------------------------------------------------------------------------
export const SEED_ATTENDANCE = [];

export const SEED_SALARY_CONFIG = {
  companyWide: {
    workingDaysPerPeriod: 22,
    deductionPerAbsentDay: 5000,
    deductionPerUnpaidLeaveDay: 3500,
    baseSalaryDefault: 150000,
    allowancesDefault: 20000,
    allowanceItems: [
      { id: 'alw_trans', name: 'Transport Allowance', amount: 15000 },
      { id: 'alw_net', name: 'Internet & Utility Allowance', amount: 5000 },
    ],
  },
  overrides: {
    'EMP-089': {
      baseSalary: 150000,
      workingDaysPerPeriod: 22,
      deductionPerAbsentDay: 5000,
      deductionPerUnpaidLeaveDay: 3500,
      allowanceItems: [
        { id: 'alw_trans', name: 'Transport Allowance', amount: 15000 },
        { id: 'alw_net', name: 'Internet & Utility Allowance', amount: 5000 },
      ],
    },
  },
};

export const SEED_HR_TICKETS = [
  {
    id: 'TKT-101',
    userId: 'EMP-089',
    userName: 'Ali Raza',
    category: 'Attendance Correction',
    date: '2026-10-12',
    subject: 'Forgot to check out on Oct 12',
    explanation: 'Checked out at 05:15 PM at security desk after network disconnected. Attached physical sign-out log.',
    evidenceName: 'IMG_7701.JPG',
    evidenceType: 'image',
    evidenceImageKey: 'evidenceSignoutSheet',
    status: 'OPEN',
    currentSystemLog: 'Out Missing / 0.0h Deduct',
    proposedAdjustment: 'Out 05:15 PM / 8h 15m Full',
    timeline: [
      { sender: 'Ali Raza', time: 'Oct 12, 05:30 PM', message: 'Submitted attendance override request with sign-out register proof.' },
    ],
  },
  {
    id: 'TKT-102',
    userId: 'EMP-072',
    userName: 'Farhan Siddiqui',
    category: 'Attendance Correction',
    date: '2026-10-14',
    subject: 'Geofence boundary false negative',
    explanation: 'GPS drift reported distance 520m while sitting in 2nd Floor Server Room.',
    evidenceName: 'wifi_bssid_log.txt',
    status: 'IN_PROGRESS',
    currentSystemLog: 'Out of Bounds (520m)',
    proposedAdjustment: 'Verify via Office Wi-Fi Access Point',
    timeline: [
      { sender: 'Farhan Siddiqui', time: 'Oct 14, 09:30 AM', message: 'Requested BSSID cross-check.' },
      { sender: 'Sana Khan (HR)', time: 'Oct 14, 11:15 AM', message: 'Reviewing Network Telemetry log with IT Ops.' },
    ],
  },
  {
    id: 'TKT-103',
    userId: 'EMP-077',
    userName: 'Tariq Mehmood',
    category: 'Salary Issue',
    date: '2026-10-10',
    subject: 'Missing Internet Allowance reimbursement',
    explanation: 'October cycle did not credit the agreed 5,000 PKR home broadband allowance.',
    status: 'OPEN',
    timeline: [
      { sender: 'Tariq Mehmood', time: 'Oct 10, 02:00 PM', message: 'Bill receipt attached for review.' },
    ],
  },
  {
    id: 'TKT-104',
    userId: 'EMP-081',
    userName: 'Zainab Malik',
    category: 'General Inquiry',
    date: '2026-10-08',
    subject: 'Annual leave quota discrepancy',
    explanation: 'Discrepancy of 2 days between HR portal and company spreadsheet.',
    status: 'RESOLVED',
    timeline: [
      { sender: 'Zainab Malik', time: 'Oct 08, 10:00 AM', message: 'Please verify remaining leave balance.' },
      { sender: 'Sana Khan (HR)', time: 'Oct 08, 04:00 PM', message: 'Corrected in HR database. Current balance: 14 Days.' },
    ],
  },
];

export const SEED_LEAVES = [];

export const SEED_TASKS = [];

export const SEED_REQUIREMENTS = [];
