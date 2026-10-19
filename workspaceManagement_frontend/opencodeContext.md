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
  every screen loads the user list from it with local `useState`/`useEffect`. **Tasks and
  requirements are NOT in Redux either** — AsyncStorage `@wms_tasks` / `@wms_requirements` are the
  source of truth, read on demand by `services/taskService.js` / `services/requirementService.js`
  (screens load them on mount + focus into local state; mutations read→change→write). The
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
  `net = base − (unexcused × rateAbsent + unpaidLeave × rateUnpaid) + allowances`; W=22, 5000/3500 PKR rates; currency PKR.
- **Dual-deadline conflict** (`src/services/taskService.js`): tasks carry internal engineer due vs external client due;
  `bufferDays`, `hasConflict` computed at `createTask`.
- **Broadcast / reply timestamps** (`src/utils/timeAgo.js`): `timeAgo(createdAt)` → `Just now` / `12m ago` /
  `3h ago` / `18 Oct, 14:32`; returns `''` when an entry has no `createdAt` (older entries) so no false
  "Just now" is shown. Manager + client requirement screens both use it.

## 5. Source Map (`src/`)

```
src/
├── assets/images/          index.js asset map + 11 images (currently 1x1 px placeholder stubs)
├── components/common/      AppInput, DatePickerModal, HeaderBar, Icon
├── context/                AuthContext.js, ThemeContext.js
├── data/seedData.js        seed "database": company, salary config, HR tickets only;
│                           attendance / leaves / tasks / requirements seeds are
│                           now empty arrays
│                           — SEED_USERS + SEED_DEPARTMENTS + SEED_ANNOUNCEMENTS
│                           + SEED_NOTIFICATIONS **removed**
├── navigation/             AppNavigator + 5 role navigators + SuperAdminNavigator (see §4)
├── screens/                34 screens (see §6)
├── services/               storageService.js (AsyncStorage + seed/reset),
│                           taskService.js + requirementService.js (load/save + mutations)
├── store/                  index.js + slices/ (5 slices, see §7)
└── utils/                  geofence.js, imagePicker.js, permissions.js, salaryCalculator.js, superAdminConfig.js, timeAgo.js, validation.js
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
- **`DatePickerModal`** — custom calendar (no native picker); "today" is hardcoded to **2026-10-18**.
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
before rendering; **company-scoped** manager options; **email must be unique across every stored
account of any role/company** (re-reads the full `@wms_users` list on save and refuses the save
with an alert otherwise, excluding the record being edited); saves only to AsyncStorage with the
admin's `companyId`), `AdminProfileScreen` (only editable profile).
~~`AnnouncementsFeedScreen`~~ + ~~`NotificationsScreen`~~ **deleted** (features not implemented;
also removed from the admin drawer).

**hr/** — `HRDashboardScreen` (KPIs, ticket count), `CompanyAttendanceScreen` (SectionList by
attendance status, date filter), `SalaryEstimatesScreen` (FlatList w/ header+footer, per-employee
net pay via calculator, recalculate), `HRTicketListScreen`, `HRTicketDetailScreen` (chat timeline,
approve/reject; attendance-correction tickets also dispatch `overrideAttendance` → salary recalcs),
`SalaryConfigScreen` (**useReducer**; company-wide + per-employee overrides, allowances),
`HRProfileScreen` (read-only + DP upload).

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
guarded by an empty state, **Client Organization dropdown** — the Company Admin's `CLIENT` accounts for
this manager's company, read from AsyncStorage, with loading/no-clients notes and a required selection
that stamps `organization` + `clientId` + `clientEmail`/`clientRepresentative` onto the requirement,
milestones (add row + **minus button per milestone with a confirm dialog → `removeMilestone`**,
progress recalculated), lifecycle state, client broadcasts authored by the current user **plus a
"Published Broadcasts" history right under the publish button** — shows each broadcast's author
(`b.author`) and a `timeAgo(b.createdAt)` label, with an empty note before the first publish;
**plus a "Client Replies" list for the selected requirement** (`clarificationReplies` written by the
client app) with author + `timeAgo(cr.createdAt)` and an empty note, and each target chip's sub-label
shows the requirement's client-reply count so a reply is spotted even when another chip is selected),
`ManagerProfileScreen` (read-only + DP upload; no stats/pulse card).

**employee/** — `EmployeeDashboardScreen` (attendance card w/ geofence distance, salary estimate),
`AttendanceActionScreen` (**useReducer** GPS simulator, haversine INSIDE/OUTSIDE 200 m, blocks punch
outside), `MySalaryEstimateScreen` (transparent payslip, month cycles), `WorkAndRequestsHubScreen`
(segment switcher embedding the 3 screens below via `isEmbedded`), `MyLeaveRequestsScreen` (leave
types, date range, overlap validation), `MyHRTicketsScreen` (3 categories, correction details sub-card),
`MyTasksScreen` (status tabs, quick % progress), `EmployeeProfileScreen`.

**client/** — both requirement screens are **scoped to the logged-in client**: they filter on
`r.clientId === currentUser.id` (set by the manager's Client Organization dropdown at creation time),
so a client only ever sees requirements created against its own account, and render an empty-state
card when there are none; headers use `currentUser.name`. `ClientDashboardScreen` (deliverable KPIs, no
submit button), `MyRequirementsScreen` (milestone checklist read-only + clarification replies,
author = `currentUser.name`; `selectedReqId` state lets the client tap any "Other Requirements"
card to feature it — falls back to the first requirement; management broadcasts and the client's own
replies both show a `timeAgo(...)` label via `src/utils/timeAgo.js`), `ProfileSettingsScreen` (**class component**
reading `currentUser` from AuthContext via `static contextType`; DP updates go through
`updateCurrentUser` → session + AsyncStorage; all displayed details come from the provisioned
account + the admin-set Company Profile name loaded from `@wms_company` in `componentDidMount`).

## 7. Redux Store

`configureStore({ company, attendance, salary, leaves, tickets })`.
**State is in-memory only — NOT rehydrated from AsyncStorage**
(only the auth session + company profile persist). All reducers synchronous. **No users slice** — the user list
lives exclusively in AsyncStorage `@wms_users`; screens load it into local state.
**No `tasks` / `requirements` slices** — those datasets live in AsyncStorage `@wms_tasks` /
`@wms_requirements` and are read/written through `services/taskService.js` and
`services/requirementService.js` (screens hold them in local `useState`, load on mount + focus).

| Slice | State | Notable actions |
|---|---|---|
| company | flat company profile (geofence, policies) | updateCompanyProfile |
| attendance | `{ logs[] }` | checkIn (geofence-verified), checkOut, overrideAttendance (→ CORRECTED_PRESENT) |
| salary | `{ companyWide, overrides{} }` | updateCompanySalaryConfig, updateEmployeeSalaryOverride |
| leaves | `{ leaves[] }` | applyLeave (PENDING), approveLeave, rejectLeave |
| tickets | `{ tickets[] }` | createTicket (timeline), markInProgress, resolveTicket, reopenTicket, rejectTicket, addTicketMessage |

~~`announcements`~~ + ~~`notifications`~~ slices **deleted** (features removed);
~~`tasks`~~ + ~~`requirements`~~ slices **deleted** (moved to AsyncStorage — see §8).

## 8. Services & Storage

- **`storageService.js`** — AsyncStorage JSON wrapper; `STORAGE_KEYS` (12 `@wms_*` keys);
  `initializeSeedDataIfNeeded()` (first-run seed via `@wms_app_initialized` + one-time demo-user
  purge via `@wms_demo_users_cleaned`); `resetToSeedData()` (multiSet of all domain data;
  now internal only — the Admin drawer reset button was removed).
- **`taskService.js`** — tasks no longer in Redux. `loadTasks()` / `saveTasks()` over
  `@wms_tasks`; mutations `createTask` (computes bufferDays/hasConflict), `editTask`,
  `updateTaskStatus`, `toggleMilestoneSync`, `addTaskLog`. Each mutation does
  read → change → write → returns the fresh array, so screens do
  `setTasks(await createTask({...}))`.
- **`requirementService.js`** — same pattern over `@wms_requirements`:
  `loadRequirements()` / `saveRequirements()`; mutations `addRequirement`, `toggleMilestone`,
  `addMilestone`, `removeMilestone`, `publishBroadcast`, `addClientClarificationReply`,
  `updateLifecycleState`. A shared `recount()` helper keeps completed/total/progress % in sync.
- Consumer screens: ManagerDashboard, TaskManagement, TaskDetail, RequirementCoordination
  (manager); MyTasks, EmployeeDashboard (employee); ClientDashboard, MyRequirements (client).
  Each holds the list in local `useState`, loads on mount **and on
  `navigation.addListener('focus')`** (tab screens stay mounted), and gates the first render
  with an `isDataLoaded` flag so empty states don't flash.
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
- **Manager-facing seeds removed (2026-10-19):** `SEED_ATTENDANCE`, `SEED_LEAVES`, `SEED_TASKS`,
  `SEED_REQUIREMENTS` are now `[]`, so tickets `#TKT-101..104`, the salary example (Ali Raza net
  161,500 PKR / company payroll 436,500 PKR) and `SEED_HR_TICKETS` timelines are the only demo data
  left. Attendance/leave/task/requirement screens therefore open with their empty states until a
  real user punches in, applies, assigns or creates something.
