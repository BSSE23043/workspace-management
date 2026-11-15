import request from './apiClient';

export const fetchSalaryConfigApi = async (userEmail) => {
  const payload = await request(`/salary?userEmail=${encodeURIComponent(userEmail)}`);
  return payload ? payload.data : { companyWide: {}, overrides: {} };
};
