import request from './apiClient';

export const fetchMyAttendance = async (userEmail) => {
  const payload = await request(`/attendance?userEmail=${encodeURIComponent(userEmail)}`);
  return payload && Array.isArray(payload.data) ? payload.data : [];
};

export const fetchAttendanceStatus = async (userEmail) => {
  const payload = await request(
    `/attendance/status?userEmail=${encodeURIComponent(userEmail)}`
  );
  return payload && payload.data ? payload.data : null;
};

export const checkInToShift = async ({ userEmail, latitude, longitude }) => {
  const payload = await request('/attendance/check-in', {
    method: 'POST',
    body: { userEmail, latitude, longitude },
  });
  return payload && payload.data ? payload.data : null;
};

export const checkOutOfShift = async ({ userEmail, latitude, longitude }) => {
  const payload = await request('/attendance/check-out', {
    method: 'POST',
    body: { userEmail, latitude, longitude },
  });
  return payload && payload.data ? payload.data : null;
};

export const fetchSalaryConfig = async (userEmail) => {
  const payload = await request(`/salary?userEmail=${encodeURIComponent(userEmail)}`);
  return payload ? payload.data : { companyWide: {}, overrides: {} };
};
