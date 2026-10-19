# opencodeContext.md — Living Project Context

> **Maintenance Protocol:** This file is the single source of truth for AI/session context.
> It MUST be updated whenever any of the following happens on branch `Umar`:
> 1. Any code change is made (new/edited/deleted files, dependency changes, config changes).
> 2. Code is pulled (`git pull`) into `Umar`.
> 3. A branch (e.g., `Samer`, `main`) is merged into `Umar`.
> After each such event: re-inspect what changed (`git diff`/`git log`), and update the
> affected sections below (Architecture, Screens, Store, Services, Changelog). Keep the
> Changelog section chronological.

---

## 1. Project Overview

- **Name:** Workspace Management System (WMS) — "Acme Tech Solutions", enterprise ID `WMS-PK-982`
- **What it is:** A React Native (JavaScript, no TypeScript) mobile app for managing employees,
  attendance (GPS geofence), leave requests, tasks, HR tickets, salary estimates,
  and client requirements across **5 role-based portals**.
- **Nature:** A semester Mobile-App-Dev course project deliberately built to showcase the full
  React Native syllabus (class components, all list types, all hooks, Context + Redux, AsyncStorage,
  drawer/tabs/stack navigation). Code contains "Syllabus Requirement:" comments.
- **Backend:** **NONE.** The app is fully offline/seed-driven. Most domain data lives in Redux
  (in-memory, seeded from `src/data/seedData.js`); the auth session is mirrored to AsyncStorage.
  **Users are NOT in Redux at all** — AsyncStorage `@wms_users` is the single source of truth and
  every screen loads the user list from it with local `useState`/`useEffect`. The
  user database is not seeded — it starts empty; accounts only exist via the Super Admin flow.
  No HTTP/network calls anywhere (the `fetch` demos were removed with the
  announcements feature — `fetch` is not in the syllabus concepts list).
- **Blueprint:** `repo/workforce_management_system_developer_blueprint.md` (repo root) is the
  authoritative spec: role permission matrix, syllabus compliance matrix, formulas, and 6 phased
  build prompts. Consult it before large changes.

## 2. Repository Layout

```
repo/                                  (git root; branches: main, Samer, Umar[current])
├── README.md
├── documentation/
│   ├── bug report.txt
│   └── steps required to setup this project.txt
├── workforce_management_system_developer_blueprint.md   ← full spec / source of truth
└── workspaceManagement_frontend/      ← React Native app (working dir)
    ├── android/                       (no ios/ folder; Android only)
    ├── src/
    ├── App.js, index.js
    ├── babel.config.js, metro.config.js, jsconfig.json, app.json
    ├── .eslintrc.js, .prettierrc.js, jest.config.js
    └── package.json
```

