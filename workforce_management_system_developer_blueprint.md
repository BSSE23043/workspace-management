# Workforce Management System (WMS) — Syllabus-Aligned Developer Blueprint & AI Coding Prompts

## 1. Local Assets Checklist (Download These Before Coding)

To match your uploaded Figma screens without relying on external internet image URLs that might fail offline, create a folder at **`src/assets/images/`** in your React Native project and download **10 small PNG/JPG images** with these exact filenames:

### A. User Profile Pictures / DPs (Square `400x400px` PNG or JPG)
1. **`dp_admin_usman.png`** — Professional headshot for **Usman Tariq** (Company Administrator) + used as the `"Executive"` DP preset in Admin's Add/Edit User screen.
2. **`dp_hr_sana.png`** — Professional headshot for **Sana Khan** (HR & Payroll Manager) + used as the `"HR"` DP preset.
3. **`dp_mgr_bilal.png`** — Professional headshot for **Bilal Ahmed** (Engineering Manager) + used as the `"Manager"` DP preset.
4. **`dp_emp_ali.png`** — Professional headshot for **Ali Raza** (Software Engineer II) + used as the `"Engineering"` DP preset.
5. **`dp_emp_hamza.png`** — Professional headshot for **Hamza Sheikh** / **Farhan Siddiqui** / **Tariq Mehmood** (Team members in Directory & Attendance).
6. **`dp_client_zafar.png`** — Professional headshot for **Zafar Ahmed** (`Zafar Corp` Client Representative).

### B. App Brand, Static Geofence Map & Evidence Banners
7. **`app_logo.png`** (`256x256px` PNG) — Minimal geometric 4-square grid icon (matching the top header icon next to `"WMS ADMIN"` and `"Login Screen"`).
8. **`map_lahore_campus.png`** (`800x450px` PNG/JPG) — A clean light-mode top-down street map screenshot (used inside `Company Profile & Geofence Policy` and Employee `Attendance` Check-In/Out screens; our React Native Flexbox code will draw the dashed 200m circle and location pin right on top of this `<Image>`).
9. **`telemetry_campus_hub.jpg`** (`800x400px` JPG) — An office/engineering team working at monitors photo (used inside the `"Workforce Hub Telemetry — Lahore Campus • Building B, Tier 2"` card on the `Manager Operational Dashboard`).
10. **`evidence_signout_sheet.jpg`** (`800x400px` JPG) — A photo of an open notebook/register on a desk with a pen (used inside the `"Attached Evidence (1 Document) — Security Desk Physical Sign-Out Sheet"` card on `HR Ticket Detail & Attendance Override`).

> **How About UI Icons?**
> You **do not** need to download individual PNG icons for buttons, tabs, or locks. Your coding agent will use `@expo/vector-icons` (`Ionicons` / `MaterialCommunityIcons` / `Feather`) which comes pre-bundled in Expo / React Native and provides every icon in your screenshots (`shield-checkmark`, `lock-closed`, `location`, `calendar`, `checkmark-circle`, `alert-triangle`, etc.).

---

## 2. Final Role Permissions & Navigation Architecture (Locked to Your Screenshots)

| Feature / Rule | ADMIN (`#1E293B`) | HR (`#0F766E`) | MANAGER (`#1D4ED8`) | EMPLOYEE (`#4338CA`) | CLIENT (`#92400E`) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Navigation Layout** | **Drawer Menu** + Dashboard Shortcut Cards (No Bottom Tabs) | **4-Tab Bottom Bar** (`Dashboard`, `Attendance`, `Payroll`, `Tickets`) | **4-Tab Bottom Bar** (`Dashboard`, `Team & Leave`, `Tasks`, `Requirements`) | **4-Tab Bottom Bar** (`Workspace`, `Attendance`, `Salary`, `Work & Requests`) | **2-Tab Bottom Bar** (`Dashboard`, `Milestones`) |
| **Account Provisioning & Editing** | **Sole Creator & Editor** of all user accounts + sets initial DP | Cannot create/edit accounts | Cannot create/edit accounts | Cannot create/edit accounts | Cannot create/edit accounts |
| **Own Profile Screen** | **Fully Editable** + Upload/Change DP | **Read-Only Locked Fields (`🔒`)** + **Can Upload/Change Own DP** | **Read-Only Locked Fields (`🔒`)** + **Can Upload/Change Own DP** | **Read-Only Locked Fields (`🔒`)** + **Can Upload/Change Own DP** | **Read-Only Locked Fields (`🔒`)** + **Can Upload/Change Own DP** |
| **Client Requirements** | View via Company Data | No Access | **Creates Requirements**, sets Client Deadlines, manages Milestones & publishes Broadcasts | No direct Client access (works on linked internal tasks) | **Review-Only:** Tracks Milestone progress, reads broadcasts & replies to clarifications (Cannot create requirements) |
| **Task Assignment & Dual Deadlines** | No Access | No Access | **Creates & Assigns Tasks** (`Team Task Board` bottom form) & resolves Deadline Conflicts | Updates own task state (`TO DO`, `IN PROGRESS`, `COMPLETED`) & posts progress notes | Strictly Hidden |

---

## 3. Syllabus Compliance Matrix (100% Topic Coverage)

