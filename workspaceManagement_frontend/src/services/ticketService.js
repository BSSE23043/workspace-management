import storageService, { STORAGE_KEYS } from './storageService';

// ---------------------------------------------------------------------------
// TICKET SERVICE — HR tickets are NO LONGER stored in Redux.
//
// AsyncStorage (@wms_tickets) is the single source of truth. Every screen that
// needs tickets calls loadTickets() when it mounts (and again on focus), and
// each mutation below does the same three steps:
//
//   1. read the current list from AsyncStorage
//   2. apply the change (same logic the old ticketsSlice reducers had)
//   3. write the list back and return it
//
// So a screen only ever writes two lines:
//
//   const next = await createTicket({ ... });
//   setTickets(next);
//
// Every event that changes a ticket (new ticket, status change, new discussion
// message, ...) therefore saves straight to AsyncStorage.
// ---------------------------------------------------------------------------

// Read the whole list (never returns null — always an array).
export const loadTickets = async () => {
  const stored = await storageService.getItem(STORAGE_KEYS.TICKETS, []);
  return Array.isArray(stored) ? stored : [];
};

// Persist a list (used by the mutations below and by any bulk write).
export const saveTickets = async (tickets) => {
  await storageService.setItem(STORAGE_KEYS.TICKETS, tickets);
  return tickets;
};

// Shared discussion entry — every message stores a real timestamp so both the
// employee and the HR detail screens can show a "time ago" label.
const timelineEntry = (sender, message) => ({
  sender,
  time: 'Just now',
  createdAt: Date.now(),
  message,
});

// Employee opens a new HR support ticket (same defaults the old slice had).
export const createTicket = async (payload) => {
  const tickets = await loadTickets();
  tickets.unshift({
    id: `TKT-${Math.floor(100 + Math.random() * 900)}`,
    date: new Date().toISOString().split('T')[0],
    status: 'OPEN',
    timeline: [
      timelineEntry(payload.userName || 'Employee', payload.explanation || 'Ticket submitted'),
    ],
    ...payload,
  });
  return saveTickets(tickets);
};

// HR resolves & closes a ticket (optional closing reply on the timeline).
export const resolveTicket = async ({ ticketId, replyMessage }) => {
  const tickets = await loadTickets();
  const t = tickets.find((item) => item.id === ticketId);
  if (t) {
    t.status = 'RESOLVED';
    if (replyMessage) {
      t.timeline.push(timelineEntry('HR Operations', replyMessage));
    }
  }
  return saveTickets(tickets);
};

// HR picks the ticket up — moves it to IN_PROGRESS.
export const markInProgress = async ({ ticketId, note }) => {
  const tickets = await loadTickets();
  const t = tickets.find((item) => item.id === ticketId);
  if (t) {
    t.status = 'IN_PROGRESS';
    t.timeline.push(
      timelineEntry(
        'HR Operations',
        note || 'Ticket status changed to IN_PROGRESS. HR is actively investigating with the relevant teams.'
      )
    );
  }
  return saveTickets(tickets);
};

// HR reopens a closed ticket so the discussion can continue.
export const reopenTicket = async ({ ticketId, note }) => {
  const tickets = await loadTickets();
  const t = tickets.find((item) => item.id === ticketId);
  if (t) {
    t.status = 'OPEN';
    t.timeline.push(
      timelineEntry('HR Operations', note || 'Ticket reopened for further review.')
    );
  }
  return saveTickets(tickets);
};

// HR rejects a ticket (terminal status, optional reply on the timeline).
export const rejectTicket = async ({ ticketId, replyMessage }) => {
  const tickets = await loadTickets();
  const t = tickets.find((item) => item.id === ticketId);
  if (t) {
    t.status = 'REJECTED';
    if (replyMessage) {
      t.timeline.push(timelineEntry('HR Operations', replyMessage));
    }
  }
  return saveTickets(tickets);
};

// New discussion message — used by the employee (his replies) and by HR (its
// official replies). Every message writes the whole list back to AsyncStorage.
export const addTicketMessage = async ({ ticketId, sender, message }) => {
  const tickets = await loadTickets();
  const t = tickets.find((item) => item.id === ticketId);
  if (t) {
    t.timeline.push(timelineEntry(sender, message));
  }
  return saveTickets(tickets);
};