- "Today" in `DatePickerModal` is still fixed at **Oct 18, 2026** (app-wide date convention); the
  manager screens I changed default their own date fields/deadlines from the real device date.

## 10. Known Caveats / Tech Debt

- No backend; the 5 Redux slices reset on app reload (auth session persists; users persist in
  AsyncStorage and are loaded into local state by each screen; tasks/requirements persist in
  AsyncStorage and survive reloads — they are the data a reload used to destroy).
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

- **2026-10-19** — **Resolved the `merge_Umar-2_Manal` conflict-resolution artifacts and audited Manal's changes for compatibility.**
  - Merge commit `e1bd7b2` (parents: `acbfa53` Umar-2, `ca2db91` origin/Manal) had a bad "Accept both
    changes" in `src/screens/employee/EmployeeDashboardScreen.js`: duplicate `activeTask` declaration
    (Babel parse error) and Manal's `calculateSalaryEstimate(...)` call with **no import** (would have
    been a runtime crash).
  - **Fix kept our Umar-2 versions** of `activeTask` (with the deliberately-left demo fallbacks
    `|| 'TSK-408'`) and `todayLog` (`|| 'EMP-089'`); deleted Manal's duplicate line 44. Added
    `calculateSalaryEstimate` to the `utils/salaryCalculator` import (line 15).
  - **Kept Manal's real-data salary/attendance logic** on the employee dashboard: `salaryConfig`
    selector (`state.salary` → `overrides`/`companyWide` — verified against `salarySlice.js`),
    `monthPrefix`/`monthLabel`, `recentLogs` (real punch history replacing hardcoded "Oct 15" rows),
    `myMonthLogs`, `presentDays`, `cfg`, `myEstimate` (real figure replacing hardcoded `161500`),
    and HR Support tile → `MyHRTickets` (route verified in `EmployeeNavigator.js:61`, matches our
    earlier "HR Support → HR Tickets" fix).
  - **Full audit of the other 24 merge-touched files — all compatible with Umar-2 work:**
    - `ticketsSlice.js` / `seedData.js`: `SEED_HR_TICKETS = []` and `SEED_SALARY_CONFIG.overrides = {}`
      (Manal removed HR demo seeds; matches our demo-removal direction; `storageService` still imports
      the now-empty arrays fine).
    - `salaryCalculator.js`: allowances term removed (`netSalary = S_base - D_total`); repo-wide grep
      confirms nothing reads `totalAllowances`/`allowanceItems` any more.
    - `attendanceSlice.js`: `overrideAttendance` now stamps real device date/time instead of hardcoded
      `'2026-10-12'`/`'09:02 AM'` defaults and fixes the bogus record lookup.
    - `DatePickerModal.js`: today-reference now real device date instead of hardcoded Oct 18, 2026.
    - `assets/images/index.js`: `evidenceSignoutSheet` key + `.jpg` deleted; `HRTicketDetailScreen`
      guards with `Boolean(ticket?.evidenceImageKey) && IMAGES[ticket.evidenceImageKey]`, and no
      runtime code sets that key anymore (old seeded tickets are gone).
    - `MyTasksScreen`/`MyLeaveRequestsScreen`/`MyHRTicketsScreen`: Manal removed the `EMP-089`/
      `TSK-408` fallbacks from those screens (harmless — `SEED_TASKS = []`, and `currentUser.id` is
      always set post-login); our dashboard fallbacks kept as agreed.
    - `WorkAndRequestsHubScreen`: Manal's `initialTab` param-clear improvement kept, but removed the
      **`useFocusEffect`** block (not an allowed concept in `concepts to be used.txt`; the identical
      `useEffect` on the same param already does the job) and the now-unused `useCallback` import.
    - Every selector used in merge-touched screens (`state.attendance/salary/leaves/tickets`) exists in
      the 5-slice store; `state.tasks`/`state.requirements` are **not referenced anywhere**; no screen
      is missing imports for `calculateSalaryEstimate`/`formatCurrency`/`timeAgo`/`loadTasks`.
    - `package-lock.json`: only a `"dev": true` flag added; `package.json` untouched. New doc
      `opencodeContext - manal.md` added by the merge (kept).
  - Full Babel walk: **TOTAL FILES 65, FAILURES 0.**

