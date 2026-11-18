// ---------------------------------------------------------------------------
// TASK API — the ONLY place the app talks to the task backend.
//
// This file is NOT read-only. It is the API client for the task backend, so it
// both READS tasks from MySQL and WRITES changes back to MySQL.
//
//   READ operations (GET)                  WRITE operations (POST / PATCH)
//   -----------------------------------    ------------------------------------
//   loadTasks()       GET /api/tasks       createTask()           POST /tasks
//                                          editTask()             PATCH /tasks/:id
//                                          updateTaskStatus()     PATCH /tasks/:id/status
//                                          toggleMilestoneSync()  PATCH /tasks/:id/milestone-sync
//                                          addTaskLog()           POST /tasks/:id/logs
//
// Every write function returns the fresh task list, so screens only do:
//
//   const nextTasks = await createTask({ ... });
//   setTasks(nextTasks);
//
// WHERE THE DATA COMES FROM:
//   - Task data ............ MySQL `tasks` + `task_assignments` tables (via API)
//   - Task logs/priority ... MySQL columns `tasks.priority`,
//                            `tasks.is_milestone_synced`, `tasks.created_at`
//                            and the `task_logs` table
//   - User accounts ........ MySQL `users` (read with GET /api/admin/users?companyId=...)
//                            and mapped to the app's email/id shape.
//   - Company scoping ...... the logged-in user's companyId supplied by the screen.
//
// IMPORTANT: no task or user is read from or written to AsyncStorage here.
// ---------------------------------------------------------------------------

import { API_BASE_URL } from '../config/api';
import { fetchCompanyUsersApi } from './api';
import { timeAgo } from '../utils/timeAgo';

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

