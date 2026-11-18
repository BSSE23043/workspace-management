import request from './apiClient';

export const fetchMyTickets = async (userEmail) => {
  const payload = await request(`/tickets?userEmail=${encodeURIComponent(userEmail)}`);
  return payload && Array.isArray(payload.data) ? payload.data : [];
};

export const createHrTicket = async ({ userEmail, subject, description, eventDate }) => {
  const payload = await request('/tickets', {
    method: 'POST',
    body: { userEmail, subject, description, eventDate },
  });
  return payload ? payload.data : null;
};

export const sendTicketMessage = async ({ ticketId, userEmail, message }) => {
  const payload = await request(`/tickets/${encodeURIComponent(ticketId)}/messages`, {
    method: 'POST',
    body: { authorEmail: userEmail, message },
  });
  return payload ? payload.data : null;
};
