import request from './apiClient';

export const fetchMyLeaves = async (userEmail) => {
  const payload = await request(`/leaves?userEmail=${encodeURIComponent(userEmail)}`);
  return payload && Array.isArray(payload.data) ? payload.data : [];
};

export const submitLeaveRequest = async ({ userEmail, startDate, endDate, reason }) => {
  const payload = await request('/leaves', {
    method: 'POST',
    body: { userEmail, startDate, endDate, reason },
  });
  return payload ? payload.data : null;
};
