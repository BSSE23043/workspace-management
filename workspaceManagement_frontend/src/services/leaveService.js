import storageService, { STORAGE_KEYS } from './storageService';

// ---------------------------------------------------------------------------
// LEAVE SERVICE — leave requests are NO LONGER stored in Redux.
//
// AsyncStorage (@wms_leaves) is the single source of truth. Every screen that
// needs leaves calls loadLeaves() when it mounts (and again on focus), and
// each mutation below does the same three steps the old leavesSlice reducers
// did, but against the stored list:
//
//   1. read the current list from AsyncStorage
//   2. apply the change (same logic the old slice had)
//   3. write the list back and return it
//
// So a screen only ever writes two lines:
//
//   const next = await applyLeave({ ... });
//   setLeaves(next);
//
// Applying / approving / rejecting therefore saves straight to AsyncStorage
// and survives app reloads (the old Redux copy was session-only).
// ---------------------------------------------------------------------------

// Read the whole list (never returns null — always an array).
export const loadLeaves = async () => {
  const stored = await storageService.getItem(STORAGE_KEYS.LEAVES, []);
  return Array.isArray(stored) ? stored : [];
};

// Persist a list (used by the mutations below and by any bulk write).
export const saveLeaves = async (leaves) => {
  await storageService.setItem(STORAGE_KEYS.LEAVES, leaves);
  return leaves;
};

// Employee submits a new leave request (same defaults the old slice had:
// PENDING status, empty review comment, clear team-overlap check).
// Newest request goes to the top of the list.
export const applyLeave = async (payload) => {
  const leaves = await loadLeaves();
  leaves.unshift({
    id: `LV-${Date.now()}`,
    ...payload,
    status: 'PENDING',
    managerReviewComment: '',
    teamOverlapStatus: 'Clear • Verified by System',
  });
  return saveLeaves(leaves);
};

// Manager/HR approves a pending leave (optional comment, sensible default).
export const approveLeave = async ({ leaveId, comment }) => {
  const leaves = await loadLeaves();
  const leave = leaves.find((l) => l.id === leaveId);
  if (leave) {
    leave.status = 'APPROVED';
    leave.managerReviewComment = comment || 'Approved by Manager';
  }
  return saveLeaves(leaves);
};

// Manager/HR rejects a pending leave (optional comment, sensible default).
export const rejectLeave = async ({ leaveId, comment }) => {
  const leaves = await loadLeaves();
  const leave = leaves.find((l) => l.id === leaveId);
  if (leave) {
    leave.status = 'REJECTED';
    leave.managerReviewComment = comment || 'Rejected by Manager';
  }
  return saveLeaves(leaves);
};
