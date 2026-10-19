import storageService, { STORAGE_KEYS } from './storageService';

// ---------------------------------------------------------------------------
// REQUIREMENT SERVICE — requirements are NO LONGER stored in Redux.
//
// AsyncStorage (@wms_requirements) is the single source of truth. Every screen
// that needs requirements calls loadRequirements() when it mounts (and again
// on focus), and each mutation below does the same three steps:
//
//   1. read the current list from AsyncStorage
//   2. apply the change (same logic the old requirementsSlice reducers had)
//   3. write the list back and return it
//
// So a screen only ever writes two lines:
//
//   const next = await addRequirement({ ... });
//   setRequirements(next);
// ---------------------------------------------------------------------------

// Read the whole list (never returns null — always an array).
export const loadRequirements = async () => {
  const stored = await storageService.getItem(STORAGE_KEYS.REQUIREMENTS, []);
  return Array.isArray(stored) ? stored : [];
};

// Persist a list (used by the mutations below and by any bulk write).
export const saveRequirements = async (requirements) => {
  await storageService.setItem(STORAGE_KEYS.REQUIREMENTS, requirements);
  return requirements;
};

// Small helper: find a requirement inside the freshly loaded list.
const findReq = (requirements, reqId) => requirements.find((r) => r.id === reqId);

// Helper: keeps completedMilestones / totalMilestones / progressPercent in
// sync with the milestone list after any change to it.
const recount = (req) => {
  const completedCount = req.milestones.filter((m) => m.isCompleted).length;
  req.completedMilestones = completedCount;
  req.totalMilestones = req.milestones.length;
  req.progressPercent = req.totalMilestones > 0
    ? Math.round((completedCount / req.totalMilestones) * 100)
    : 0;
};

// ONLY Manager or Admin can create.
export const addRequirement = async (payload) => {
  const {
    title,
    organization = '',
    clientRepresentative = '',
    clientId = null,
    clientEmail = '',
    contractDeadline = '2026-11-15',
    initialMilestones = ['System Architecture Sign-Off', 'Alpha Build Release'],
  } = payload;

  const requirements = await loadRequirements();

  const newId = `REQ-${Math.floor(100 + Math.random() * 900)}`;
  const milestones = initialMilestones.map((m, idx) => ({
    id: `m_${Date.now()}_${idx}`,
    title: typeof m === 'string' ? m : m.title,
    isCompleted: false,
  }));

  requirements.unshift({
    id: newId,
    code: newId,
    title,
    organization,
    clientRepresentative,
    // Link back to the CLIENT account the manager picked in the dropdown —
    // the client dashboard/requirements tab filter on this id.
    clientId,
    clientEmail,
    contractDeadline,
    lifecycleState: 'IN_PROGRESS',
    completedMilestones: 0,
    totalMilestones: milestones.length,
    progressPercent: 0,
    milestones,
    privateLinkedTasks: [],
    // No automatic broadcast on creation — the client's "Official Broadcasts"
    // section only ever shows updates a manager deliberately publishes.
    broadcasts: [],
    clarificationReplies: [],
  });

  return saveRequirements(requirements);
};

// Tick a milestone done / not done and refresh the progress numbers.
export const toggleMilestone = async (payload) => {
  const { reqId, milestoneId } = payload;
  const requirements = await loadRequirements();
  const req = findReq(requirements, reqId);

  if (req) {
    const ms = req.milestones.find((m) => m.id === milestoneId);
    if (ms) {
      ms.isCompleted = !ms.isCompleted;
    }
    recount(req);
  }

  return saveRequirements(requirements);
};

// Append a new (incomplete) milestone to a requirement.
export const addMilestone = async (payload) => {
  const { reqId, title } = payload;
  const requirements = await loadRequirements();
  const req = findReq(requirements, reqId);

  if (req && title) {
    req.milestones.push({
      id: `m_${Date.now()}`,
      title,
      isCompleted: false,
    });
    recount(req);
  }

  return saveRequirements(requirements);
};

// Delete a milestone (recalculated after removal so the progress bar never
// points at a count that no longer exists).
export const removeMilestone = async (payload) => {
  const { reqId, milestoneId } = payload;
  const requirements = await loadRequirements();
  const req = findReq(requirements, reqId);

  if (req) {
    req.milestones = req.milestones.filter((m) => m.id !== milestoneId);
    recount(req);
  }

  return saveRequirements(requirements);
};

// Manager publishes a broadcast to the client on a requirement.
export const publishBroadcast = async (payload) => {
  const { reqId, author, content } = payload;
  const requirements = await loadRequirements();
  const req = findReq(requirements, reqId);

  if (req && content) {
    req.broadcasts.unshift({
      id: `bc_${Date.now()}`,
      time: 'Just now',
      // Real publish timestamp so the manager side can show a "time ago".
      createdAt: Date.now(),
      author: author || 'Engineering Management',
      content,
    });
  }

  return saveRequirements(requirements);
};

// Client replies on a requirement clarification thread.
export const addClientClarificationReply = async (payload) => {
  const { reqId, author, content } = payload;
  const requirements = await loadRequirements();
  const req = findReq(requirements, reqId);

  if (req && content) {
    req.clarificationReplies.unshift({
      id: `cr_${Date.now()}`,
      time: 'Just now',
      // Timestamp so the manager screen can show the same "time ago" label
      // broadcasts already use (replies used to be saved without one).
      createdAt: Date.now(),
      author: author || 'Client Representative',
      content,
    });
  }

  return saveRequirements(requirements);
};

// Delete a requirement entirely (manager minus button). Because the client app
// reads this same list from AsyncStorage, the requirement (with its milestones,
// broadcasts and replies) also disappears from the client's dashboard as soon
// as that screen reloads on focus.
export const removeRequirement = async (payload) => {
  const { reqId } = payload;
  const requirements = await loadRequirements();
  return saveRequirements(requirements.filter((r) => r.id !== reqId));
};

// Manager moves the requirement along its lifecycle (chips on the screen).
export const updateLifecycleState = async (payload) => {
  const { reqId, lifecycleState } = payload;
  const requirements = await loadRequirements();
  const req = findReq(requirements, reqId);

  if (req) {
    req.lifecycleState = lifecycleState;
  }

  return saveRequirements(requirements);
};