| Syllabus Category | Required Topics / APIs | Exact Implementation in WMS |
| :--- | :--- | :--- |
| **1. Core Components & JSX** | `View`, `Text`, `Image`, `TextInput`, `React.createElement` vs JSX, ES6 (`let`/`const`, `===`, `{...spread}`) | Used across all screens. Local assets in `src/assets/images/` power `<Image>` avatars, maps, and evidence photos. `HeaderBar.js` builds its status pill using `React.createElement()` alongside JSX. |
| **2. Component Types & State** | Function components, Arrow Function components, `useState`, **Class Components** (`constructor`, `this.state`, `this.setState`) | • **Class Components:** `DepartmentManagementScreen.js` (Admin) and `ProfileSettingsScreen.js` (Shared across all 5 roles) are built using ES6 `class extends React.Component` with `constructor`, `this.state`, and `this.setState`.<br>• **Function & Arrow Components:** All remaining screens and reusable UI components. |
| **3. Styling, Layout & Responsiveness** | `StyleSheet.create`, inline styles, `dp`, fixed vs `'%'` sizes, `Dimensions` API, Flexbox (`row`, `column`, `row-reverse`, `column-reverse`, `flexWrap`) | • `Dimensions.get('window')` calculates responsive 2x2 KPI card widths (`width: '48%'`).<br>• `flexWrap: 'wrap'` used on Working Days pills, DP preset avatars, and Filter chips.<br>• `row-reverse` / `column-reverse` used in ticket audit timelines and task progress logs. |
| **4. Lists & Performance** | `ScrollView`, `FlatList`, `SectionList`, `VirtualizedList`, `data`, `renderItem`, `keyExtractor`, `ListHeaderComponent`, `ListFooterComponent`, sticky `renderSectionHeader`, `refreshing` + `onRefresh` | • **`SectionList`:** `EmployeeDirectoryScreen` (grouped by Department) and `CompanyAttendanceScreen` / `TeamAttendanceScreen` (grouped by Attendance Status) with sticky section headers and Pull-to-Refresh.<br>• **`VirtualizedList`:** `NotificationsScreen` (Admin Drawer).<br>• **`FlatList`:** `SalaryEstimatesScreen` (with ` Featured Audit ListHeaderComponent` and `Total Payroll ListFooterComponent`), `HRTicketListScreen`, `TaskManagementScreen`, `MyLeaveRequestsScreen`. |
| **5. Navigation & Routing** | `NavigationContainer`, `Stack Navigator`, `Bottom-Tabs Navigator`, `Drawer Navigator`, `navigation.navigate()`, `route.params`, Auth Guard (`AuthStack` vs `AppStack`) | • **Root Auth Guard:** Switches between `AuthStack` (`LoginScreen`) and `AppStack` based on `AuthContext`.<br>• **Drawer Navigator:** Used in the Admin portal (`Company Announcements`, `In-App Notifications`, `Editable Profile & Theme Settings`, `Quick Switch Demo Role`, `Reset AsyncStorage Seed Data`, `Logout`).<br>• **Bottom-Tabs + Stack Navigators:** Used across HR, Manager, Employee, and Client portals with `route.params` passed to Detail screens. |
| **6. Forms, Inputs & UX** | Controlled inputs (`value` + `onChangeText`), `secureTextEntry`, `KeyboardAvoidingView`, `useRef` focus chaining, pure validation functions, inline `&&` error messages, `ActivityIndicator` | • `LoginScreen`, `EmployeeFormScreen`, `DepartmentManagementScreen`, `TeamLeaveRequestsScreen`, `TaskManagementScreen`, and `MyLeaveRequestsScreen` use pure validation functions (`src/utils/validation.js`), conditional inline `&&` error banners, `KeyboardAvoidingView`, and `useRef`. |
| **7. Local Storage & JSON** | `AsyncStorage.getItem`, `AsyncStorage.setItem`, `JSON.stringify()`, `JSON.parse()`, immutable updates | Centralized in `src/services/storageService.js`. Loads seed data on mount via `useEffect` and persists Redux/Context state updates automatically. |
| **8. React Hooks Catalog** | `useState`, `useEffect`, `useRef`, `useContext`, `useReducer`, `useMemo`, `useCallback` | • **`useReducer`:** Powers complex form & GPS state in `SalaryConfigScreen.js` and `AttendanceActionScreen.js`.<br>• **`useMemo`:** Computes live payroll totals, KPI counts, and dual-deadline conflicts.<br>• **`useCallback`:** Wraps `renderItem` and Pull-to-Refresh handlers.<br>• **`useRef`:** Input focus chaining on Login & Add Employee screens. |
| **9. Hybrid Global State (Context API + Redux Toolkit)** | **Context API** (`createContext`, `Provider`, `useContext`) **AND** **Redux Toolkit** (`configureStore`, `createSlice`, reducers, actions, `useSelector`, `useDispatch`) | • **React Context API:** Manages `AuthContext.js` (active user session) and `ThemeContext.js` (Light/Dark mode + 5 role palettes).<br>• **Redux Toolkit (`@reduxjs/toolkit` + `react-redux`):** Manages all domain slices (`companySlice`, `usersSlice`, `attendanceSlice`, `salarySlice`, `leavesSlice`, `ticketsSlice`, `tasksSlice`, `requirementsSlice`, `announcementsSlice`, `notificationsSlice`). |
| **10. Networking & Async Operations** | REST API integration using `fetch()`, `async / await`, `Promises`, Splash Screen, Loading states, Error handling fallbacks | • `src/services/networkService.js` uses `fetch()` with `async/await` and `try/catch` offline fallbacks to sync live telemetry/compliance status on `AnnouncementsFeedScreen` and `ProfileSettingsScreen`. |

---

## 4. Core Formulas Reference

### 4.1 Geofence Distance Formula (Haversine Formula — `src/utils/geofence.js`)
Calculates the distance $d$ in meters between Employee GPS coordinates $(\phi_1, \lambda_1)$ and Office coordinates $(\phi_2, \lambda_2)$ with Earth radius $R = 6371000\text{ m}$:

$$
\Delta\phi = (\text{lat}_2 - \text{lat}_1) \times \frac{\pi}{180}, \quad \Delta\lambda = (\text{lon}_2 - \text{lon}_1) \times \frac{\pi}{180}
$$

$$
a = \sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1) \cdot \cos(\phi_2) \cdot \sin^2\left(\frac{\Delta\lambda}{2}\right)
$$

$$
d = 2 \cdot R \cdot \text{atan2}\left(\sqrt{a}, \sqrt{1-a}\right)
$$

### 4.2 HR-Configurable Salary Formula (`src/utils/salaryCalculator.js`)
Using HR's configured `baseSalary` ($S_{\text{base}}$), `workingDaysPerPeriod` ($W = 22$), `deductionPerAbsentDay` ($R_{\text{absent}} = 5000$), `deductionPerUnpaidLeaveDay` ($R_{\text{unpaid}} = 3500$), and fixed `allowances` ($B = 20000$):

$$
A_{\text{unexcused}} = \max\left(0, W - (P + L_{\text{paid}} + L_{\text{unpaid}})\right)
$$

$$
D_{\text{total}} = (A_{\text{unexcused}} \times R_{\text{absent}}) + (L_{\text{unpaid}} \times R_{\text{unpaid}})
$$

$$
S_{\text{net}} = S_{\text{base}} - D_{\text{total}} + B
$$

---

## 5. Sequential AI Coding-Agent Prompts (Copy & Paste Phase by Phase)

> **Tip:** When running each Phase Prompt below in Cursor, Windsurf, or Claude Code, drag-and-drop the corresponding role screenshots you uploaded here so the coding agent matches your exact card layouts and spacing!