## 3. Tech Stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | React Native **0.86.2**, React **19.2.3** | Plain JavaScript (jsconfig for editor; no TS) |
| Node | >= 22.11.0 | Hermes enabled, new-architecture era |
| Navigation | `@react-navigation/native` 7.x + native-stack, bottom-tabs, drawer | + screens, safe-area-context, gesture-handler, reanimated, worklets |
| State | `@reduxjs/toolkit` 2.x + `react-redux` 9.x | **All reducers synchronous**; `serializableCheck: false`; no thunks |
| Session/theme | React Context | `AuthContext`, `ThemeContext` |
| Storage | `@react-native-async-storage/async-storage` 3.x | Keys namespaced `@wms_*` |
| HTTP | — | No HTTP calls anywhere; `fetch` demos removed (not in syllabus concepts) |
| Icons | Custom unicode `Icon` component | `@expo/vector-icons` is installed but **never used** |
| Testing | Jest (`@react-native/jest-preset`) | **No tests exist in src/** |
| Scripts | `npm run android`, `npm start`, `npm test` | No `ios` script |

## 4. Architecture

### Entry & Providers (`App.js` nesting order)
`Redux Provider` → `ThemeProvider` → `AuthProvider` → `SafeAreaProvider` → `ThemedStatusBar` + `AppNavigator`.
`index.js` imports `react-native-gesture-handler` first (required for drawer).

### Navigation (`src/navigation/`)
- **`AppNavigator.js`** — root auth guard inside `NavigationContainer`:
  - No `currentUser` → **AuthStack**: `Login` only (self-signup `Register` screen was **removed**)
  - `role === 'SUPER_ADMIN'` → `SuperAdminNavigator` (hardcoded platform owner; see §8.1)
  - `role === 'ADMIN'` → `AdminDrawerNavigator` (Drawer wrapping stack; NO bottom tabs)
  - `'HR'` → `HRNavigator`, `'MANAGER'` → `ManagerNavigator`,
    `'CLIENT'` → `ClientNavigator`, else `'EMPLOYEE'` → `EmployeeNavigator`
  - Custom splash view while `isSplashLoading`
- All navigators use `headerShown: false` (custom `HeaderBar`); tab bars themed via
  `useTheme().getRolePalette(role)`.

| Role | Navigator | Tabs | Stack (beyond tabs) |
|---|---|---|---|
| SUPER_ADMIN | Tabs + stack | Dashboard, Company Admins | SuperAdminProfile. Hardcoded platform owner; manages Company Admin accounts (add/remove) |
| ADMIN | Drawer → stack | — | AdminDashboard, CompanyProfile, EmployeeDirectory, EmployeeForm, AdminProfile. Custom drawer: Executive Dashboard, Profile & Theme, Logout (no reset/badge) |
| HR | Tabs + stack | Dashboard, Attendance, Payroll, Tickets | SalaryConfig, HRTicketDetail, HRProfile |
| MANAGER | Tabs + stack | Dashboard, Team & Leave, Tasks, Requirements | TeamLeaveRequests, TaskDetail, RequirementCoordination, ManagerProfile |
| EMPLOYEE | Tabs + stack | Workspace, Attendance, Salary, Work & Requests | MyLeaveRequests, MyHRTickets, MyTasks, EmployeeProfile |
| CLIENT | Tabs + stack | Dashboard, Milestones | ClientProfile (receives `onLogout` prop) |

### Role Permission Rules (from blueprint §2, enforced via `src/utils/permissions.js`)
- **SUPER_ADMIN** (hardcoded, not in seed data) provisions Company Admin accounts (email+password) from the Super Admin portal. Only it has `canManageCompanyAdmins`.
- **Only ADMIN** creates/edits user accounts and edits own profile text fields.
- HR/MANAGER/EMPLOYEE/CLIENT profile fields are read-only (`🔒`), but **all roles** can change own DP.
- **Only MANAGER/ADMIN** create requirements & tasks; CLIENT is review-only (milestones, broadcasts, clarification replies).
- **No self sign-up**: the public `register()` was removed from AuthContext and RegisterScreen deleted.

### Domain Core Formulas
- **Geofence** (`src/utils/geofence.js`): Haversine distance; punch blocked outside office radius (default **200 m**, Lahore campus 31.5204/74.3587).
- **Salary** (`src/utils/salaryCalculator.js`): `unexcused = W − (present + paidLeave + unpaidLeave)`;
  `net = base − (unexcused × rateAbsent + unpaidLeave × rateUnpaid)`; W=22, 5000/3500 PKR rates;
  currency PKR. (The formula's `+ allowances` B term was removed 2026-10-19 — allowances no longer
  exist in config or payroll.)
- **Dual-deadline conflict** (`tasksSlice`): tasks carry internal engineer due vs external client due;
  `bufferDays`, `hasConflict` computed at `createTask`.

## 5. Source Map (`src/`)

```
src/
├── assets/images/          index.js asset map + 11 images (currently 1x1 px placeholder stubs)
├── components/common/      AppInput, DatePickerModal, HeaderBar, Icon
├── context/                AuthContext.js, ThemeContext.js
├── data/seedData.js        seed "database": company profile + company-wide salary
│                           policy rate defaults only (allowance fields removed);
│                           attendance / leaves / tasks /
│                           requirements / HR tickets seeds are empty arrays
│                           — SEED_USERS + SEED_DEPARTMENTS + SEED_ANNOUNCEMENTS
│                           + SEED_NOTIFICATIONS **removed**
├── navigation/             AppNavigator + 5 role navigators + SuperAdminNavigator (see §4)
├── screens/                34 screens (see §6)
├── services/               storageService.js (AsyncStorage + seed/reset)
├── store/                  index.js + slices/ (7 slices, see §7)
└── utils/                  geofence.js, imagePicker.js, permissions.js, salaryCalculator.js, superAdminConfig.js, validation.js
```

### Super Admin account (`src/utils/superAdminConfig.js`)
- **Hardcoded** (not in seed data / AsyncStorage): email `superadmin@wms.com`, password `SuperAdmin@123`,
  role `SUPER_ADMIN`, id `SUP-001`. Login with these creds opens the Super Admin portal.
- Company Admins created there are appended to AsyncStorage `USERS` with role `ADMIN` (+ `companyName`
  field), so the existing login flow and Admin portal work unchanged for them.

### Key components
- **`HeaderBar`** — custom header; admin hamburger, back chevron, avatar→profile; status pill built
  with `React.createElement` (syllabus showcase); hides pill when `showStatus={false}`; returns
  `null` when `isEmbedded`.
- **`AppInput`** — themed `forwardRef` TextInput; password eye toggle, "Locked (Admin Managed)" badge.
- **`DatePickerModal`** — custom calendar (no native picker); "today" now follows the **real device
  date** (was hardcoded 2026-10-18). Its `initialDate` prop default is also the device date.
- **DP gallery picker** (`src/utils/imagePicker.js`) — `pickProfilePictureFromGallery(onPicked)`
  wraps `launchImageLibrary` (`mediaType: 'photo'`, `selectionLimit: 1`); returns the picked
  photo's local URI; `<Image>` scales it into the circular DP frame. Replaces the deleted
  `AvatarPickerModal`.
- **`Icon`** — ~60 glyph names mapped to unicode (offline icon system).

### Contexts
- **`AuthContext`**: `currentUser`, `isSplashLoading`, `login`, `updateCurrentUser`
  (single update fn — merges fields into session + `@wms_users`), `logout`.
  ~~`register`~~ **removed** (no self sign-up); ~~`updateCurrentUserDP`/`updateAdminProfile`~~
  **merged into `updateCurrentUser`**.
  `login()` checks the hardcoded Super Admin first (email/password match in `superAdminConfig.js`),
  otherwise looks the user up in AsyncStorage `USERS` (Company Admins created by the Super Admin
  plus every user those admins provisioned — no demo users). On mount: `initializeSeedDataIfNeeded()`
  (one-time demo-user purge guarded by `@wms_demo_users_cleaned`; also backfills a missing
  `companyId` onto any Admin at login) then restore
  `@wms_auth_current_user` + 500 ms splash. Passwords stored in **plaintext** in AsyncStorage.
- **`ThemeContext`**: light/dark persisted to `@wms_theme_preference`; `ROLE_THEMES` —
  ADMIN `#1E293B`, HR `#0F766E`, MANAGER `#1D4ED8`, EMPLOYEE `#4338CA`, CLIENT `#92400E`.

## 6. Screens Inventory (34)

**auth/** — `LoginScreen` (useRef focus chaining, validation, remember-device; bottom card explains accounts are issued, no signup). ~~RegisterScreen~~ **deleted** (self sign-up removed).

**superAdmin/** (new; themed `#0F172A` midnight slate, matches app's dark-navy family) —
`SuperAdminDashboardScreen` (welcome, platform stats: company admin count + registered companies
from AsyncStorage USERS where role=ADMIN, onboarding steps, module shortcut),
`CompanyAdminsScreen` (add Company Admin: company name/admin name/email/password → creates ADMIN
user in AsyncStorage USERS **with a generated `companyId` scope key**; FlatList of admins with
Alert-confirmed remove),
`SuperAdminProfileScreen` (read-only hardcoded profile, dark-mode switch, logout).

**admin/** — `AdminDashboardScreen` (workforce snapshot KPIs (Total/Active/Deactivated — no
  Departments card) read **users from AsyncStorage** via
  useState/useEffect + `navigation.addListener('focus')` reload, not the Redux demo seed; org card
  rendered only when
  `company.name` is set, otherwise a "Set Up Your Company Profile" prompt; "Recent Administrative
  Activity" section removed), `CompanyProfileScreen` (geofence
  policy, city presets, deduction rates), ~~`DepartmentManagementScreen`~~ **deleted** (department
  logic removed), `EmployeeDirectoryScreen` (SectionList **grouped by role**, search, role filters,
active toggle (persisted to AsyncStorage); **loads users from AsyncStorage** (mount + focus reload),
**company-scoped**: if `currentUser.companyId` exists, only users with the same
companyId are listed), `EmployeeFormScreen` (add/edit user — role picker only, **no department
picker**; **gallery DP picker** (real device gallery via `launchImageLibrary`), manager hierarchy; **loads users from AsyncStorage**, waits for load
before rendering; **company-scoped** manager options; saves only to AsyncStorage with the admin's
`companyId`), `AdminProfileScreen` (only editable profile).
~~`AnnouncementsFeedScreen`~~ + ~~`NotificationsScreen`~~ **deleted** (features not implemented;
also removed from the admin drawer).

**hr/** — all screens show only real runtime data (no demo seeds remain).
`HRDashboardScreen` (KPIs derived from real state: today's attendance logs
checked-in/unexcused, approved-leave count, pending attendance-correction tickets;
banner month + billable days from salary config; "Recent Ticket Activity" list from
the tickets slice with an empty state), `CompanyAttendanceScreen` (SectionList by
attendance status, **real date stepper** — device-today default, ±1-day shifts,
calendar picker; logs actually **filtered by the selected date**; empty state),
`SalaryEstimatesScreen` (FlatList w/ header+footer; per-employee net pay computed
from **real AsyncStorage users + current-month attendance logs + approved leaves**
+ company policy/override; total payroll = sum of real estimates; no fake month
history), `HRTicketListScreen` (tab counts derived from real tickets),
`HRTicketDetailScreen` (chat timeline, approve/reject; attendance-correction
tickets also dispatch `overrideAttendance` with the ticket's
`requestedIn`/`requestedOut`/date → salary recalcs; **empty state when ticket id
not found**; comparison card reads the ticket's `currentSystemLog`/
`proposedAdjustment`; evidence block renders only when the ticket actually carries
`evidenceName`; reply sender = current HR user), `SalaryConfigScreen`
(**useReducer**; segmented "Company-Wide Default" vs "Employee Override" scope; base/pro-rata +
deduction-rate fields only — Fixed Monthly Allowances card removed and allowances no longer
exist anywhere in payroll; employee chips
= real AsyncStorage users, no default demo selection), `HRProfileScreen`
(read-only + DP upload; missing contact fields show `—`).

**manager/** — all team lists are scoped to `u.managerId === currentUser.id` (real reports loaded
from AsyncStorage `@wms_users`; no demo names/ids remain). `ManagerDashboardScreen` (real KPIs:
attendance present/total, team task count + dual-deadline conflict count, pending team leaves,
"Recent Team Tasks" list; empty states when nothing exists), `TeamAttendanceScreen`
(SectionList of direct reports' logs for a shift-steppable date, 3-state pills, real
present/on-leave/absent counts, empty state), `TeamLeaveRequestsScreen` (team-filtered approve/reject
**requires** review comment; tab counts derived from real data; empty state), `TaskManagementScreen`
(status tabs, create task w/ multi-assignee + dual deadlines + live conflict warning; engineer picker =
real team; guards for no team / no assignee), `TaskDetailScreen` (progress, notes, edit modal, milestone
sync toggle; real team, today-based date defaults), `RequirementCoordinationScreen` (requirements list
guarded by an empty state, required Client Organization input, milestones, lifecycle state, private-task
links from the selected requirement, client broadcasts authored by the current user),
`ManagerProfileScreen` (read-only + DP upload; no stats/pulse card).

**employee/** — `EmployeeDashboardScreen` (attendance card w/ geofence distance, salary estimate),
`AttendanceActionScreen` (**useReducer** GPS simulator, haversine INSIDE/OUTSIDE 200 m, blocks punch
outside), `MySalaryEstimateScreen` (transparent payslip, month cycles), `WorkAndRequestsHubScreen`
(segment switcher embedding the 3 screens below via `isEmbedded`), `MyLeaveRequestsScreen` (leave
types, date range, overlap validation), `MyHRTicketsScreen` (3 categories, correction details sub-card),
`MyTasksScreen` (status tabs, quick % progress), `EmployeeProfileScreen`.

**client/** — `ClientDashboardScreen` (deliverable KPIs, no submit button), `MyRequirementsScreen`
(milestone checklist read-only + clarification replies), `ProfileSettingsScreen` (**class component**
reading `currentUser` from AuthContext via `static contextType`; DP updates go through
`updateCurrentUser` → session + AsyncStorage).

## 7. Redux Store

`configureStore({ company, attendance, salary, leaves, tickets, tasks, requirements })`.
**State is in-memory only — NOT rehydrated from AsyncStorage**
(only the auth session + company profile persist). All reducers synchronous. **No users slice** — the user list
lives exclusively in AsyncStorage `@wms_users`; screens load it into local state.

| Slice | State | Notable actions |
|---|---|---|
| company | flat company profile (geofence, policies) | updateCompanyProfile |
| attendance | `{ logs[] }` | checkIn (geofence-verified), checkOut, overrideAttendance (→ CORRECTED_PRESENT) |
| salary | `{ companyWide, overrides{} }` | updateCompanySalaryConfig, updateEmployeeSalaryOverride |
| leaves | `{ leaves[] }` | applyLeave (PENDING), approveLeave, rejectLeave |
| tickets | `{ tickets[] }` | createTicket (timeline), markInProgress, resolveTicket, reopenTicket, rejectTicket, addTicketMessage |
| tasks | `{ tasks[] }` | createTask (computes bufferDays/hasConflict), editTask, updateTaskStatus, toggleMilestoneSync, addTaskLog, rescheduleTask |
| requirements | `{ requirements[] }` | addRequirement, toggleMilestone, addMilestone, publishBroadcast, addClientClarificationReply, updateLifecycleState |

~~`announcements`~~ + ~~`notifications`~~ slices **deleted** (features removed).

## 8. Services & Storage

- **`storageService.js`** — AsyncStorage JSON wrapper; `STORAGE_KEYS` (12 `@wms_*` keys);
  `initializeSeedDataIfNeeded()` (first-run seed via `@wms_app_initialized` + one-time demo-user
  purge via `@wms_demo_users_cleaned`); `resetToSeedData()` (multiSet of all domain data;
  now internal only — the Admin drawer reset button was removed).
- ~~`networkService.js`~~ **deleted** (only existed for the announcements feature's `fetch` demo).

## 9. Seed Data Highlights (`src/data/seedData.js`)

- Company identity fields (`SEED_COMPANY.name/enterpriseId/mainCampus/timezone`) start **empty** —
  each company sets them from the Admin "Company Profile" screen; dashboard shows a setup prompt
  until `company.name` is set. Numeric geofence/payroll defaults remain (functional, not branding).
  ("Acme Tech Solutions" / "WMS-PK-982" demo branding removed from splash, login, dashboard, and
  company profile screen.)
- Departments: **REMOVED.** `SEED_DEPARTMENTS` deleted; users are typed by ROLE only
  (EMPLOYEE / MANAGER / HR / ADMIN / CLIENT). Directory groups by role; the Employee Form has no
  department picker; `usersSlice` no longer holds department state/actions; the
  DepartmentManagement screen + navigation entry are deleted; dashboard has no Departments KPI.
  (Class-component showcase now rests solely on `client/ProfileSettingsScreen`.)
- Demo users: **REMOVED.** `SEED_USERS` no longer exists; AsyncStorage `USERS` seeds as `[]`.
  The only accounts are the hardcoded Super Admin + Company Admins created by it + users those
  admins provision (each real user carries a `companyId`). All demo-email/name fallback strings
  (`usman@acmetech.com`, `|| 'Ali Raza'`, etc.) were neutralized across screens.
- **HR-facing seeds removed (2026-10-19):** `SEED_HR_TICKETS` is now `[]` (the demo
  tickets `#TKT-101..104` with the Ali Raza / Sana Khan persona are gone) and
  `SEED_SALARY_CONFIG.overrides` is now `{}` (the `EMP-089` Ali Raza override was
  deleted) and the companyWide block carries rate defaults only — its
  `allowancesDefault`/`allowanceItems` fields were later removed too, together with
  the calculator's allowance term, so net pay = base − deductions everywhere.
  `SEED_COMPANY` numeric defaults + the companyWide salary policy block
  remain (functional policy defaults, not demo records). Every HR screen —
  dashboard KPIs, attendance date filter, salary estimates/payroll totals, ticket
  queue counts and ticket detail — now derives exclusively from real runtime data
  (AsyncStorage users + Redux logs/leaves/tickets); each opens with an empty state
  until real data exists. The HR-demo persona leftovers in employee screens
  (`EMP-089` filters, `TKT-101`/`TSK-408` fallbacks, the 161,500 PKR salary
  example, "Sana Khan" strings, the hardcoded `security_desk_signout.jpg` evidence
  chip) were stripped in the same pass; `evidenceSignoutSheet` asset entry deleted.
  (Employee-portal persona demos not tied to HR — e.g. `MySalaryEstimateScreen`
  month cycles, GPS presence card — untouched, out of scope.)
- "Today" in `DatePickerModal` now uses the **real device date** (fixed 2026-10-18 demo value
  removed — see Changelog); the
  manager screens I changed default their own date fields/deadlines from the real device date.

## 10. Known Caveats / Tech Debt

- No backend; Redux resets on app reload (auth session persists; users persist in AsyncStorage and
  are loaded into local state by each screen).
- Plaintext passwords in AsyncStorage; Super Admin credentials hardcoded in `superAdminConfig.js` (fine for a course project).
- Removing a Company Admin only removes them from AsyncStorage USERS (an already-open session of theirs would persist until logout).
- All image assets are 1x1-px placeholder stubs (blueprint lists required real images).
- `@expo/vector-icons` installed but unused; some dashboard figures hardcoded rather than derived.
- No TypeScript, no tests, no CI, no `.env`; Android only (no ios/).
- app.json name (`workspaceManagement_frontend`) differs from package.json name (`com.workspaceManagement`)
  and android applicationId (`com.workspacemanagement`).

## 11. Conventions

- Plain JS + ES6 (strict `===`, spread updates), single quotes, arrowParens avoid, trailing commas (prettier).
- ESLint: `extends '@react-native'`.
- Screens are self-contained; shared UI in `src/components/common`; cross-cutting logic in `src/utils`.
- Role colors/themes come from `permissions.js` → `ROLE_THEMES`, consumed via `useTheme()`.
- New domain features generally mean: seed entry + slice + (optional) service wiring + role screen(s)
  + blueprint permission check.

---

## Changelog (append every change/pull/merge on `Umar`)

- **2026-10-19** — **HR demo data removed completely; every HR screen (and the HR-demo persona
  leaking into employee screens) now shows only real runtime data.**
  - `seedData.js`: `SEED_HR_TICKETS` → `[]` (demo tickets `#TKT-101..104` deleted) and
    `SEED_SALARY_CONFIG.overrides` → `{}` (the `EMP-089`/Ali Raza override removed);
    `SEED_COMPANY` + `companyWide` policy numbers kept as functional defaults.
  - `ticketsSlice.js`: initial `tickets: []`, `resetTickets` → `[]`. `attendanceSlice.js`:
    `overrideAttendance` no longer fabricates a demo record — falls back to the current
    device date/times and its duplicate-log lookup now compares BOTH `userId` and `date`
    (was buggy `&&`/`||` logic).
  - `HRDashboardScreen`: KPIs computed from real state (today's attendance logs, approved
    leaves covering today, pending attendance-correction tickets); banner month + working
    days from salary config; hardcoded ticket card → real pending-override count; fake
    "Operational Activity Feed" → real "Recent Ticket Activity" (latest 4 tickets, empty state).
  - `CompanyAttendanceScreen`: device-today default; working `<`/`>` ±1-day steppers (UTC
    arithmetic, no TZ drift) + Today button; log list actually filtered by the selected date;
    `ListEmptyComponent` + footer count for the selected date.
  - `SalaryEstimatesScreen`: `PAYROLL_MONTHS`/month-chip strip/`aliBreakdown`/`EMP-089`
    default removed (also fixes a pre-existing `ScrollView`-used-but-not-imported bug);
    per-employee breakdown computed live from real logs + approved leaves + salary policy
    (`absentDays: 0` so the formula never fabricates unexcused absences); total payroll =
    sum of real estimates; headcount real; empty state when no team exists.
  - `SalaryConfigScreen`: `selectedEmployeeId` starts `''`; override save requires a selected
    employee ("No Employee Selected" guard). `HRTicketListScreen`: static `STATUS_TABS`
    replaced with counts derived from the real tickets slice.
  - `HRTicketDetailScreen`: `|| 'TKT-101'` / `tickets[0]` fallbacks removed → "ticket not
    found" empty screen; approve/reject dispatches the ticket's own `requestedIn`/`requestedOut`
    (generic time fallbacks) — real attendance overrides; comparison card reads the ticket's
    `currentSystemLog`/`proposedAdjustment` with `—` fallbacks; evidence block renders only if
    the ticket carries an `evidenceName`; reply sender = current HR user (Sana Khan removed);
    subtitle = ticket category.
  - `HRProfileScreen`: missing contact fields show `—` instead of demo values.
  - Employee screens scrubbed of the HR-demo persona: `MyHRTicketsScreen` (filter by
    `currentUser.id` only; cleared subject/explanation/requested-time defaults; device-today
    target; payload sends the real requested times, no fake evidence chip/mismatch alert;
    alert → "HR Operations Queue"; history empty state; dead styles removed),
    `MyTasksScreen` (no `EMP-089`/`TSK-408` fallbacks), `MyLeaveRequestsScreen`,
    `AttendanceActionScreen` (no `EMP-089` fallbacks), `EmployeeDashboardScreen` (real
    `{presentDays}/{workingDays}` salary estimate for the current month instead of the
    161,500 PKR Ali Raza figure; "Recent Attendance Logs" now renders the user's real punches
    with an empty state instead of hardcoded `TKT-101` rows; dropped `TSK-408`/`EMP-089`
    fallbacks + dead `todayLog`), `EmployeeFormScreen` (neutral name placeholder).
  - `SalaryConfigScreen` follow-up: the **"Fixed Monthly Allowances" card removed entirely**
    (both tabs) — its "+ Add Allowance" button never prompted, it just stacked duplicate
    hardcoded "Shift Hardship Allowance – 5,000" entries. Dead code deleted
    (`handleAddAllowancePrompt`, `ADD_ALLOWANCE`/`REMOVE_ALLOWANCE` reducer cases, 8 unused
    styles). **Fixed allowances then removed from payroll completely** (reversing the initial
    keep-pay-unchanged approach): `SEED_SALARY_CONFIG.companyWide` no longer carries
    `allowancesDefault`/`allowanceItems`; `salaryCalculator.js` dropped the `allowances`/
    `allowanceItems` params, the B allowance term and the `totalAllowances`/`allowanceItems`
    return fields (`S_net = S_base - D_total`); `allowanceItems` removed from
    `SalaryConfigScreen`'s reducer/payload, from the `SalaryEstimatesScreen` +
    `EmployeeDashboardScreen` call sites, and the "Itemized (Monthly) Allowances" cards +
    `+ Fixed Allowances` formula segment removed from `SalaryEstimatesScreen`,
    `EmployeeDashboardScreen` and `MySalaryEstimateScreen`. Net pay everywhere now = base −
    deductions. (`storageService` only *writes* the salary seed; nothing rehydrates it, so no
    stale allowance data can return.)
  - `assets/images/index.js`: dead `evidenceSignoutSheet` entry + `evidence_signout_sheet.jpg`
    deleted. `MySalaryEstimateScreen`: the "Transparent Salary Calculation Rule" text no longer
    hardcodes the Ali Raza figure (`... = 161,500 PKR`) — it renders the selected cycle's actual
    `estimate.baseSalary/totalDeductions/netSalary` (also fixes it always showing
    Oct numbers regardless of the selected cycle); its demo `MONTH_CYCLES` history left as-is.
  - Verified: repo-wide grep for `EMP-089|Ali Raza|TKT-10[1-4]|Sana Khan|436500|161500|TSK-408|evidenceSignoutSheet`
    → zero matches in `src/`; all 66 JS files parse clean. Employee-role demos not tied to HR
    (e.g. `MySalaryEstimateScreen` month-cycle history, GPS presence card) left untouched — out of scope.
  - **Department-credenza text scrub (decision honored: no departments — users are typed by the 5
    premade roles Employee/Manager/HR/Admin/Client only).** Verified no add-departments feature
    exists anywhere (`SEED_DEPARTMENTS` already gone; admin has only Company Profile + Employee
    Directory). Fixed the leftover user-visible wording: `EmployeeDirectoryScreen` search
    placeholder (`"...email, dept..."` → `"Search employees by name or email..."`),
    `MyLeaveRequestsScreen` form subtitle (`"department overlap"` → `"team availability"`),
    `ManagerProfileScreen` lock note (`"department assignment"` → `"role assignment"`), and the
    default HR ticket chat message in `ticketsSlice` (`"relevant departments"` → `"relevant
    teams"`). Left as-is (never user-visible): comments documenting the no-departments decision,
    internal `deptSelect*` style names (used for manager chips), the always-empty `department`
    data field on logs/users, and `superAdminConfig.department` (super-admin profile, not part of
    the 5-role system,     never rendered).
  - **Bug fix — Employee "HR Support" tile now opens the HR Tickets screen directly.** The tile
    used to call `navigate('Work & Requests')` with no params, dropping the user on whichever hub
    segment was last open. It now calls `navigate('MyHRTickets')` — the standalone HR Tickets
    stack screen ("HR Support & Attendance Override", with its own back button); the action bubbles
    from the Workspace tab up to the `EmployeeNavigator` stack where `MyHRTickets` is registered.
    Only the designated tile was changed. (`WorkAndRequestsHubScreen` additionally now **clears**
    its `initialTab` param after applying it — needed because React Navigation retains params
    across visits, which would otherwise permanently force the TICKETS segment on later plain opens
    of the hub; the remaining `initialTab` caller is the Salary screen's "Open an HR Ticket" link.
    The "Request Leave" tile and "Active Task Deliverable" card still open the hub with no param —
    same pattern, not part of this bug.)
  - **DatePicker "today" now live (HR attendance-calendar report checked → calendar access exists
    and works; the real defect was hardcoded dates).** `DatePickerModal.js`: `TODAY_YEAR/MONTH/DAY`
    now derive from `new Date()` instead of the fixed 2026-10-18 triplet, the badge reads
    `Today (<Mon> <D>)` from the real date, and the `initialDate` default prop is the device date
    instead of `'2026-10-18'` (affects its 7 call sites — all other 6 already pass `initialDate`).
    Bonus fix found while verifying: `MyHRTicketsScreen` passed `selectedDate={targetDate}` but the
    component's prop is `initialDate` — so the "Select Target Work Date" picker silently fell back
    to the hardcoded Oct 18 default; prop name corrected to `initialDate={targetDate}`.
    `DatePickerModal` "today" highlight + Today-jump button now follow the real device date on all
    7 screens (HR attendance, manager team-attendance/deadlines, employee leave/ticket dates).
  - **"Today = Oct 15" report checked → no longer exists (old build artifact), and one real leftover
    fixed.** Repo-wide grep: zero `Oct 15` matches anywhere — the source was the old Employee
    Dashboard's hardcoded log row `"Today, Oct 15 • Check-In 09:02 AM"`, already replaced this
    session with real punches; `SEED_ATTENDANCE = []` so no stale dates can load (Manager was
    always device-date-based — matches tester's "not present for Manager"). Leftover fixed in
    `AttendanceActionScreen.js`: the static fake "Recent Punch Logs" row (`"Today, 09:02 AM • Shift
    Check-In"` + hardcoded BSSID, shown even with zero punches) now renders the current user's real
    punch history from Redux (`logs.filter(userId).slice(0, 5)`, newest first: date, check-in/out,
    radial/terminal/verified, amber icon for non-PRESENT, divider per row, `"No punches yet"` empty
    state). Also corrected the screen's `todayRecord` lookup to include today's date
    (`l.userId === id && l.date === todayStr` — previously matched the user's OLDEST log of any
    date, so a yesterday's-PRESENT log left the button stuck on "Check Out" next day).
  - **Absent employees now flow into HR visibility + payroll deductions (feature gap, not just a
    display bug).** Previously only punches were stored — a no-show was invisible everywhere, and
    both payroll screens hardcoded `absentDays: 0` so the calculator never deducted. New pure util
    `src/utils/attendanceStats.js` (`PUNCH_DUTY_ROLES = EMPLOYEE/MANAGER/HR`; ADMIN/CLIENT excluded,
    inactive users excluded; `isWeekday`; `elapsedWorkdaysInMonth` = Mon-Fri days of the current
    month up to today; `getUnexcusedAbsentDays = max(0, elapsed − present − paidLeave −
    unpaidLeave)`; `isOnApprovedLeave`) — derivation only, no stored ABSENT rows. Applied in four
    places: (1) `CompanyAttendanceScreen` — loads the AsyncStorage user roster and synthesizes rows
    for punch-duty users with no log on the selected date (weekdays only, dates ≤ today): `ABSENT`
    (red, "No Punch Recorded") or `ON_LEAVE` (amber, approved-leave covers the date); status-pill
    counts and sections pick them up automatically. (2) `HRDashboardScreen` — "Unexcused" KPI now =
    expected punch-duty headcount today minus checked-in minus on-leave (was: count of stored
    ABSENT logs, which was always 0). (3) `SalaryEstimatesScreen` — `absentDays` computed per
    employee from elapsed workdays vs own present/approved-leave days (was hardcoded 0); featured
    audit + queue payouts + company total all reflect real absence deductions. (4)
    `EmployeeDashboardScreen` — own salary estimate uses the same derivation plus the user's own
    approved leave days from Redux (was 0/0/0). Calculator itself untouched (`S_net = S_base −
    D_total`); `MySalaryEstimateScreen` month-cycle demos remain out of scope.
  - **HR no longer sees themself in staff views.** The logged-in HR user (`useAuth().currentUser.id`)
    is excluded everywhere HR-facing reads staff data: `CompanyAttendanceScreen` (own punches AND
    synthesized ABSENT/ON_LEAVE rows filtered out — staff only), `HRDashboardScreen` (Checked-In /
    Unexcused / Approved Leave KPIs all skip own userId), `SalaryEstimatesScreen` (own user removed
    from `teamMembers`, so own payroll never appears in featured audit, queue, or company total).
    Other HR/manager users' rows still visible — only "self" is hidden.
  - **Payroll card simplification + "Unexcused" → "Absents" wording.** HR Featured Audit card in
    `SalaryEstimatesScreen`: 4-block telemetry (Present/Paid/Unpaid/Absent) → 3 blocks
    (Present / Leave / Absents, paid+unpaid merged under Leave); itemized "(Xd absent + Yd unpaid)"
    deduction line → single "Total Deductions"; net payout box now centered on `palette.primary`
    with white 22px value. HR dashboard KPI label "Unexcused" → "Absents". Employee payslip
    (`MySalaryEstimateScreen`): "Unexcused Absent … Out of Bounds GPS" → "Absent … No Check-In";
    both itemized deduction labels now use real counts/rates from the estimate instead of hardcoded
    "1 Day @ 5,000 / 3,500 PKR". Unpaid-leave still deducted in the math (only display simplified).
  - **Unpaid-leave category removed app-wide — leave is always paid; anything else is absence.**
    `salaryCalculator.js`: dropped `unpaidLeaveDays`/`deductionPerUnpaidLeaveDay` params +
    `L_unpaid`/`R_unpaid`/`unpaidLeaveDeductionTotal`/`rateUnpaidLeave` — now `A = max(0, W − P −
    L_paid)`, `D_total = A × R_absent`, `S_net = S_base − D_total`. `attendanceStats.js`
    `getUnexcusedAbsentDays` no longer takes unpaid days. `seedData.js` companyWide dropped
    `deductionPerUnpaidLeaveDay`. `SalaryConfigScreen` (reducer/initial/validation/payload + the
    "Deduction per Unpaid Leave Day" input) and admin `CompanyProfileScreen`
    ("Default Unpaid Leave Deduction" input + payload key) both simplified. `HRDashboardScreen`
    policy card: "Unpaid Leave Rate" row removed. `SalaryEstimatesScreen` + `EmployeeDashboardScreen`:
    all approved leave counts as paid leave (no `isPaid` split). `MyLeaveRequestsScreen`: leave
    types now just Annual Leave / Sick Leave (the "Casual / Unpaid 3,500 PKR/day" option and the
    `isPaid` payload field are gone). `MySalaryEstimateScreen`: unpaid telemetry card + itemized
    unpaid row removed; MONTH_CYCLES entries no longer carry `unpaidLeaveDays`. Repo-wide grep:
    zero `isPaid|unpaidLeaveDays|deductionPerUnpaidLeaveDay|Unpaid Leave` matches remain.
  - **Absence counting now starts when tracking actually began (fixes "absent 1 day but 65,000
    deducted").** The derivation counted every weekday of the month (Oct 1 → today = 13 through
    Oct 19), so anyone with no/one punch showed ~13 absent days → 13 × 5,000 = 65,000. New util
    `attendanceTrackingStart(logs, today)` = date of the earliest attendance log ever (today if
    none); `elapsedWorkdaysInMonth(monthPrefix, today, trackingStart)` counts Mon-Fri only from
    that date. Applied in `SalaryEstimatesScreen`, `EmployeeDashboardScreen`, and
    `CompanyAttendanceScreen` (synthesized ABSENT/ON_LEAVE rows only for dates ≥ tracking start —
    pre-tracking dates are never marked absent). Verified: no logs → 1 elapsed day (absent once =
    5,000); first log Oct 18 → only Oct 19 (a Monday) counts. HR dashboard today-only KPI unchanged
    (tracking start is always ≤ today).
  - **"Total Company Estimated Payroll" footer card removed** from HR `SalaryEstimatesScreen`
    (ListFooterComponent + its `totalCompanyPayroll` sum + 6 footer styles deleted).
  - **Employee ID tag (e.g. "EMP-012") removed** from the Featured Audit card in
    `SalaryEstimatesScreen` (+ its `empIdTag` style) — IDs are internal only, never rendered on
    salary cards (verified no other `.id` renders in the three salary screens).
  - **Action features removed from Featured Audit card** — "Export PDF" and "Lock Approval"
    buttons gone entirely from `SalaryEstimatesScreen` (card now ends at the ESTIMATED NET
    PAYOUT box); dropped `cardActionsRow`/`lockBtn`/`lockBtnText`/`outlineBtn`/`outlineBtnText`
    styles. Grep-verified zero matches for both labels.
  - **HR dashboard banner simplified** — top card now reads "PAYROLL CYCLE: {Month Year}" +
    "{N} working days this month" (was "PAYROLL OPS CYCLE … • Live Synced" / "Standard N
    billable days • Deduction rate enforced").
- **2026-10-19** — **Manager demo data removed; every manager screen now shows only the real team.**
  - `seedData.js`: `SEED_ATTENDANCE`, `SEED_LEAVES`, `SEED_TASKS`, `SEED_REQUIREMENTS` emptied to `[]`
    (the four were only read by the Redux slices' initial state; `storageService` first-run seed now
    writes `[]` for those keys too). `SEED_COMPANY`, `SEED_SALARY_CONFIG`, `SEED_HR_TICKETS` kept
    (HR-owned demo, not manager).
  - `ManagerDashboardScreen`: KPIs derive from AsyncStorage users filtered by
    `u.managerId === currentUser.id` — `{presentCount}/{myTeam.length}` from today's `logs`,
    `{teamTasks.length} ({conflictingTasks.length} Conflict)` from `assignedToIds`; conflicting tasks
    + pending leaves + recent team tasks all team-scoped. Telemetry image card, fake conflict-details
    fallback and hardcoded "Recent Team Milestones" replaced by dynamic "Recent Team Tasks" with an
    empty state. Unused `Image`/`IMAGES` imports dropped.
  - `TeamAttendanceScreen`: rewritten — sections built from the manager's real `teamIds` and today's
    logs (`checkInTime`, geofence `distanceMeters`), real present/on-leave/absent counts, 3-state
    status pill (PRESENT/ABSENT/ON_LEAVE), `ListEmptyComponent`, and a date stepper that shifts a
    real `selectedDate` (defaults to device today, header formatted from it) instead of hardcoded dates.
  - `TeamLeaveRequestsScreen`: tab counts + list filtered to `teamLeaves` (`teamIds` from `managerId`);
    overlap pill reads stored `leave.teamOverlapStatus`; empty state distinguishes "no team members"
    from "no requests yet".
  - `TaskManagementScreen` / `TaskDetailScreen`: engineer pickers = real `managerId` team; demo
    deadlines (`2026-10-22` / `2026-10-25`) → device today / today+7; `editAssignedIds` default `[]`
    (was `['EMP-089']`); unassigned footer → `"Unassigned"`; create-task guards for no-team and
    no-assignee; unused `requirements` selector + dead `requirementId` state removed.
  - `RequirementCoordinationScreen`: `CLIENT_ORGANIZATIONS` constant deleted → required
    "Client Organization" input (validated); `selectedReqId`/`broadcastTargetReqId` default `null`
    and the selector/milestones/private-task-links/broadcast card render only when a requirement
    exists (empty-state otherwise); org chips → real `activeReq.privateLinkedTasks`; publish author =
    `` `${currentUser.name} (Engineering Manager)` ``; new-requirement deadline = device today.
  - `ManagerProfileScreen`: "Managerial Pulse" card + `pulse*`/`cardTitle`/`cardSub`/`onlineDot` styles
    deleted; phone / shift-hours / handle fallbacks (`+92 300 6543210`, `09:00 - 18:00 PKT`,
    `@bilal.eng`) → `—`.
  - `tasksSlice`: `createTask` fallbacks `'EMP-089'` / `'Ali Raza'` → `''` / `'Unassigned'`.
  - Persona leftovers outside the manager path cleaned: `"Reporting to Bilal Ahmed"` in
    `EmployeeDashboardScreen` + `MyTasksScreen`, `MyLeaveRequestsScreen` "forwarded to … for review",
    `client/MyRequirementsScreen` + `ClientDashboardScreen` broadcast author, and
    `EmployeeProfileScreen` reporting-manager value now reads `currentUser.reportsTo || '—'`.
  - Unchanged (out of scope): HR demo (`SEED_HR_TICKETS`, `SalaryEstimatesScreen`/`SalaryConfigScreen`
    `EMP-089`), client persona (`Zafar Corp` strings), and `DatePickerModal`'s fixed Oct 18, 2026 "today".
  - Verified: all 64 src files parse clean (eslint not installed in project).
- **2026-10-19** — **Removed useless status badges from the Admin dashboard.**
  - `AdminDashboardScreen`: HeaderBar no longer shows the green `"SYSTEM OK"` status pill;
    the org card's `"Active Org"` pill (dot + label) and the `"{radius}m Geofence Active"` row
    were removed, along with the now-unused `activeOrgPill`/`greenPulseDot`/`activeOrgText` styles.
  - `HeaderBar`: added a `showStatus` prop (default `true`) so the `React.createElement` status
    pill can be hidden on a given screen; all other screens keep their status pills unchanged.
  - Verified zero remaining refs; all 64 src files parse clean.
- **2026-10-19** — **Real gallery DP picker; deleted `AvatarPickerModal`; removed the duplicate
  "Change DP" text button on all profile screens.**
  - Added dependency **`react-native-image-picker`** (native module — needs a rebuild).
  - New `src/utils/imagePicker.js` → `pickProfilePictureFromGallery(onPicked)` wraps
    `launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 })` (single photo, no video,
    no crop); stores `assets[0].uri` as `avatarKey`/`avatarCustomUri` (file URI); `<Image>`
    scales it to fit the circular DP via default `cover`.
  - **Deleted** `components/common/AvatarPickerModal.js` (simulated gallery + presets + URL).
  - All 5 profile screens (`Admin`/`HR`/`Manager`/`Employee`/`client`) + `EmployeeFormScreen`:
    modal state/JSX/import removed → gallery handler; **the duplicate text "Change DP" button was
    removed**, keeping only the camera badge icon overlaying the DP (Employee form keeps its single
    "Change Employee DP" button, now opening the gallery).
  - `assets/images/index.js`: `getAvatarSource` now also recognises `content://` URIs.
  - Verified zero `AvatarPickerModal`/modal-state refs; all 64 src files parse clean.
- **2026-10-19** — **Removed admin-drawer "Reset AsyncStorage Seed Data" + "React Navigation
  Drawer v6" badge, and the "Quick Role Presets" row from Add/Edit Employee.**
  - `AdminDrawerNavigator`: `handleResetData()` + its menu item + the `menuDivider` removed;
    `storageService` import dropped; `drawerBadge`/`drawerBadgeText` header badge + styles removed.
    (`resetToSeedData()` stays in `storageService` — still used by first-run seeding.)
  - `EmployeeFormScreen`: "Quick Role Presets" chips row removed (with its `setAvatarKey` preset
    behavior) + the 5 preset styles; import trimmed to `getAvatarSource` only.
  - `assets/images/index.js`: `AVATAR_DP_PRESETS` export deleted (existed only for that row).
  - Verified zero remaining references; all 64 src files parse clean.
- **2026-10-19** — **Removed "Company Announcements" and "In-App Notifications" features entirely**
  (not implementing them; `fetch`/REST is not in the syllabus concepts list).
  - `AdminDrawerNavigator`: both menu items, their stack registrations, imports, and the
    unused `menuItemRow`/`unreadCountBadge`/`unreadCountText` styles removed.
  - **Deleted files:** `screens/admin/AnnouncementsFeedScreen.js`,
    `screens/admin/NotificationsScreen.js`, `store/slices/announcementsSlice.js`,
    `store/slices/notificationsSlice.js`, and `services/networkService.js`
    (the `fetch` demo service was only consumed by the announcements screen).
  - `store/index.js`: 9 → **7 slices** (announcements/notifications reducers removed).
  - `seedData.js`: `SEED_ANNOUNCEMENTS`/`SEED_NOTIFICATIONS` deleted;
    `storageService`: `@wms_announcements`/`@wms_notifications` keys + seed lines removed
    (12 `@wms_*` keys now).
  - Screens: 36 → **34**. Verified zero remaining references; touched files parse clean.
- **2026-10-19** — **Simplified AuthContext: merged `updateCurrentUserDP` + `updateAdminProfile`
  into a single `updateCurrentUser(fields)`.** Context now exposes exactly: `currentUser`,
  `isSplashLoading`, `login`, `updateCurrentUser`, `logout`.
  - `updateCurrentUser(fields)` merges any fields into the session user and mirrors them to
    `@wms_users` (returns `{ success, user }` / `{ success, error }`).
  - Updated all 6 call sites: `AdminProfileScreen` (profile fields + avatar), `HRProfileScreen`,
    `EmployeeProfileScreen`, `ManagerProfileScreen`, client `ProfileSettingsScreen` (avatar).
  - The ADMIN-only role gate was dropped — profile screens only expose their own controls.
- **2026-10-19** — **Company profile now survives app reload.**
  - Root cause: the `company` Redux slice is in-memory only (resets to `SEED_COMPANY` on reload)
    and nothing ever loaded the stored `@wms_company` value back into it, nor persisted saves.
  - Fix: `AuthContext` init now loads `STORAGE_KEYS.COMPANY` from AsyncStorage and dispatches
    `updateCompanyProfile` to hydrate the slice on boot; `CompanyProfileScreen.handleSave` now also
    writes the merged profile to `STORAGE_KEYS.COMPANY` alongside the Redux dispatch.
  - Dashboard org card (reads `state.company.name`) reflects the saved name after reload.
- **2026-10-19** — **Fixed admin-created users still "vanishing" after reload (root cause).**
  - Root cause: the demo-user purge in `storageService.initializeSeedDataIfNeeded()` ran on
    **every launch** and deleted any stored user without a truthy `companyId`. Employees created
    by a Company Admin who himself had **no** `companyId` (accounts created before company-scoping
    shipped, e.g. an older test admin) were saved without a `companyId`, so the next launch purged
    them — the observed "vanish on reload".
  - Fix 1: the purge is now a **one-time migration** guarded by new `STORAGE_KEYS.DEMO_USERS_CLEANED`
    (`@wms_demo_users_cleaned`) — it can never delete real users on later launches.
  - Fix 2: `AuthContext.login()` **backfills a `companyId`** onto any `ADMIN` missing one (and
    persists it), so every user such an Admin later provisions is correctly company-scoped and
    survives reloads.
- **2026-10-19** — **Users removed from Redux entirely. AsyncStorage `@wms_users` is the single
  source of truth** (moved user persistence out of the non-rehydrated Redux store).
  - `usersSlice.js` **deleted**; `users` reducer removed from `store/index.js` (9 slices remain).
  - `EmployeeDirectoryScreen`: loads scoped users from AsyncStorage into local state (mount +
    `navigation.addListener('focus')` reload); **active-toggle now persists to AsyncStorage**
    (was Redux-only); pull-to-refresh actually reloads.
  - `EmployeeFormScreen`: loads users from AsyncStorage on mount; waits (`isLoaded` gate) before
    rendering; edit fields prefilled after load; save writes AsyncStorage only (dispatches removed).
  - Manager/HR demo-portal screens (`TeamAttendance`, `TaskManagement`, `TaskDetail`,
    `SalaryEstimates`, `SalaryConfig`): same AsyncStorage `useState`/`useEffect` load replacing the
    `state.users` selector.
  - `client/ProfileSettingsScreen` (class): dropped `connect`/`updateOwnDP`; reads `currentUser`
    from AuthContext via `static contextType`; avatar updates via `updateCurrentUser`.
  - Only the logged-in user's identity lives outside storage: `AuthContext.currentUser` (session).
- **2026-10-19** — **Department logic removed entirely. Users are typed by ROLE only**
  (EMPLOYEE / MANAGER / HR / ADMIN / CLIENT).
  - `EmployeeFormScreen`: department chips/picker, `selectedDeptId` state and
    `departmentId`/`department` payload fields removed; role picker + manager hierarchy kept.
  - `EmployeeDirectoryScreen`: SectionList now **grouped by role** (was by department);
    department removed from search terms; `departments` selector dropped.
  - `AdminDashboardScreen`: Departments KPI card + Department Management shortcut removed;
    snapshot is now Total/Active/Deactivated.
  - `DepartmentManagementScreen.js` **deleted**; import + stack registration removed from
    `AdminDrawerNavigator`.
  - `usersSlice`: `departments` state, dept memberCount logic and
    `addDepartment/updateDepartment/archiveDepartment` reducers **removed** (nothing imported them).
  - `seedData.js`: `SEED_DEPARTMENTS` **deleted**; `storageService`: `@wms_departments` key +
    seed line removed.
  - `CompanyAdminsScreen`: created admins no longer get a `department` field.
  - Compatibility: `AttendanceActionScreen` no longer sends a department on check-in;
    `attendanceSlice` 'Engineering' fallbacks → `''`; HR Salary screens
    (Estimates/Config) guard the "• department" suffix so it disappears when absent.
  - Unchanged: demo attendance/leave/ticket seed datasets still carry old `department` label
    strings (display-only, no logic).
- **2026-10-19** — **Demo/seed users removed entirely.**
  - `seedData.js`: `SEED_USERS` deleted (Usman/Sana/Bilal/Ali/Hamza/Farhan/Tariq/Zainab/Sara/
    Zubair/Zafar + client). `SEED_DEPARTMENTS` kept (needed by Employee Form dropdowns).
  - `storageService.js`: `resetToSeedData` now seeds `USERS` as `[]`; `initializeSeedDataIfNeeded`
    gained a launch-time purge that drops any stored user **without a `companyId`** (clears old
    installs; every real user has one).
  - `usersSlice.js`: Redux `users` initial/reset state → `[]`.
  - `AuthContext.js`: login/profile lookups fall back to `[]`; comments updated. Login now only
    accepts: hardcoded Super Admin, Company Admins created by it, and users those admins created.
  - Removed `SEED_USERS` imports/fallbacks in AdminDashboard, EmployeeForm, CompanyAdmins,
    SuperAdminDashboard screens.
  - Neutralized demo-user string leftovers: login/form email placeholders, profile-screen
    email/name/phone/location fallbacks (Admin/Employee/Manager/HR profiles), drawer email
    fallback, ticket/leave/attendance payload fallbacks, TaskDetail "Assigned:" fallback.
  - Unchanged (out of scope): other Redux demo datasets (attendance, tasks, leaves, tickets,
    announcements) still seed for demo-role screens; department heads still show old seed names.
- **2026-10-19** — **Company-scoped users: a Super Admin-created Company Admin no longer sees demo/seed users.**
  - New `companyId` scope key on user objects. `CompanyAdminsScreen` generates `companyId: 'CO-###'`
    alongside `id: 'ADM-###'` when creating a Company Admin.
  - `AdminDashboardScreen`: Workforce Snapshot filters AsyncStorage users by
    `u.companyId === currentUser.companyId` when the admin has a companyId (focus-reload kept).
  - `EmployeeDirectoryScreen`: filters Redux users by the same rule.
  - `EmployeeFormScreen`: manager options scoped the same way; default manager is now the first
    manager of the company (demo admin still defaults to Bilal MGR-022; new admin gets `''` until
    they create a manager); NEW users get `companyId` in the payload — edits never touch `companyId`
    (avoids wiping it via merge-spread).
  - Seed users carry no companyId → demo admin (Usman, no companyId) still sees everyone
    (behavior unchanged). New company admin starts with an empty directory; counts begin at their
    own account. Known pre-existing limitation (unchanged): directory is Redux-based, so users
    added in a previous session only show on the AsyncStorage-backed dashboard after restart.
- **2026-10-19** — **Workforce Snapshot now counts real AsyncStorage data instead of the Redux demo seed.**
  - `AdminDashboardScreen`: users loaded from `storageService.getItem(STORAGE_KEYS.USERS)` into
    local `useState`, refreshed on mount AND on every screen focus via `navigation.addListener('focus', ...)`
    (so counts update right after returning from Employee Form / Directory). Departments KPI still
    from Redux (department CRUD is Redux-based, in-session). Nothing else changed.
- **2026-10-19** — **Demo company placeholders removed from the Company Admin experience; "Recent
  Administrative Activity" removed from Admin dashboard.**
  - `seedData.js` `SEED_COMPANY`: name/enterpriseId/mainCampus/timezone now start empty; unused
    `telemetryStatus` removed. Numeric geofence/payroll defaults kept (functional).
  - `AdminDashboardScreen`: org card renders only when `company.name` is set (enterprise ID and
    campus lines conditional); otherwise a "Set Up Your Company Profile" prompt card navigates to
    Company Profile; "Mon-Fri Shift" → derived `Shift Days: {workingDays.join('-')}`; fake
    "telemetry synced 2m ago" footer → honest geofence center readout; Recent Administrative
    Activity section + styles deleted.
  - `CompanyProfileScreen`: "Acme Tech Solutions" placeholder → "e.g. Your Company Name"; map pin
    "Acme Tech HQ" → "Company HQ"; campus presets renamed to plain city names (Lahore/Islamabad/Karachi).
  - `LoginScreen` + splash in `AppNavigator`: brand "Acme Tech Solutions" → "Workforce Management
    System" / "Multi-Company Workforce Administration Platform"; "Enterprise ID: WMS-PK-982" pill →
    "Secure Enterprise Session".
  - Note: demo strings in employee/manager/client demo-role screens (e.g. "Lahore Campus",
    "AcmeCorp-Internal" bssid) were intentionally left untouched (out of scope).
- **2026-10-19** — **Super Admin system implemented; public self sign-up removed.**
  - Deleted `screens/auth/RegisterScreen.js`; removed it from AuthStack and removed `register()` from AuthContext.
  - LoginScreen's "Create Admin / User Account" card replaced with an info card (accounts are issued; contact superadmin@wms.com).
  - New `utils/superAdminConfig.js` (hardcoded super admin creds/user); `login()` now checks it first.
  - New role `SUPER_ADMIN` + theme `#0F172A` in `utils/permissions.js` (+ `canManageCompanyAdmins`).
  - New `navigation/SuperAdminNavigator.js` (tabs: Dashboard, Company Admins; stack: SuperAdminProfile) wired into AppNavigator before the ADMIN branch.
  - New screens: `screens/superAdmin/SuperAdminDashboardScreen.js`, `CompanyAdminsScreen.js` (add/remove Company Admins in AsyncStorage USERS with role ADMIN + companyName), `SuperAdminProfileScreen.js` (read-only, dark mode, logout).
  - HeaderBar avatar press now routes SUPER_ADMIN → SuperAdminProfile.
  - Concepts kept within `concepts to be used.txt`; all touched files Babel-parse clean (eslint not installed in project).
- **2026-10-19** — Initialized `opencodeContext.md` from full codebase exploration on branch `Umar`
  (HEAD `a0d5701` "Some bugs fixed"; tree clean). Context reflects post-merge state of Samer's work
  ("App Uploaded", "feat(code): pushed the code that samer made") as currently checked out.
