import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  tickets: [],
};

const ticketsSlice = createSlice({
  name: 'tickets',
  initialState,
  reducers: {
    createTicket: (state, action) => {
      state.tickets.unshift({
        id: `TKT-${Math.floor(100 + Math.random() * 900)}`,
        date: new Date().toISOString().split('T')[0],
        status: 'OPEN',
        timeline: [
          {
            sender: action.payload.userName || 'Employee',
            time: 'Just now',
            message: action.payload.explanation || 'Ticket submitted',
          },
        ],
        ...action.payload,
      });
    },
    resolveTicket: (state, action) => {
      const { ticketId, replyMessage } = action.payload;
      const t = state.tickets.find((item) => item.id === ticketId);
      if (t) {
        t.status = 'RESOLVED';
        if (replyMessage) {
          t.timeline.push({
            sender: 'HR Operations',
            time: 'Just now',
            message: replyMessage,
          });
        }
      }
    },
    markInProgress: (state, action) => {
      const { ticketId, note } = action.payload;
      const t = state.tickets.find((item) => item.id === ticketId);
      if (t) {
        t.status = 'IN_PROGRESS';
        t.timeline.push({
          sender: 'HR Operations',
          time: 'Just now',
          message: note || 'Ticket status changed to IN_PROGRESS. HR is actively investigating with the relevant teams.',
        });
      }
    },
    reopenTicket: (state, action) => {
      const { ticketId, note } = action.payload;
      const t = state.tickets.find((item) => item.id === ticketId);
      if (t) {
        t.status = 'OPEN';
        t.timeline.push({
          sender: 'HR Operations',
          time: 'Just now',
          message: note || 'Ticket reopened for further review.',
        });
      }
    },
    rejectTicket: (state, action) => {
      const { ticketId, replyMessage } = action.payload;
      const t = state.tickets.find((item) => item.id === ticketId);
      if (t) {
        t.status = 'REJECTED';
        if (replyMessage) {
          t.timeline.push({
            sender: 'HR Operations',
            time: 'Just now',
            message: replyMessage,
          });
        }
      }
    },
    addTicketMessage: (state, action) => {
      const { ticketId, sender, message } = action.payload;
      const t = state.tickets.find((item) => item.id === ticketId);
      if (t) {
        t.timeline.push({
          sender,
          time: 'Just now',
          message,
        });
      }
    },
    resetTickets: () => ({ tickets: [] }),
  },
});

export const {
  createTicket,
  resolveTicket,
  markInProgress,
  reopenTicket,
  rejectTicket,
  addTicketMessage,
  resetTickets,
} = ticketsSlice.actions;
export default ticketsSlice.reducer;