---

### PHASE 1 PROMPT: Foundation, Local Assets Registry, Hybrid State (Context API + Redux Toolkit Slices) & Seed Data

```text
You are building a React Native (JavaScript) Workforce Management System (WMS) that strictly covers every topic in our React Native course syllabus and matches our finalized Figma UI screens.

In Phase 1, build the project folder structure, Local Assets registry, AsyncStorage service, Seed Data, React Context API providers (AuthContext + ThemeContext), Redux Toolkit store with slices, and pure utility modules.

STRICT TECHNICAL REQUIREMENTS:
1. Dependencies & ES6 Standards:
   - Use React Native (JavaScript), `@react-native-async-storage/async-storage`, `@reduxjs/toolkit`, `react-redux`, `@react-navigation/native`, `@react-navigation/native-stack`, `@react-navigation/bottom-tabs`, `@react-navigation/drawer`, and `@expo/vector-icons`.
   - Use ES6 modules (`import`/`export`), `let`/`const`, strict equality (`===`), and immutable object/array spread updates (`{...obj}`, `[...arr]`).

2. Local Assets Registry (`src/assets/images/index.js`):
   - Export a clean asset map referencing our 10 local images in `src/assets/images/` (with safe fallback URIs if a file is not yet placed):
     * `dp_admin_usman.png`, `dp_hr_sana.png`, `dp_mgr_bilal.png`, `dp_emp_ali.png`, `dp_emp_hamza.png`, `dp_client_zafar.png`
     * `app_logo.png`, `map_lahore_campus.png`, `telemetry_campus_hub.jpg`, `evidence_signout_sheet.jpg`
   - Also export `AVATAR_DP_PRESETS` containing the 4 role presets shown on our Add/Edit Employee screen (`Engineering`, `HR`, `Manager`, `Executive`) plus custom upload/selection support.

3. Storage Service (`src/services/storageService.js`):
   - Implement `getItem(key)`, `setItem(key, value)`, and `resetToSeedData()` using `AsyncStorage.getItem`, `AsyncStorage.setItem`, `JSON.parse()`, and `JSON.stringify()` with `async/await` and `try/catch`.
   - Never overwrite existing AsyncStorage data on app launch unless `resetToSeedData()` is called.

4. Seed Data Matching Final Figma Screens (`src/data/seedData.js`):
   - Company: `"Acme Tech Solutions"`, Enterprise ID `"WMS-PK-982"`, Main Campus Lahore (`31.5204, 74.3587`), `geofenceRadiusMeters: 200`, `timezone: "Asia/Karachi (GMT+05:00)"`, `workingDays: ["M","T","W","T","F"]`, `standardWorkingDaysPerMonth: 22`, `defaultAbsenceDeduction: 5000`, `defaultUnpaidLeaveDeduction: 3500`.
   - Departments (4): `"Engineering"` (Head: Bilal Ahmed, 12 Members), `"Human Resources"` (Head: Sana Khan, 3 Members), `"Product & Design"` (Head: Tariq Mehmood, 5 Members), `"Client Operations"` (Head: Hamza Sheikh, 4 Members).
   - Demo Users (matching our Quick Demo Role Switcher):
     * `ADMIN`: Usman Tariq (`usman@acmetech.com`, ID `ADM-001`, `"Lead Platform Architect & Admin"`, `"HQ - Islamabad, 4th Floor"`, `+92 300 9876543`)
     * `HR`: Sana Khan (`sana.khan@acmetech.com`, ID `HR-104`, `"HR Specialist"`, `"HR Bay, 2nd Floor (Station 204)"`, Emergency Contact `"Dr. Asim Khan (+92 321 5554321)"`)
     * `MANAGER`: Bilal Ahmed (`bilal.ahmed@acmetech.com`, ID `MGR-022`, `"Engineering Manager"`, `09:00 - 18:00 PKT`, `@bilal.eng`, Deputy Approver `"Farhan Siddiqui (Senior Lead)"`)
     * `EMPLOYEE`: Ali Raza (`ali.raza@acmetech.com`, ID `EMP-089`, `"Software Engineer II"`, reports to `Bilal Ahmed`, Base Salary `150000`, Transport Allowance `15000`, Internet Allowance `5000`, Emergency Contact `"Mrs. Raza (+92 345 9988776)"`, Address `"House 42, St 9, F-10/2, Islamabad"`) plus team members `Hamza Sheikh`, `Farhan Siddiqui`, `Sara Ahmed`, `Zubair Khan`, `Tariq Mehmood`, and `Zainab Malik`.
     * `CLIENT`: Zafar Ahmed (`ops@zafarcorp.com` / `zafar@zafarcorp.com`, Organization `"Zafar Corp"`, Phone `+92 300 8899112`, Tier `"Enterprise Partner"`).
   - Seed realistic records matching our screens:
     * Attendance logs (`Ali Raza` Checked-In `09:02 AM` at `14.2m`, `Bilal Ahmed` `08:48 AM - 05:12 PM`, `Tariq Mehmood` `HR Corrected` via `#TKT-4092`, `Farhan Siddiqui` `Unexcused Absent` Out of Bounds `520m`).
     * Salary Estimate for `Ali Raza`: `22` Working Days (`19` Present, `1` Paid Leave, `1` Unpaid Leave @ `-3,500 PKR`, `1` Absent @ `-5,000 PKR`), Base `150,000 PKR`, Deductions `-8,500 PKR`, Allowances `+20,000 PKR`, Net Payout `161,500 PKR`. Total Company Payroll `436,500 PKR`.
     * HR Tickets: `#TKT-101` (`Ali Raza` - `"Forgot to check out on Oct 12"`, Proposed Out `05:15 PM`, Evidence `IMG_7701.JPG`), `#TKT-102` (`Farhan Siddiqui` - `"Geofence boundary false negative"`), `#TKT-103` (`Tariq Mehmood` - `"Missing Internet Allowance reimbursement"`), `#TKT-104` (`Zainab Malik` - `"Annual leave quota discrepancy"`).
     * Leave Requests: `Ali Raza` (`Oct 20 - Oct 21, 2026`, `Annual Leave • Paid`, `2 Working Days`, Reason: `"Family emergency requiring travel to hometown..."`), `Hamza Sheikh` (`Oct 24, 2026`, `Casual Leave`).
     * Tasks: `#TSK-408` (`"Implement Local Auth Context"`, Assigned to `Ali Raza`, Internal Due `Oct 22, 2026`, Client Due `Oct 25, 2026` — `3 Days Buffer`), `#TSK-409` (`"Payment Gateway Webhook Sync"`, Assigned to `Farhan Siddiqui`, Internal Due `Oct 28, 2026`, Client Due `Oct 25, 2026` — `DEADLINE CONFLICT +3 Days Over Client Due`), `#TSK-412` (`"Geofence Perimeter Fallback Logic"`).
     * Client Requirements: `REQ-101` (`"Acme Multi-Tenant Auth & Billing"`, Due `Oct 25, 2026`, `3/5 Completed` milestones), `REQ-098` (`"Mobile Portal Dark Mode & Role Accents"`, Due `Oct 25, 2026`, `50% 1 of 2 Completed`), `REQ-104` (`"Offline CSV Export Module"`, Due `Nov 10, 2026`).