const request = async (path, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const raw = await response.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch (err) {
    data = null;
  }

  if (!response.ok) {
    const message =
      (data && (data.error || data.message)) || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data;
};

// users/companies live in MySQL now, so task screens pass the logged-in
// company's id and we read the roster from the same backend.
const loadCompanyUsers = async (companyId) => {
  if (!companyId) {
    throw new Error('A companyId is required to load task users.');
  }
  return fetchCompanyUsersApi(companyId);
};

// ---------------------------------------------------------------------------
// Local user lookup (id <-> email)
// ---------------------------------------------------------------------------

const buildUserMaps = (users) => {
  const byEmail = new Map();
  const byId = new Map();

  users.forEach((user) => {
    if (user.email) byEmail.set(user.email.toLowerCase(), user);
    if (user.id) byId.set(String(user.id), user);
  });

  return { users, byEmail, byId };
};

const resolveUserEmail = (maps, { email, name } = {}) => {
  if (email) {
    const found = maps.byEmail.get(String(email).toLowerCase());
    return found ? found.email : email;
  }

  if (name) {
    const found = maps.users.find((user) => user.name === name);
    if (found && found.email) return found.email;
  }

  return null;
};

// Resolves the current manager's email for tasks.created_by_email.
const resolveCreatorEmail = (maps, { createdByEmail, createdByName } = {}) => {
  if (createdByEmail) {
    const found = maps.byEmail.get(String(createdByEmail).toLowerCase());
    return found ? found.email : createdByEmail;
  }

  const byName = maps.users.find(
    (user) =>
      user.name === createdByName && (user.role === 'MANAGER' || user.role === 'ADMIN')
  );
  if (byName && byName.email) return byName.email;

  throw new Error(
    'Could not determine the manager account. Make sure you are signed in with a Manager account that has an email address.'
  );
};

const resolveAssigneeEmails = (maps, payload) => {
  const fromIds = (payload.assignedToIds || [])
    .map((id) => maps.byId.get(String(id))?.email)
    .filter(Boolean);

  if (fromIds.length > 0) return Array.from(new Set(fromIds));

  const fromEmails = (payload.assignedToEmails || []).filter(Boolean);
  if (fromEmails.length > 0) return Array.from(new Set(fromEmails));

  // Compatibility fallback for callers that only pass names.
  const names = payload.assignedToNames || (payload.assignedToName ? [payload.assignedToName] : []);
  return Array.from(
    new Set(
      names
        .map((name) => maps.users.find((user) => user.name === name)?.email)
        .filter(Boolean)
    )
  );
};

// ---------------------------------------------------------------------------
// DB task -> app task
// ---------------------------------------------------------------------------

const mapTaskFromApi = (apiTask, maps) => {
  const assignedToEmails = apiTask.assignedToEmails || [];
  const assignedToIds = assignedToEmails.map(
    (email) => maps.byEmail.get(String(email).toLowerCase())?.id || email
  );
  const assignedToNames = (apiTask.assignedToNames || []).length
    ? apiTask.assignedToNames
    : assignedToEmails;

  return {
    ...apiTask,
    code: apiTask.code || `#${apiTask.id}`,
    assignedToEmails,
    assignedToIds,
    assignedToId: assignedToIds[0] || '',
    assignedToNames,
    assignedToName: assignedToNames.join(', ') || 'Unassigned',
    logs: (apiTask.logs || []).map((log) => {
      const timestamp = log.createdAt ? new Date(log.createdAt).getTime() : null;
      return {
        ...log,
        createdAt: timestamp,
        time: timestamp ? timeAgo(timestamp) : '',
      };
    }),
  };
};

const withCompanyFilter = (companyId) =>
  companyId ? `?companyId=${encodeURIComponent(companyId)}` : '';

// ---------------------------------------------------------------------------
// Public API
//
// READ FUNCTIONS  : loadTasks
// WRITE FUNCTIONS : createTask, editTask, updateTaskStatus,
//                   toggleMilestoneSync, addTaskLog
// ---------------------------------------------------------------------------

// ------------------------------- READ --------------------------------------
// Reads every task for the current company from MySQL (GET /api/tasks).
// Never returns null — always an array.
export const loadTasks = async (options = {}) => {
  const companyId = options.companyId;
  const users = await loadCompanyUsers(companyId);
  const maps = buildUserMaps(users);
  const data = await request(`/tasks${withCompanyFilter(companyId)}`);

  return (data?.tasks || []).map((task) => mapTaskFromApi(task, maps));
};

// Employee-facing helper: keeps only the tasks assigned to the signed-in user.
export const loadMyTasks = async ({ userEmail, companyId } = {}) => {
  const tasks = await loadTasks({ companyId });
  const email = String(userEmail || '').toLowerCase();
  if (!email) return [];

  return tasks.filter(
    (task) =>
      (task.assignedToEmails || []).some((value) => String(value).toLowerCase() === email) ||
      (task.assignedToIds || []).some((value) => String(value).toLowerCase() === email)
  );
};

// ------------------------------- WRITE -------------------------------------
// Manager creates a task for one or more engineers (POST /api/tasks).
export const createTask = async (payload) => {
  const companyId = payload.companyId;
  const users = await loadCompanyUsers(companyId);
  const maps = buildUserMaps(users);
  const assignedToEmails = resolveAssigneeEmails(maps, payload);

  if (assignedToEmails.length === 0) {
    throw new Error(
      'No assignee email found. The selected engineer must have an email address on their account.'
    );
  }

  const createdByEmail = resolveCreatorEmail(maps, payload);

  await request('/tasks', {
    method: 'POST',
    body: JSON.stringify({
      createdByEmail,
      title: payload.title,
      description: payload.description,
      priority: payload.priority,
      internalDeadline: payload.internalDeadline,
      clientDeadline: payload.clientDeadline,
      assignedToEmails,
    }),
  });

  // Keep the screen contract (a mutation returns the fresh list). The newly
  // created task is included by the follow-up read.
  return loadTasks({ companyId });
};

// Manager edits title / description / priority / deadlines / assignees
// (PATCH /api/tasks/:id).
export const editTask = async (payload) => {
  const companyId = payload.companyId;
  const users = await loadCompanyUsers(companyId);
  const maps = buildUserMaps(users);

  const body = {
    title: payload.title,
    description: payload.description,
    priority: payload.priority,
    internalDeadline: payload.internalDeadline,
    clientDeadline: payload.clientDeadline,
    authorEmail: resolveUserEmail(maps, {
      email: payload.authorEmail,
      name: payload.author,
    }),
    authorName: payload.author || null,
  };

  if (payload.assignedToIds && payload.assignedToIds.length > 0) {
    body.assignedToEmails = resolveAssigneeEmails(maps, payload);
  }

  await request(`/tasks/${encodeURIComponent(payload.taskId)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

  return loadTasks({ companyId });
};

// Manager marks / unmarks a task as ready for client milestone sync
// (PATCH /api/tasks/:id/milestone-sync).
export const toggleMilestoneSync = async (payload) => {
  const companyId = payload.companyId;
  const users = await loadCompanyUsers(companyId);
  const maps = buildUserMaps(users);

  await request(`/tasks/${encodeURIComponent(payload.taskId)}/milestone-sync`, {
    method: 'PATCH',
    body: JSON.stringify({
      isSynced: payload.isSynced,
      authorEmail: resolveUserEmail(maps, {
        email: payload.authorEmail,
        name: payload.author,
      }),
      authorName: payload.author || null,
    }),
  });

  return loadTasks({ companyId });
};

// Status / progress change — used by the manager AND by the employee's own
// "save progress" action (PATCH /api/tasks/:id/status).
export const updateTaskStatus = async (payload) => {
  const companyId = payload.companyId;
  const users = await loadCompanyUsers(companyId);
  const maps = buildUserMaps(users);

  await request(`/tasks/${encodeURIComponent(payload.taskId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({
      status: payload.status,
      progressPercent: payload.progressPercent,
      note: payload.note,
      authorEmail: resolveUserEmail(maps, {
        email: payload.authorEmail,
        name: payload.author,
      }),
      authorName: payload.author || null,
    }),
  });

  return loadTasks({ companyId });
};

// Posts a message on the shared task timeline (POST /api/tasks/:id/logs).
export const addTaskLog = async (payload) => {
  const companyId = payload.companyId;
  const users = await loadCompanyUsers(companyId);
  const maps = buildUserMaps(users);

  await request(`/tasks/${encodeURIComponent(payload.taskId)}/logs`, {
    method: 'POST',
    body: JSON.stringify({
      note: payload.note,
      authorEmail: resolveUserEmail(maps, {
        email: payload.authorEmail,
        name: payload.author,
      }),
      authorName: payload.author || null,
    }),
  });

  return loadTasks({ companyId });
};
