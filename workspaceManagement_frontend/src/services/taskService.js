import storageService, { STORAGE_KEYS } from './storageService';

// ---------------------------------------------------------------------------
// TASK SERVICE — tasks are NO LONGER stored in Redux.
//
// AsyncStorage (@wms_tasks) is the single source of truth. Every screen that
// needs tasks calls loadTasks() when it mounts (and again on focus), and each
// mutation below does the same three steps:
//
//   1. read the current list from AsyncStorage
//   2. apply the change (same logic the old tasksSlice reducers had)
//   3. write the list back and return it
//
// So a screen only ever writes two lines:
//
//   const next = await createTask({ ... });
//   setTasks(next);
// ---------------------------------------------------------------------------

// Read the whole list (never returns null — always an array).
export const loadTasks = async () => {
  const stored = await storageService.getItem(STORAGE_KEYS.TASKS, []);
  return Array.isArray(stored) ? stored : [];
};

// Persist a list (used by the mutations below and by any bulk write).
export const saveTasks = async (tasks) => {
  await storageService.setItem(STORAGE_KEYS.TASKS, tasks);
  return tasks;
};

// Recalculates the dual-deadline buffer that every task edit must refresh.
const applyConflict = (task) => {
  const intDate = new Date(task.internalDeadline);
  const cliDate = new Date(task.clientDeadline);
  const diffMs = cliDate.getTime() - intDate.getTime();
  task.bufferDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  task.hasConflict = task.bufferDays < 0;
  task.conflictDetails = task.hasConflict
    ? `${task.title} • ${Math.abs(task.bufferDays)}d slack • Internal Employee Due: ${task.internalDeadline} vs External Client Due: ${task.clientDeadline}`
    : null;
};

// Manager creates a task for one or more engineers.
export const createTask = async (payload) => {
  const {
    title,
    description,
    assignedToId,
    assignedToName,
    assignedToIds = [],
    assignedToNames = [],
    createdByName,
    requirementId,
    priority = 'MEDIUM',
    internalDeadline,
    clientDeadline,
  } = payload;

  const tasks = await loadTasks();

  const intDate = new Date(internalDeadline);
  const cliDate = new Date(clientDeadline);
  const diffMs = cliDate.getTime() - intDate.getTime();
  const bufferDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const hasConflict = bufferDays < 0;

  const primaryId = assignedToId || (assignedToIds.length > 0 ? assignedToIds[0] : '');
  const primaryName = assignedToName || (assignedToNames.length > 0 ? assignedToNames.join(', ') : 'Unassigned');

  const newTask = {
    id: `TSK-${Math.floor(400 + Math.random() * 500)}`,
    code: `#TSK-${Math.floor(400 + Math.random() * 500)}`,
    title,
    description: description || `Task assigned by ${createdByName || 'your Manager'}`,
    assignedToId: primaryId,
    assignedToName: primaryName,
    assignedToIds: assignedToIds.length > 0 ? assignedToIds : [primaryId],
    assignedToNames: assignedToNames.length > 0 ? assignedToNames : [primaryName],
    createdByName: createdByName || null,
    requirementId,
    priority,
    internalDeadline,
    clientDeadline,
    bufferDays,
    hasConflict,
    isMilestoneSynced: false,
    conflictDetails: hasConflict
      ? `${title} • ${Math.abs(bufferDays)}d slack • Internal Employee Due: ${internalDeadline} vs External Client Due: ${clientDeadline}`
      : null,
    status: 'TO_DO',
    progressPercent: 0,
    logs: [
      {
        time: 'Just now',
        // Real timestamp so the employee's message list can show a "time ago"
        // label, exactly like the requirement broadcasts do.
        createdAt: Date.now(),
        author: createdByName || null,
        note: `Task created and assigned to ${primaryName} by ${createdByName || 'Management'}.`,
      },
    ],
  };

  tasks.unshift(newTask);
  return saveTasks(tasks);
};

// Manager edits title / description / priority / deadlines / assignees.
export const editTask = async (payload) => {
  const {
    taskId,
    title,
    description,
    priority,
    internalDeadline,
    clientDeadline,
    assignedToIds,
    assignedToNames,
    author,
  } = payload;

  const tasks = await loadTasks();
  const task = tasks.find((t) => t.id === taskId);

  if (task) {
    if (title) task.title = title;
    if (description !== undefined) task.description = description;
    if (priority) task.priority = priority;
    if (internalDeadline) task.internalDeadline = internalDeadline;
    if (clientDeadline) task.clientDeadline = clientDeadline;
    if (assignedToIds && assignedToIds.length > 0) {
      task.assignedToIds = assignedToIds;
      task.assignedToId = assignedToIds[0];
    }
    if (assignedToNames && assignedToNames.length > 0) {
      task.assignedToNames = assignedToNames;
      task.assignedToName = assignedToNames.join(', ');
    }

    applyConflict(task);

    task.logs.unshift({
      time: 'Just now',
      createdAt: Date.now(),
      author: author || 'Manager',
      note: `Manager edited task parameters and deadlines.`,
    });
  }

  return saveTasks(tasks);
};

// Manager marks / unmarks a task as ready for client milestone sync.
export const toggleMilestoneSync = async (payload) => {
  const { taskId, isSynced, author } = payload;
  const tasks = await loadTasks();
  const task = tasks.find((t) => t.id === taskId);

  if (task) {
    task.isMilestoneSynced = isSynced;
    task.logs.unshift({
      time: 'Just now',
      createdAt: Date.now(),
      author: author || 'Manager',
      note: isSynced
        ? 'Marked as Ready for Client Milestone Sync'
        : 'Reverted Client Milestone Sync status',
    });
  }

  return saveTasks(tasks);
};

// Status / progress change — used by the manager AND by the employee's own
// "save progress" action.
export const updateTaskStatus = async (payload) => {
  const { taskId, status, progressPercent, note, author } = payload;
  const tasks = await loadTasks();
  const task = tasks.find((t) => t.id === taskId);

  if (task) {
    if (status) task.status = status;
    if (progressPercent !== undefined) task.progressPercent = progressPercent;
    if (note) {
      task.logs.unshift({
        time: 'Just now',
        createdAt: Date.now(),
        author: author || null,
        note,
      });
    }
  }

  return saveTasks(tasks);
};

// Posts a message on the task timeline — used by the manager (his notes) and
// by the employee (his replies), the same way requirement broadcasts work.
export const addTaskLog = async (payload) => {
  const { taskId, note, author } = payload;
  const tasks = await loadTasks();
  const task = tasks.find((t) => t.id === taskId);

  if (task && note) {
    task.logs.unshift({
      time: 'Just now',
      createdAt: Date.now(),
      author: author || null,
      note,
    });
  }

  return saveTasks(tasks);
};