5. React Context API (`src/context/ThemeContext.js` & `src/context/AuthContext.js`):
   - `ThemeContext.js`: Manage `isDark` and exact role palettes:
     * `ADMIN`: `#1E293B` (Deep Slate Navy) + `#FFFFFF`
     * `HR`: `#0F766E` (Deep Emerald Teal) + `#FFFFFF`
     * `MANAGER`: `#1D4ED8` (Royal Blue) + `#FFFFFF`
     * `EMPLOYEE`: `#4338CA` (Deep Indigo) + `#FFFFFF`
     * `CLIENT`: `#92400E` (Deep Amber Bronze) + `#FFFFFF`
   - `AuthContext.js`: Manage `currentUser`, `isSplashLoading`, `login(email, password)`, `quickDemoLogin(roleId)`, `updateCurrentUserDP(avatarUri)`, `updateAdminProfile(fields)`, and `logout()`.

6. Redux Toolkit Store & Slices (`src/store/index.js` & `src/store/slices/*`):
   - Use `configureStore` and `createSlice` for `companySlice`, `usersSlice`, `attendanceSlice`, `salarySlice`, `leavesSlice`, `ticketsSlice`, `tasksSlice`, `requirementsSlice`, `announcementsSlice`, and `notificationsSlice`.
   - Enforce in `usersSlice` and `src/utils/permissions.js`:
     * **ONLY `ADMIN`** can create accounts (`addUser`), edit another user's account (`updateUser`), or edit their own text profile fields (`updateAdminProfile`).
     * **`HR`, `MANAGER`, `EMPLOYEE`, and `CLIENT`** cannot edit their profile text fields (`editable={false}`), but **ALL users** can upload/change their own Display Picture (`updateOwnDP({ userId, avatarUri })`).
     * **ONLY `MANAGER`** (or `ADMIN`) can create Client Requirements (`addRequirement`); **`CLIENT`** can only view requirement progress, milestones, and send clarification replies (`addClientClarificationReply`).
```

---

### PHASE 2 PROMPT: Reusable Components, Role-Specific Navigation & Screen 1 (Login & Demo Role Switcher)

```text
Now implement Phase 2: Reusable UI components, the role-specific React Navigation setup (matching our uploaded Figma navigation bars), and `LoginScreen.js`.

STRICT TECHNICAL REQUIREMENTS:
1. Reusable Components (`src/components/common/`):
   - `HeaderBar.js`: Supports two modes matching our screenshots:
     * Admin Mode: Left Hamburger Drawer icon (`navigation.openDrawer()`), center 4-square brand icon + `"WMS ADMIN / Dashboard"`, right circular user `<Image>` DP avatar button.
     * Role Mode (HR, Manager, Employee, Client): Left role subtitle + screen title (or `<` Back chevron on Stack detail screens), and right circular `<Image>` DP avatar button that navigates to that role's Profile screen.
     * Include a small status pill built using `React.createElement(View, ..., React.createElement(Text, ...))` to satisfy the "JSX vs React.createElement" syllabus topic.
   - `AppInput.js`: Controlled `TextInput` with `React.forwardRef`, optional right icon (`lock-closed` when `editable={false}`, or eye icon for `secureTextEntry`), and conditional inline validation error text rendered via `{Boolean(error) && <Text style={styles.errorText}>! {error}</Text>}`.
   - `AvatarPickerModal.js`: Reusable modal triggered whenever any user taps `"Change Profile Photo / Update Display Picture / Edit Avatar / DP"` on their Profile screen (or when Admin taps `"Change Employee DP"` on `EmployeeFormScreen`), allowing them to pick from `AVATAR_DP_PRESETS` or enter/upload a custom image URI and dispatch `updateOwnDP`.

2. Role-Specific Navigation (`src/navigation/`):
   - `AppNavigator.js`: Wrap in `<NavigationContainer>`. Switch between `AuthStack` (`LoginScreen`) and the authenticated role navigator based on `AuthContext.currentUser`.
   - Match each role's exact navigation structure from our screenshots:
     * **`ADMIN` Navigator:** Uses a **Drawer Navigator** (`AdminDrawerNavigator`) wrapping `AdminStackNavigator` (NO bottom tab bar). The Drawer matches `Drawer Menu.png` (`Usman Tariq (ADMIN)`, `"React Navigation Drawer v6"` badge, `"Company Announcements"`, `"In-App Notifications (3)"`, `"Editable Profile & Theme Settings"`, `"Quick Switch Demo Role"`, `"Reset AsyncStorage Seed Data"`, and bottom red `"Logout"`).
     * **`HR` Navigator:** Uses a **4-Tab Bottom-Tabs Navigator** (`Dashboard`, `Attendance`, `Payroll`, `Tickets`) with Stack screens for `SalaryConfigScreen`, `HRTicketDetailScreen`, and `HRProfileScreen`.
     * **`MANAGER` Navigator:** Uses a **4-Tab Bottom-Tabs Navigator** (`Dashboard`, `Team & Leave`, `Tasks`, `Requirements`) with Stack screens for `TeamLeaveRequestsScreen`, `TaskDetailScreen`, `RequirementCoordinationScreen`, and `ManagerProfileScreen`.
     * **`EMPLOYEE` Navigator:** Uses a **4-Tab Bottom-Tabs Navigator** (`Workspace`, `Attendance`, `Salary`, `Work & Requests`) with Stack screens for `MyLeaveRequestsScreen`, `MyHRTicketsScreen`, `MyTasksScreen`, and `EmployeeProfileScreen`.
     * **`CLIENT` Navigator:** Uses a **2-Tab Bottom-Tabs Navigator** (`Dashboard`, `Milestones`) with a Stack screen for `ClientProfileScreen` (since Client only reviews progress and does not submit requirements).

