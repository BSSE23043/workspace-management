import request from './apiClient';

export const fetchClientRequirements = async (clientEmail) => {
  const payload = await request(`/requirements?clientEmail=${encodeURIComponent(clientEmail)}`);
  return payload && Array.isArray(payload.data) ? payload.data : [];
};

export const submitClarificationReply = async ({ reqId, authorEmail, message }) => {
  const payload = await request(`/requirements/${encodeURIComponent(reqId)}/replies`, {
    method: 'POST',
    body: { authorEmail, message },
  });
  return payload ? payload.data : null;
};
