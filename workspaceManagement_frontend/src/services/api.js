import { Platform } from 'react-native';

export const API_BASE_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:5000/api'
    : 'http://localhost:5000/api';

const request = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  };

  const response = await fetch(url, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    const error = new Error(data.error || data.message || 'Request failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

// ============================================================================
// AUTH API
// ============================================================================

export const loginUser = async (email, password) => {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
};

export const updateUserProfile = async (payload) => {
  return request('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
};

// ============================================================================
// SUPER ADMIN API
// ============================================================================

export const fetchPlatformStats = async () => {
  return request('/super-admin/stats');
};

export const fetchCompanyAdmins = async () => {
  const data = await request('/super-admin/admins');
  return data.admins || [];
};

export const createCompanyAdminApi = async ({
  companyName,
  adminName,
  email,
  password,
}) => {
  return request('/super-admin/admins', {
    method: 'POST',
    body: JSON.stringify({ companyName, adminName, email, password }),
  });
};

export const deleteCompanyAdminApi = async (email) => {
  return request(`/super-admin/admins/${encodeURIComponent(email)}`, {
    method: 'DELETE',
  });
};

// ============================================================================
// COMPANY ADMIN API
// ============================================================================

export const fetchCompanyProfileApi = async (companyId) => {
  const data = await request(`/admin/company/${encodeURIComponent(companyId)}`);
  return data.company;
};

export const saveCompanyProfileApi = async (companyId, payload) => {
  const data = await request(`/admin/company/${encodeURIComponent(companyId)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return data.company;
};

export const fetchCompanyUsersApi = async (companyId) => {
  const data = await request(
    `/admin/users?companyId=${encodeURIComponent(companyId)}`
  );
  return data.users || [];
};

export const createCompanyUserApi = async (payload) => {
  const data = await request('/admin/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data.user;
};

export const updateCompanyUserApi = async (email, payload) => {
  const data = await request(`/admin/users/${encodeURIComponent(email)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return data.user;
};

export const toggleCompanyUserStatusApi = async (email, isActive) => {
  const data = await request(
    `/admin/users/${encodeURIComponent(email)}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    }
  );
  return data.user;
};