3. Screen 1 — `LoginScreen.js` (Matching `Login & Demo Role Switcher.png`):
   - Controlled `Work Email` and `Password` inputs wrapped in `<KeyboardAvoidingView>`, using `useRef` to jump from Email to Password.
   - Red inline conditional `&&` validation text below Password: `"! Password must be at least 6 characters"`.
   - `"Remember this device"` checkbox, `"Forgot Password?"` alert trigger, and solid `#1E293B` `"Sign In"` button.
   - `"OR QUICK DEMO ACCESS"` divider followed by the **Quick Demo Role Switcher** list (`Usman Tariq - Admin (Full Access)`, `Sana Khan - HR Specialist`, `Bilal Ahmed - Engineering Manager`, `Ali Raza - Software Engineer II`, `Zafar Corp - Client Representative`) with circular `<Image>` DPs for 1-tap login.
```

---

### PHASE 3 PROMPT: Company Administrator Module (Screens 2–7, Class Component, SectionList & Sole Account Provisioner)

```text
Now implement Phase 3: The Company Administrator Module matching our uploaded Admin screenshots (`#FFFFFF` + Deep Slate Navy `#1E293B`).

STRICT TECHNICAL REQUIREMENTS:
1. `AdminDashboardScreen.js` (Matching `Admin Executive Dashboard.png`):
   - Top `HeaderBar` with left Drawer `☰` icon and top-right Profile avatar button.
   - Organization Card: `"Acme Tech Solutions"`, `"Enterprise ID: WMS-PK-982"`, `"Active Org"` pill, `"Main Campus, Lahore"`, `"200m Geofence Active"`, `"Mon-Fri Shift"`, and `"Real-time telemetry synced 2m ago"`.
   - `"Workforce Snapshot"` 2x2 Flexbox grid using `Dimensions.get('window')` (`width: '48%'`): `Total Headcount (24)`, `Active Users (22)`, `Deactivated (2)`, `Departments (4)`.
   - `"Administrative Modules & Shortcuts"` cards navigating to:
     1. `CompanyProfileScreen` (*"Workplace, Geofence & Policy Setup"*)
     2. `DepartmentManagementScreen` (*"Department Management"*)
     3. `EmployeeDirectoryScreen` (*"Employee Directory"*)
   - `"Recent Administrative Activity"` timeline card at the bottom.

2. `CompanyProfileScreen.js` (Matching `Company Profile & Geofence Policy.png`):
   - `"Company Profile"` card: Controlled `Company Name`, `Timezone` selector, and `Active Working Days` row (`M T W T F S S` toggle pills using `flexWrap: 'wrap'`).
   - `"Office Location & Geofence Perimeter"` card: Static `<Image source={ IMAGES.mapLahoreCampus } />` container with centered `"Acme Tech HQ"` pin, dashed 200m radius circle, and controlled inputs for `Latitude (31.5204)`, `Longitude (74.3587)`, and `Radius (200m)`.
   - `"Default Salary & Deduction Policy"` card: Controlled numeric inputs for `Standard Working Days / Month (22)`, `Default Absence Deduction (5,000 PKR / day)`, and `Default Unpaid Leave Deduction (3,500 PKR / day)`.
   - `"Save Configuration"` button dispatching `updateCompanyProfile` to `companySlice`.

3. `DepartmentManagementScreen.js` (Matching `Department Management.png` — MUST BE AN ES6 CLASS COMPONENT):
   - Implement strictly as `class DepartmentManagementScreen extends React.Component` using `constructor`, `this.state`, and `this.setState`.
   - `"Quick Create Department"` card with controlled `TextInput` (`"e.g., Quality Assurance"`), red inline conditional `&&` error `"! Department name is required"`, and `"+ Add Department"` button.
   - Department cards (`Engineering`, `Human Resources`, `Product & Design`, `Client Operations`) showing member count pill, Department Head, subtitle, and working `"Rename"` and `"Archive"` buttons.
   - Footer text: `"Total: 4 Active Departments • Synced with AsyncStorage"`.

4. `EmployeeDirectoryScreen.js` (Matching `Employee Directory & Role Filter.png` — MUST USE `SectionList`):
   - Top `"+ Add User"` button navigating to `EmployeeFormScreen`.
   - Search bar, horizontal role filter chips (`All (24)`, `Employee (15)`, `Manager (4)`, `HR (2)`, `Client (1)`), `Status` & `Sort: A-Z` pills, and Pull-to-Refresh indicator (`"Refreshing directory..."`).
   - Render users in a `<SectionList>` with sticky section headers (`"DEPARTMENT: ENGINEERING (12)"`, `"DEPARTMENT: HUMAN RESOURCES (3)"`, etc.).
   - Each card shows the user's circular `<Image>` DP, name, email, role/department pills, `"Reports to: ..."` label, and an interactive `"Active"` `<Switch>` that toggles account activation in `usersSlice`. Tapping a card opens `EmployeeFormScreen` passing `{ userId: item.id }` via `route.params`.

5. `EmployeeFormScreen.js` (Matching `Edit User & Role Assignment.png`):
   - Since users cannot self-register or edit their own account details, Admin uses this screen to create/edit accounts and hand them over.
   - Top `"Set Employee DP (Profile Picture)"` section: 76dp circular `<Image>` preview, `"Change Employee DP"` button, and the 4 preset DP avatars (`Engineering`, `HR`, `Manager`, `Executive`).
   - Controlled inputs for `Full Name`, `Work Email Address`, and `Demo / Initial Password` (with eye toggle).
   - `"Assign System Access Role"` radio cards for `Employee`, `Manager`, `HR Specialist`, `Company Administrator`, and `Client Representative`.
   - `"Organizational Hierarchy"` card with `Assigned Department` and `Assigned Reporting Manager` selectors, plus the red inline `&&` warning: `"! Employees must have an assigned Manager for leave approval"`.
   - `"Account Active"` switch and `"Save User Record"` button dispatching to `usersSlice`.