- **2026-10-19** — **Removed the dead "Privacy Enforced Scope" card from the manager requirement screen.**
  - Note: this was not a requirement in the list — it was a static card. It only ever rendered
    `activeReq.privateLinkedTasks`, a field that is initialised to `[]` in `addRequirement` and **never
    written anywhere** (no "link an internal task to a requirement" feature exists), so it permanently
    showed the placeholder "No internal tasks linked to this requirement yet." — demo content.
  - Removed the card block and its now-unused `privateTaskChipsRow` / `privateTaskChip` /
    `privateTaskText` styles from `RequirementCoordinationScreen.js`. The `privateLinkedTasks: []`
    field stays on the requirement model (harmless, keeps stored data compatible); nothing else read
    or rendered it. `privacyDesc` is kept — the broadcast card and empty-state still use it.
  - All 65 src files parse clean.
- **2026-10-19** — **Manager can remove a requirement (it disappears for the client too).**
  - Added `removeRequirement({ reqId })` to `src/services/requirementService.js` (filters and persists
    the list). `RequirementCoordinationScreen` now shows a circular minus button at the top-right of
    the active requirement card; clicking it opens an `Alert.alert` confirmation ("Remove {code} …
    Milestones, broadcasts and client replies will be deleted, and it will disappear from the client's
    dashboard"), calls `removeRequirement`, refreshes the list and clears the selected requirement.
    The header now uses `flexDirection: 'row', alignItems: 'flex-start'` with `flex: 1` on the text
    column; milestones reuse the same `minusBtn` style. Clients read from the same `@wms_requirements`
    storage, so the change propagates on their next focus.
- **2026-10-19** — **No automatic broadcast when a manager creates a requirement.**
  - Bug: `addRequirement` seeded every new requirement with an auto broadcast authored by
    "Engineering Management" ("Requirement created and scoped for …"), so the client's "Official
    Broadcasts" list always had an entry the manager never wrote.
  - Fix: `addRequirement` now stores `broadcasts: []` — only `publishBroadcast` ever adds broadcasts.
    Because that list can now genuinely be empty, the client screen shows a small empty note
    (`broadcastEmpty` style) like the manager's "Nothing published yet." one. No other logic changed;
    all 65 src files parse clean.
- **2026-10-19** — **Broadcasts and replies now show their real age (no more hardcoded "Just now").**
  - Bug: the client's requirement screen rendered the stored static string `{b.time}` ('Just now') for
    every broadcast, so even messages sent hours/days ago said "Just now", and the client's own
    messages showed no time at all. The manager's side relied on `cr.createdAt`, which replies saved
    before the previous fix did not have, so they also read as "Just now".
  - Fix: extracted the manager screen's helper into **`src/utils/timeAgo.js`** (`timeAgo(createdAt)` —
  the single implementation both sides now import); the client list renders `timeAgo(b.createdAt)` for
  management broadcasts and a new `timeAgo(cr.createdAt)` label on each of its own replies (new
  `replyHeaderRow` / `replyTime` styles); the manager screen imports the shared helper (local copy
  removed). `timeAgo` returns `''` when an entry has no timestamp, so legacy entries show no label
  instead of a wrong "Just now". `addRequirement`'s auto-created creation note now also stamps
  `createdAt` (it never had one, which is why it read "Just now" forever).
  - `ClientDashboardScreen`'s broadcast cards show no timestamp at all (unchanged, out of scope).
  - No new dependency; `src/utils/` files are the established pattern. All 65 src files parse clean.
