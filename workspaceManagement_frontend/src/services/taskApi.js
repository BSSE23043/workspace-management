import request from './apiClient';

export const fetchMyTasks = async (userEmail) => {
  const payload = await request(`/tasks?userEmail=${encodeURIComponent(userEmail)}`);
  return payload && Array.isArray(payload.data) ? payload.data : [];
};

export const updateTaskStatusApi = async ({ taskId, status, progressPercent, note, authorEmail }) => {
  const payload = await request(`/tasks/${encodeURIComponent(taskId)}/status`, {
    method: 'PUT',
    body: { status, progressPercent, note, authorEmail },
  });
  return payload ? payload.data : null;
};

export const addTaskLogApi = async ({ taskId, note, authorEmail }) => {
  const payload = await request(`/tasks/${encodeURIComponent(taskId)}/logs`, {
    method: 'POST',
    body: { note, authorEmail },
  });
  return payload ? payload.data : null;
};