6.Admin Drawer Shared Screens (`AnnouncementsFeedScreen.js`, `NotificationsScreen.js`, and `AdminProfileScreen`):
   - `AnnouncementsFeedScreen.js`: Uses `networkService.js` (`fetch()` with `async/await`) to display a live synced telemetry/tip banner at the top and a `<SectionList>` of company announcements.
   - `NotificationsScreen.js`: Implemented using React Native's `<VirtualizedList>` with Pull-to-Refresh to satisfy the `VirtualizedList` syllabus topic.
   - `AdminProfileScreen` (Matching `Admin View Profile & Account Settings.png`): The ONLY role profile screen where text inputs (`Full Name`, `Phone Number`, `Assigned Location`, `Job Title`) are editable (`editable={true}`) with a `"Save Profile Changes"` button, alongside `"Change Profile Photo"`, `"Security & Permissions"` card, and `"Dark Mode (ThemeContext)"` switch.
```

---

### PHASE 4 PROMPT: HR & Payroll Module (Screens 8–14, `useReducer`, `useMemo`, Attendance Override Sync & Read-Only HR Profile with DP Upload)

```text
Now implement Phase 4: The HR & Payroll Module matching our uploaded HR screenshots (`#FFFFFF` + Deep Emerald Teal `#0F766E`).

STRICT TECHNICAL REQUIREMENTS:
1. `HRDashboardScreen.js` (Matching `HR Operations & Payroll Dashboard.png`):
   - `"PAYROLL OPS CYCLE: Oct 15, 2026 • Live Synced"` banner.
   - `"Today's Attendance"` 2x2 KPI Grid (`Checked-In: 18`, `Unexcused: 02`, `Approved Leave: 02`, `Corrections: 03`).
   - `"HR Support Tickets"` card (`4 Active Inquiries • 2 Attendance Overrides Pending`) with `"Review Ticket Queue →"` button.
   - `"Cycle Deductions"` card (`Billable Work Days: 22 Days`, `Absent Deduction: 5,000 PKR / d`, `Unpaid Leave Rate: 3,500 PKR / d`) with `"Configure Deduction Policies >"` button navigating to `SalaryConfigScreen`.
   - `"Operational Activity"` feed at the bottom.

2. `CompanyAttendanceScreen.js` (Matching `Company-Wide Attendance Log.png` — MUST USE `SectionList`):
   - Date stepper (`< Oct 15, 2026 >` + `Today`), `All Departments (4 Active)` filter, status pills (`All 24`, `Present 18`, `Open Session 2`, `Absent 2`), and Pull-to-Refresh (`"Syncing GPS attendance logs..."`).
   - `<SectionList>` with sticky section headers: `"PRESENT & VERIFIED (18)"`, `"HR CORRECTED RECORDS (2)"`, and `"UNEXCUSED ABSENT (2)"`.
   - Footer card (`"Total Displayed: 22 Employees • ALL RECORDS SYNCED"`) and bottom batch bar (`"Audit Day Log"`).

3. `SalaryConfigScreen.js` (Matching `HR Salary & Custom Deduction Configuration.png` — MUST USE `useReducer`):
   - Segmented switcher between `"Company-Wide Default"` and `"Employee Override"` (selecting `Ali Raza`).
   - Use `useReducer` to manage `baseSalary (150,000)`, `expectedWorkingDays (22)`, auto-calculated `Standard Daily Pro-Rata Rate (6,818 PKR / day)`, `deductionPerAbsentDay (5,000)`, `deductionPerUnpaidLeaveDay (3,500)`, and dynamic `Fixed Allowances` (`Transport Allowance: 15,000 PKR`, `Internet & Utility Allowance: 5,000 PKR`, with `+ Add Allowance` and `-` remove buttons).
   - Display inline confirmation `"✓ Valid numeric deduction rates configured"` (or red `&&` error if invalid) and `"Save Salary Configuration"` button dispatching to `salarySlice`.

4. `SalaryEstimatesScreen.js` (Matching `Employee Salary Estimates & Audit Breakdown.png` — MUST USE `useMemo`):
   - Top month selector (`October 2026`) and `"Recalculate All"` button with `<ActivityIndicator />`.
   - Render `FEATURED AUDIT • LISTHEADERCOMPONENT` card for the selected employee (`Ali Raza`: `19 days Present`, `1 day Paid Leave`, `1 day Unpaid Leave`, `1 day Absent`, Base `150,000 PKR`, Itemized Deductions `-8,500 PKR`, Itemized Allowances `+20,000 PKR`, and `ESTIMATED NET PAYOUT: 161,500 PKR` with `"Export PDF"` and `"Lock Approval"` buttons).
   - Below, render the `"Team Queue"` `FlatList` (`Bilal Ahmed`, `Sana Khan`, `Tariq Mehmood` — tapping any employee loads their breakdown into the Featured Audit card) and `ListFooterComponent` (`"Total Company Estimated Payroll: 436,500 PKR"`).

