# WMS Backend — Task API

REST API used by the manager/employee **task management** screens. It stores
tasks in the MySQL schema at `src/schema/wms_schema.sql` (tasks, assignments,
and the `task_logs` timeline).

## 1. Database setup (required) — XAMPP only

This project uses **XAMPP**, not WAMP.

- You only need **XAMPP → MySQL**. You do **not** need XAMPP Apache for the
  mobile app, and you do **not** install or start WAMP.
- The Node backend is a separate server on port **5000**. It is not served by
  Apache/htdocs.
- phpMyAdmin (optional, easier import) is available at
  `http://localhost/phpmyadmin` after starting **Apache + MySQL** in XAMPP.
  If you only start MySQL, use the command-line import below.

The app does **not** work with tasks until XAMPP MySQL is running and the
schema has been imported.

1. **Start MySQL.** Open the XAMPP Control Panel → click **Start** next to
   **MySQL** (not WAMP).
2. **Create the database + tables** by running the schema once:

   **phpMyAdmin:** open `http://localhost/phpmyadmin` → Import →
   choose `workspaceManagement_backend/src/schema/wms_schema.sql` → Go.

   **Command line (PowerShell, XAMPP defaults):**

   ```powershell
   Get-Content -Raw 'src\schema\wms_schema.sql' | & 'C:\xampp\mysql\bin\mysql.exe' -u root
   ```

   The script creates `workspace_management` and all tables.

3. **Create the API config file:**

   ```powershell
   Copy-Item .env.example .env
   ```

   Then edit `.env` if your MySQL user/password differs. XAMPP defaults are:

   ```ini
   PORT=5000
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=workspace_management
   ```

4. **Install dependencies and start the API:**

   ```powershell
   npm install
   npm run dev      # nodemon, or: npm start
   ```

5. **Check it is running:** open `http://localhost:5000/api/health` — it should
   return `{"status":"ok","database":"connected"}`.

## 2. Connect the mobile app

The API base URL lives in:

```
workspaceManagement_frontend/src/config/api.js
```

- **Android emulator:** `http://10.0.2.2:5000/api` (already configured).
- **Physical phone:** replace `10.0.2.2` with your computer's LAN IP, e.g.
  `http://192.168.1.25:5000/api`, and keep the phone and PC on the same Wi-Fi.

## 3. Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | API + database health |
| POST | `/api/users/sync` | Mirror app accounts (`@wms_users`) into MySQL (needed for task foreign keys) |
| GET | `/api/tasks?companyId=CO-123` | List tasks for a company |
| GET | `/api/tasks/:id` | Single task |
| POST | `/api/tasks` | Create + assign a task |
| PATCH | `/api/tasks/:id` | Edit title/description/priority/deadlines/assignees |
| PATCH | `/api/tasks/:id/status` | Update status/progress (+ timeline note) |
| PATCH | `/api/tasks/:id/milestone-sync` | Mark/unmark client milestone sync |
| POST | `/api/tasks/:id/logs` | Add a progress-log / timeline message |

## 4. What `taskApi.js` does (read AND write)

`workspaceManagement_frontend/src/services/taskApi.js` is the app's API
client for tasks. It is **not read-only**:

| App function | HTTP call | What it does |
|---|---|---|
| `loadTasks()` | `GET /api/tasks` | reads the task list from MySQL |
| `createTask()` | `POST /api/tasks` | writes a new task + assignments |
| `editTask()` | `PATCH /api/tasks/:id` | writes title/priority/deadlines/assignees |
| `updateTaskStatus()` | `PATCH /api/tasks/:id/status` | writes status/progress + timeline note |
| `toggleMilestoneSync()` | `PATCH /api/tasks/:id/milestone-sync` | writes the milestone-sync flag |
| `addTaskLog()` | `POST /api/tasks/:id/logs` | writes a timeline message |

Every write returns the updated task list, so screens only do
`setTasks(await createTask(...))`.

It still reads AsyncStorage for two non-task things: `@wms_users` (to map app
user IDs to emails) and `@wms_auth_current_user` (for company scoping). Task
data is **never** read from or written to `@wms_tasks` anymore.

## 5. Database tables used by tasks

| Table | Purpose |
|---|---|
| `tasks` | One row per task. Includes `priority`, `is_milestone_synced`, `created_at`, status, progress and deadlines. |
| `task_assignments` | Which users (by email) are assigned to each task. |
| `task_logs` | Progress log / timeline messages (manager + employee notes). |
| `users` | Emails/names referenced by the tables above. |

Task assignees are stored in `task_assignments` by email because `users` uses
email as its primary key. The app keeps its account list in AsyncStorage, so
`taskApi` mirrors those accounts through `POST /api/users/sync` before task
reads/writes. Existing AsyncStorage tasks are **not** migrated automatically.

### Upgrading a database created from the older schema

`wms_schema.sql` is the source of truth for fresh installs. If your
`workspace_management` database was created before the task-log columns were
added, run the upgrade once:

```powershell
Get-Content -Raw 'src\schema\tasks_upgrade.sql' | & 'C:\xampp\mysql\bin\mysql.exe' -u root
```

This adds `tasks.priority`, `tasks.is_milestone_synced`, `tasks.created_at`
and creates the `task_logs` table.
