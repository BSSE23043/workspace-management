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
//   - employees submit leave (services/leaveService.applyLeave)
//   - managers create tasks (services/taskService.createTask)
//   - managers create client requirements (services/requirementService.addRequirement)
// This removes all pre-filled demo data associated with the demo manager.
// ---------------------------------------------------------------------------
export const SEED_ATTENDANCE = [];

// ---------------------------------------------------------------------------
// HR DEMO SEEDS REMOVED.
// HR tickets and per-employee salary overrides now start EMPTY and are built
// up at runtime by real users:
//   - employees submit HR tickets (services/ticketService.createTicket)
//   - HR configures company-wide policy + per-employee overrides
//     (salarySlice.updateCompanySalaryConfig / updateEmployeeSalaryOverride)
// The companyWide salary block below is functional payroll POLICY defaults
// (rates only), not demo records. Fixed allowances were removed entirely —
// they no longer exist in config and no longer count toward net pay.
// ---------------------------------------------------------------------------
export const SEED_SALARY_CONFIG = {
  companyWide: {
    workingDaysPerPeriod: 22,
    deductionPerAbsentDay: 5000,

    baseSalaryDefault: 150000,
  },
  overrides: {},
};

export const SEED_HR_TICKETS = [];

export const SEED_LEAVES = [];

export const SEED_TASKS = [];

export const SEED_REQUIREMENTS = [];
