// Base URL for the Workspace Management backend.
// Android emulator: 10.0.2.2 points at the host machine's localhost.
// Physical device: replace this with your computer's LAN IP,
// e.g. 'http://192.168.1.10:5000/api'.
export const API_BASE_URL = 'http://10.0.2.2:5000/api';

const request = async (path, { method = 'GET', body, headers } = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(headers || {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch (error) {
    payload = null;
  }

  if (!response.ok) {
    throw new Error((payload && payload.error) || `Request failed (${response.status})`);
  }

  return payload;
};

export default request;