- **2026-10-19** — **Client messages now visible to the manager on a requirement.**
  - Bug: the client's "Reply to Management Clarification" messages were saved correctly
    (`addClientClarificationReply` → `req.clarificationReplies`) but `RequirementCoordinationScreen`
    only ever rendered `targetReq.broadcasts`, so the conversation was one-way — manager → client
    showed up, client → manager vanished (data was there, nothing displayed it).
  - Fix: added a **"Client Replies ({code})"** list inside the same card as the broadcast history,
    rendering `targetReq.clarificationReplies` with the client's name, `timeAgo(cr.createdAt)` and the
    message body, plus an empty note; each target-client chip now shows its requirement's reply count
    (`{code} • 2 client replies`) so the manager can spot a reply even when another chip is selected.
    `addClientClarificationReply` now also stamps `createdAt: Date.now()` (same as `publishBroadcast`)
    so the time-ago label is real; the screen already reloads from AsyncStorage on focus.
  - No new concept/dependency (reused existing card/item styles + nested ternaries). Both files parse clean.
- **2026-10-19** — **Client can now open any requirement from "Other Requirements & Modules".**
  - Bug: in `MyRequirementsScreen` the "other" cards were plain `<View>`s (no `onPress`) and the
    details card was hardwired to `clientRequirements[0]`, so tapping another requirement did
    nothing — only the first (or latest) requirement ever displayed.
  - Fix: added `selectedReqId` state (same pattern as the manager's `RequirementCoordinationScreen`),
    `featuredReq = clientRequirements.find(r => r.id === selectedReqId) || clientRequirements[0]`
    (resource-safe fallback when a selected requirement disappears), and turned each "other" card
    into a `TouchableOpacity` calling `handleSelectRequirement(req.id)`. The card list updates
    automatically (`otherReqs` excludes whatever is featured), the previously featured requirement
    drops back into the list, and the `ScrollView` (now with a `useRef`) scrolls to the top so the
    switched requirement's milestones/broadcasts/reply box are visible immediately. A small
    "Tap to view details →" hint was added to the cards. Clarification replies follow the selected
    requirement (`handleSendClarification` already used `featuredReq`).
  - No new concept/dependency (`useState` + `useRef` + `TouchableOpacity` + template-free ternaries).
    File parses clean.
- **2026-10-19** — **Client profile now shows the real client account + admin-set organization (demo persona removed).**
  - Every client saw the same hardcoded persona: `ProfileSettingsScreen`'s local state seeded
    `representative: 'Zafar Ahmed'`, `orgName: 'Zafar Corp'`, `clientEmail: 'zafar@zafarcorp.com'`,
    `clientPhone: '+92 300 8899112'`, `tier: 'Enterprise Partner'`, and the avatar fell back to
    `IMAGES.dpClientZafar`. None of it existed on the client's actual user record.
  - `ProfileSettingsScreen` (class component) now reads its data from the two real sources:
    the account the Company Admin provisioned via `EmployeeFormScreen` (`currentUser.name` /
    `currentUser.email` / `currentUser.phone`, shown as `—` when empty) and the **Company Profile**
    name the admin saved on the Admin screen (`@wms_company`), read in `componentDidMount` into
    `state.orgName` (stack screen → fresh mount each visit). Demo state fields deleted.
  - Removed the fake "Enterprise Partner" tier tag **and** the "Account Tier" read-only row (the
    system has no tier field); `handleSignOut` alert now says `Sign out of {orgName}?`, and the
    avatar fallback now uses the shared `getAvatarSource` default instead of the "Zafar" demo DP
    (registry entry `dpClientZafar` left in place). Nothing else changed; file parses clean.
- **2026-10-19** — **Removed the fake "PARTNER TIER" badge from the Client dashboard.**
  - `ClientDashboardScreen` HeaderBar: dropped `statusText="PARTNER TIER"` / `statusColor` and set
    `showStatus={false}` (dropping the text alone would show HeaderBar's default pill `ONLINE`).
    Only screen that had that label; file parses clean.
- **2026-10-19** — **Client dashboard "Contract Deliverables Status" tiles are now real numbers.**
  - The four KPI tiles were hardcoded demo values (`1 Submitted / 2 In Progress / 1 Attention
    Required / 4 Completed`) that never changed — "Submitted" wasn't even a state the data model has.
  - `ClientDashboardScreen` now derives them from `clientRequirements` (the client-scoped list
    already loaded from AsyncStorage): **Total Requirements** = `length`; **In Progress** /
    **Awaiting Client** / **Completed** = counts of `lifecycleState` `'IN_PROGRESS'` /
    `'AWAITING_CLIENT'` / `'COMPLETED'` (the three states the manager cycles through via
    `requirementService.updateLifecycleState`). A client with no requirements sees four honest zeros.
  - Layout, colors, labels style and everything else on the screen untouched. File parses clean.
- **2026-10-19** — **Removed the "Leave Review & Approvals" navigation row from the Manager dashboard.**
  - `ManagerDashboardScreen` "Management Controls" list is now 3 rows (Assigned Team Attendance,
    Team Task Board & Dual Deadlines, Client Requirement Sync); the leave-approval row was a
    duplicate entry point into the same `Team & Leave` screen the attendance row already opens.
  - The `Team & Leave` screen, its route, and the pending-leave KPI on the dashboard are untouched —
    only the dashboard row was deleted. All 64 src files parse clean.
- **2026-10-19** — **Tasks & requirements removed from Redux entirely; AsyncStorage is now the
  single source of truth for both (loaded on demand).**
  - Why: the store was never rehydrated, so any requirement/task existed only in memory —
    creating one and reloading the app made it vanish. `@wms_tasks` / `@wms_requirements` were
    written at first-run seed (`[]`) but never read back.
  - **Deleted** `store/slices/tasksSlice.js` + `store/slices/requirementsSlice.js`;
    `store/index.js` is now **5 slices** (`company, attendance, salary, leaves, tickets`).
  - **New** `services/taskService.js` — `loadTasks()` / `saveTasks()` over `@wms_tasks` plus the
    reducer logic moved verbatim into async mutations: `createTask` (bufferDays/hasConflict math),
    `editTask`, `updateTaskStatus`, `toggleMilestoneSync`, `addTaskLog`. Unused `rescheduleTask` /
    `resetTasks` dropped.
  - **New** `services/requirementService.js` — same pattern over `@wms_requirements`:
    `addRequirement` (keeps `clientId`/`clientEmail`), `toggleMilestone`, `addMilestone`,
    `removeMilestone`, `publishBroadcast` (stamps `createdAt`), `addClientClarificationReply`,
    `updateLifecycleState`; shared `recount()` keeps completed/total/progress % in sync; unused
    `resetRequirements` dropped. Every mutation does read → change → write → returns the fresh
    array, so screens just `setRequirements(await publishBroadcast({...}))`.
  - **Migrated all 8 consumer screens** off `useSelector`/`useDispatch` for these datasets:
    ManagerDashboard, TaskManagement, TaskDetail, RequirementCoordination, MyTasks,
    EmployeeDashboard, ClientDashboard, MyRequirements. Each keeps the list in local `useState`,
    loads on mount **and on `navigation.addListener('focus')`** (allowed concept; tab screens stay
    mounted so focus is what keeps them fresh), and gates the first render with an `isDataLoaded`
    flag so empty states/KPIs don't flash while storage is being read.
  - `TaskDetailScreen` also gained a graceful "task no longer exists" state (its render used an
    unguarded `task.assignedToNames`, which would have crashed on a truly empty list).
  - Kept in Redux untouched: attendance, leaves, tickets, salary, company (+ all their dispatch
    sites). `SEED_TASKS`/`SEED_REQUIREMENTS` stay `[]` purely so the first-run seed can write the
    keys. Verified: no `state.tasks`/`state.requirements`/slice imports remain anywhere, and all
    64 src files parse clean (Babel walk).
  - Not done (deferred to a later step, per user): moving the `theme` value out of
    `ThemeContext` into Redux.
- **2026-10-19** — **Manager now sees the broadcasts he publishes (author + time ago).**
  - Bug: the "Publish Client-Visible Progress Update" card had no output — a broadcast was dispatched
    and confirmed with an alert, but the requirement screen never rendered `broadcasts`, so the
    manager had no way to read back what he had sent.
  - `requirementsSlice.publishBroadcast`: now also stamps `createdAt: Date.now()` on each broadcast
    (`time: 'Just now'` kept so the client screens' existing `b.time` usage is untouched).
  - `RequirementCoordinationScreen`: new module-level `timeAgo(createdAt)` helper (→ `Just now`,
    `Xm ago`, `Xh ago`, else `D Mon, H:MM`, no library) and a "Published Broadcasts ({targetReq.code})"
    list directly under the publish button, rendered from `targetReq.broadcasts` — i.e. the same
    requirement the target chips point at, so a freshly published broadcast shows immediately.
    Each item shows the publisher (`b.author`, e.g. "Umar (Engineering Manager)"), the time-ago on
    the right, and the content; empty state before the first publish. New `broadcastHistory*` styles.
  - Client-facing `time`/author display and the publish flow itself are unchanged; no dependency or
    concept added. All 64 src files parse clean.
- **2026-10-19** — **Requirement milestones can be removed (minus button next to each milestone).**
  - `requirementsSlice`: new `removeMilestone({ reqId, milestoneId })` reducer filters the milestone
    out and then recalculates `completedMilestones` / `totalMilestones` / `progressPercent` (0% when
    none are left), mirroring the existing `toggleMilestone` bookkeeping; exported alongside the
    other actions.
  - `RequirementCoordinationScreen`: a circular minus button now sits at the end of every row in the
    "Client Deliverable Milestones" list (the row's `flex: 1` title keeps it right-aligned). It
    nests inside the row's toggle `TouchableOpacity`, so tapping the minus removes instead of
    ticking the milestone. `handleRemoveMilestone` shows an `Alert` confirm (Cancel / Remove,
    destructive) before dispatching. New `removeMilestoneBtn`/`removeMilestoneBtnText` styles.
  - Clients stay review-only: they simply see the shorter list and the recalculated progress on
    dashboard + Milestones tab. No dependency or concept added; all 64 src files parse clean.
- **2026-10-19** — **Requirement creation now picks the client from a dropdown; requirements are
  attached to (and only visible to) that client.**
  - `RequirementCoordinationScreen`: the free-text "Client Organization" `AppInput` is gone. In its
    place is a dropdown (select button + expandable option list) fed by `useEffect` →
    `storageService.getItem(STORAGE_KEYS.USERS)` filtered to `role === 'CLIENT'` **and the manager's
    `companyId`** (all clients if the manager has no company tag) — i.e. exactly the clients the
    Company Admin provisioned for that company. Each option shows name + email; loading, no-clients
    ("ask your Company Admin…") and "select a client…" placeholder states are handled.
  - Creating a requirement now requires a selected client and dispatches
    `organization = client.name`, `clientRepresentative = client.email || client.name`,
    `clientId`, `clientEmail` + the existing title/deadline; selection resets after save. The dead
    `orgChip*` styles left from the earlier chips removal were dropped.
  - `requirementsSlice.addRequirement`: stores `clientId`/`clientEmail` on the requirement; the demo
    defaults `organization = 'Zafar Corp'` / `clientRepresentative = 'Zafar Ahmed'` became `''`
    (a requirement can no longer silently attach to a fabricated client).
  - `ClientDashboardScreen`: renders only `requirements.filter(r => r.clientId === currentUser?.id)`
    with an empty-state card; header `subtitle` and welcome line now use `currentUser.name` instead
    of hardcoded "Zafar Corp".
  - `MyRequirementsScreen`: same `clientId` filter (featured = first match, already null-guarded),
    empty-state card for the list, clarification author and header subtitle now use `currentUser.name`.
  - Untouched on purpose: client dashboard KPI tiles still show the hardcoded demo counts
    (1 / 2 / 1 / 4) — separate leftover, unrelated to client attachment; `ProfileSettingsScreen`
    still seeds `orgName: 'Zafar Corp'` in its own local state; `DatePickerModal` still fixed to
    Oct 18, 2026.
  - No dependency/concept added (`useEffect` + AsyncStorage + ternaries/chips-style lists).
    All 64 src files parse clean.
- **2026-10-19** — **Unique email enforced when a Company Admin creates/edits a user.**
  - Problem: `EmployeeFormScreen` saved whatever email was typed, so two accounts (any roles) could
    share an email — and login resolves the first match only, silently locking the other account out.
  - `EmployeeFormScreen`: `handleSave` is now `async`; after the name/format checks it normalizes the
    email, re-reads the **full** `STORAGE_KEYS.USERS` list (not the company-scoped directory subset,
    so duplicates in another role, another company or the Super Admin's Company Admin accounts are
    caught), and refuses the save with a `Validation Error` alert if any stored `u.email` matches
    case-insensitively — excluding the record being edited (`u.id !== existingUser?.id`) so an
    unchanged email still saves. The old fire-and-forget persist IIFE became awaited `try/catch`
    with the same `console.warn`; success alerts unchanged.
  - Already correct elsewhere: `CompanyAdminsScreen.handleAddAdmin` already performed this exact
    role-agnostic check; self sign-up was deleted earlier. No other write path creates users.
  - No dependency or concept added (async/await + `storageService` + `Alert`, all already used).
    All 64 src files parse clean.
- **2026-10-19** — **Removed the fake `"TEAM ONLINE"` status badge from the Manager dashboard.**
  - `ManagerDashboardScreen`: `statusText="TEAM ONLINE"` + `statusColor="#1D4ED8"` replaced with the
    existing `showStatus={false}` prop (added earlier for the Admin dashboard). Dropping `statusText`
    alone was not enough because `HeaderBar` defaults it to `'ONLINE'`.
  - No other screen, prop or dependency touched; `HeaderBar` itself unchanged. Parses clean.
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