5. `HRTicketListScreen.js` & `HRTicketDetailScreen.js` (Matching `HR Support Ticket Queue.png` & `HR Ticket Detail & Attendance Override.png`):
   - Queue screen: Status tabs (`Open 4`, `Progress 1`, `Waiting 0`, `Resolved 18`), category chips, and ticket cards navigating to `HRTicketDetailScreen` with `{ ticketId }`.
   - Detail screen: Shows Employee Note, `"Linked Attendance Override"` comparison (`Current System Log: Out Missing / 0.0h Deduct` vs `Proposed Adjustment: Out 05:15 PM / 8h 15m Full`), `"✓ Approve & Override Attendance"` button (which dispatches BOTH ticket resolution in `ticketsSlice` AND updates `Ali Raza`'s attendance record in `attendanceSlice` to `CORRECTED_PRESENT` so his salary estimate automatically recalculates!), `"Reject Override Request"` button, `<Image source={IMAGES.evidenceSignoutSheet} />` preview, and `"Audit & Discussion Timeline"` with reply input wrapped in `<KeyboardAvoidingView>`.

6. `HRProfileScreen` (Matching `HR View Profile & Credentials.png` — STRICTLY READ-ONLY DETAILS + DP UPLOAD ONLY):
   - Top avatar for `Sana Khan` with active `"📷 Update Display Picture"` button (opens `AvatarPickerModal` so HR can upload/change their own DP).
   - `"Operational Scope"` 2x2 privilege grid (`Attendance Override`, `Custom Deduction`, `Ticket Resolution`, `Monthly Payroll`).
   - `"Personnel Details (Managed by Admin)"`: Render `Full Name`, `Work Email`, `Direct Extension / Mobile`, `Office Station`, and `Emergency Contact` as **strictly read-only locked rows (`editable={false}` with lock icon `🔒`)** and DO NOT show a "Save Profile Information" button.
   - Bottom `"Preferences & Compliance"` switches, `"Switch Demo Role"`, and `"Log Out of Operations"` button.
```

---

### PHASE 5 PROMPT: Manager Module (Screens 15–21, Dual-Deadline Conflict Engine, Client Requirement Creation & Read-Only Manager Profile with DP Upload)

```text
Now implement Phase 5: The Manager Module matching our uploaded Manager screenshots (`#FFFFFF` + Royal Blue `#1D4ED8`).

STRICT TECHNICAL REQUIREMENTS:
1. `ManagerDashboardScreen.js` (Matching `Manager Operational Dashboard.png`):
   - Conditional `&&` **Dual-Deadline Conflict Alert** card at the top whenever any task's `employeeDeadline > clientDeadline` (`"Payment Gateway Webhook Sync • -3d slack • Internal Employee Due: Oct 28, 2026 vs External Client Due: Oct 25, 2026"`) with `"Review & Reschedule Task →"` button.
   - 2x2 KPI Grid (`Team Present: 8/10`, `Pending Leave: 2`, `Active Tasks: 6 (1 Conflict)`, `Requirements: 3`).
   - `"Workforce Hub Telemetry"` card rendering `<Image source={IMAGES.telemetryCampusHub} />`.
   - `"Management Controls"` navigation rows (`Assigned Team Attendance`, `Leave Review & Approvals`, `Team Task Board & Dual Deadlines`, `Client Requirement Sync`) and `"Recent Team Milestones"`.

2. `TeamAttendanceScreen.js` (Matching `Assigned Team Attendance.png`):
   - Filter strictly to employees where `managerId === currentUser.id`.
   - Date stepper, filter pills (`All 10`, `Present 8`, `On Leave 2`, `Absent 0`), `<SectionList>` with `"CHECKED-IN & ACTIVE (8)"` and `"ON APPROVED LEAVE (1)"` headers, and `"Export Daily Team Attendance Report (PDF/CSV)"` button.

3. `TeamLeaveRequestsScreen.js` (Matching `Team Leave Requests & Decision Review.png`):
   - Status tabs (`Pending Review 2`, `Approved 5`, `Rejected 1`).
   - Expanded decision card for `Ali Raza` with `"TEAM OVERLAP CHECK: Clear"`, Reason box, controlled `"MANAGER REVIEW COMMENT"` `TextInput`, red inline conditional `&&` validation alert `"! Review comment is required before approving or rejecting"`, and `"✓ Approve Leave"` / `"✕ Reject Leave"` buttons (dispatching to `leavesSlice`, which automatically updates HR's salary calculator).

4. `TaskManagementScreen.js` & `TaskDetailScreen.js` (Matching `Team Task Board & Dual-Deadline Assignment.png` & `Manager Task Detail & Progress Timeline.png`):
   - Task Board: Status tabs (`To Do`, `In Progress`, `Completed`), task cards highlighting `"⚠️ DEADLINE CONFLICT (+3 Days Over Client Due)"` vs `"✓ On Track (3 Days Safety Buffer)"`, and the bottom **"Create & Assign New Task"** form card (`Task Title`, `Assign To`, `Priority: Low/Med/High/Crit`, `Linked Requirement`, `Internal Employee Deadline`, live red conflict warning box, and `"Assign Task to Engineer"` button).
   - Task Detail: Shows `#TSK-408`, 50%/50% `"Schedule Risk Analysis"` comparing `Internal Employee Deadline (Oct 22, 2026)` vs `External Client Deadline (Oct 25, 2026)`, `"Chronological Progress Log"`, `"Post Manager Note"` input, and `"Mark Ready for Client Milestone Sync"` button.

5. `RequirementCoordinationScreen.js` (Matching `Client Requirement Coordination & Client Update.png` + Manager Requirement Creation):
   - Since Clients cannot create requirements, include a `"+ Create New Client Requirement"` collapsible form card at the top allowing the Manager to create a requirement for `Zafar Corp` (Title, Contractual Client Deadline, initial milestones) in `requirementsSlice`.
   - Below, render the active requirement (`REQ-101: Acme Multi-Tenant Auth & Billing`), `Lifecycle State` picker (`IN_PROGRESS`, `AWAITING_CLIENT`, `COMPLETED`), `+ ADD NEW MILESTONE` input, interactive `"Client Deliverable Milestones (3/5 Completed)"` checklist, `"Privacy Enforced Scope"` card with private task chips (`🔒 TSK-408`, `🔒 TSK-409`, `🔒 TSK-412`), and `"Publish Client-Visible Progress Update"` broadcast form.

6. `ManagerProfileScreen` (Matching `Manager View Profile & Workspace.png` — STRICTLY READ-ONLY DETAILS + DP UPLOAD ONLY):
   - Avatar for `Bilal Ahmed` with active `"✏️ Edit Avatar / DP"` button (opens `AvatarPickerModal` to upload/change DP).
   - `"Managerial Pulse"` row (`12 Direct Reports`, `98.2% Team Attendance`, `16 Sprint Tasks`) and `"Manager Privileges & Approvals"` card.
   - `"Personal & Contact Details (Managed by Admin)"`: Render `Full Name`, `Work Email`, `Mobile`, `Work Hours & Timezone`, and `Slack Handle` as **strictly read-only locked rows (`editable={false}` with lock icon `🔒`)** and remove the "Save Profile Details" button.
   - `"App Preferences"` switches (`Sound on Task submissions`, `Dark Mode`) and Logout button.
```

---

### PHASE 6 PROMPT: Employee & Client Portals (Screens 22–30, Haversine GPS, Read-Only Client Progress Review & Class Component Profile Logic)

```text
Now implement Phase 6: The Employee Module (`#FFFFFF` + Deep Indigo `#4338CA`), the Client Module (`#FFFFFF` + Deep Amber Bronze `#92400E`), and the shared `ProfileSettingsScreen` ES6 Class Component logic.

STRICT TECHNICAL REQUIREMENTS:
A. EMPLOYEE SCREENS (Matching Uploaded Employee Screenshots):
1. `EmployeeDashboardScreen.js` (`Employee Daily Workspace Dashboard.png`):
   - Welcome header (`Ali Raza`), `"ON-PREMISE ACTIVE • 09:02 AM"` card with `"Open GPS Map & Check Out"` button, `"October 2026 Salary Estimate: 161,500 PKR"` summary card, `"Active Task Deliverable (#TSK-408 • 65% Complete)"` card, 3 `"SELF-SERVICE ACTIONS"` tiles (`Request Leave`, `HR Support`, `Notices`), and `"Recent Attendance Logs"`.

2. `AttendanceActionScreen.js` (`Check-Out.png` — Haversine Formula + `useReducer`):
   - Top `<Image source={IMAGES.mapLahoreCampus} />` container with dashed 200m circle and `"Your Location (14.2m)"` pin.
   - `"Geofence Perimeter Validated • Within 200m Limit"` card showing live Haversine `Radial Distance: 14.2m`, `BSSID: AcmeCorp-Internal`, `Terminal 04-A`, and a demo GPS toggle to test `"Inside 200m (14.2m)"` vs `"Outside 200m (520m - Blocked)"`.
   - Primary `"Check Out of Current Shift"` / `"Check In to Current Shift"` button, `"Force GPS Refresh"` button, and `"Recent Punch Logs"`.

3. `MySalaryEstimateScreen.js` (`My Transparent Salary Estimate & Payslip.png`):
   - Hero net payout card (`161,500 PKR` + `"Download Official Payslip (PDF)"`), 2x2 `"Shift & Attendance Telemetry"` grid (`22 Expected`, `19 Present`, `1 Paid Leave`, `1 Unpaid Leave`) + `"Unexcused Absent: 1 Day (-5,000 PKR)"`, `"Itemized Policy Deductions (-8,500 PKR)"`, `"Itemized Monthly Allowances (+20,000 PKR)"`, and `"Transparent Salary Calculation Rule"` card with `"Discrepancy? Open an HR Ticket →"` link.

4. `MyLeaveRequestsScreen.js`, `MyHRTicketsScreen.js`, and `MyTasksScreen.js`:
   - `MyLeaveRequestsScreen.js`: Leave Type cards (`Annual Leave — Paid`, `Sick Leave — Paid`, `Casual / Unpaid 3,500 PKR/day`), Start/End Date inputs with red inline `&&` overlap error `"! Overlapping leave request detected for selected dates"`, `"Team Availability Check: Clear"`, Reason input, `"Submit Leave Request"` button, and `"My Submitted Requests"` list.
   - `MyHRTicketsScreen.js`: Category selector (`Attendance Correction`, `Salary Issue`), conditional `&&` `"Attendance Correction Details"` sub-card (`Target Work Date`, `Requested In`, `Requested Out`, `Telemetry Mismatch`), Subject, Explanation, attachment chip (`security_desk_signout.jpg`), `"Submit HR Ticket"` button, and `"Ticket History & Logs"` showing `#TKT-101` updated to `CORRECTED_PRESENT`.
   - `MyTasksScreen.js`: Filter tabs (`All`, `To Do`, `In Progress`, `Completed`), featured `#TSK-408` card showing strictly `Internal Employee Deadline: Oct 22, 2026`, state selector (`TO DO | IN PROGRESS | COMPLETED`), progress note input with validation, and `"✓ Save Progress Update"` button.

5. `EmployeeProfileScreen` (`Employee View Profile & Workplace.png` — READ-ONLY DETAILS + DP UPLOAD ONLY):
   - Avatar for `Ali Raza` with active `"📷 Change"` button (opens `AvatarPickerModal` to upload/change DP).
   - `"Telemetry & Leave Quota"` row (`Annual 14`, `Medical 06`, `Rate 96%`).
   - Both `"Personal Information"` (`Full Legal Name`, `Work & Personal Email`, `Mobile Contact`, `Emergency Primary Contact`, `Residential Address`) AND `"Employment & Assignment"` (`Reporting Manager`, `Designated Geofence`, `Shift Schedule`, `Monthly Base Bracket`) must be rendered as **strictly read-only locked rows (`editable={false}` with lock icon `🔒`)** and DO NOT show an "Update Personal Info" button.
   - Bottom `"Security & Terminal Settings"` (`Biometric Login`, `Terminal Night Mode` switches, and `"Terminate Session / Log Out"` button).

B. CLIENT SCREENS (Matching Uploaded Client Screenshots — REVIEW-ONLY + DP UPLOAD ONLY):
6. `ClientDashboardScreen.js` (`Client Portal Executive Dashboard.png` — NO REQUIREMENT SUBMISSION):
   - Welcome header (`Welcome, Zafar Corp Team`), 2x2 deliverable counter grid (`Submitted: 1`, `In Progress: 2`, `Attention: 1 Action Required`, `Completed: 4`).
   - **IMPORTANT:** Do NOT render the `"+ Submit New Project Requirement"` button or the `"Submit Req"` bottom tab—Clients can only review progress.
   - `"Recent Milestone Broadcasts"` cards (`Multi-Tenant Auth & Billing • 68% Completed`, `Mobile Portal Dark Mode & Role Accents • 50% Completed`) and `"Upcoming Client Milestones"` list.

7. `MyRequirementsScreen.js` (`My Requirements & Milestone Tracker.png`):
   - Filter pills (`All`, `Submitted`, `In Progress`), featured card (`REQ-098`) with `Milestone Progress: 50% (1 of 2 Completed)` progress bar, `"Verified Milestones"` list, `"Official Broadcasts From Engineering Management"`, and interactive `"Reply to Management Clarification"` input + `"Send Clarification Reply"` button, followed by `"Other Requirements"` (`REQ-101`, `REQ-104`).

8. `ClientProfileScreen` / Shared `ProfileSettingsScreen.js` (`Profile, Theme & Demo Storage Settings.png` — MUST BE AN ES6 CLASS COMPONENT):
   - Implement using an ES6 Class Component (`class ProfileSettingsScreen extends React.Component`) with `constructor`, `this.state`, and `this.setState`.
   - Top banner: `"🔒 Read-Only Client Profile: Contact Company Administrator to update organization details"`.
   - Avatar for `Zafar Ahmed` with active camera/upload badge so the Client can upload/change their own DP (`AvatarPickerModal`).
   - Render `Organization Name (Zafar Corp)`, `Client Representative (Zafar Ahmed)`, `Email (zafar@zafarcorp.com)`, `Phone (+92 300 8899112)`, and `Account Tier (Enterprise Partner)` as locked read-only fields (`🔒`).
   - `"Appearance"` card with `"Dark Mode Theme (ThemeContext)"` switch and `"Sign Out of Account"` button.
```