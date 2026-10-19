import { configureStore } from '@reduxjs/toolkit';
import companyReducer from './slices/companySlice';
// NOTE: tasks, requirements, tickets, leaves, attendance & salary were removed
// from Redux on purpose — they are loaded from AsyncStorage on demand by
// services/taskService.js, services/requirementService.js,
// services/ticketService.js, services/leaveService.js,
// services/attendanceService.js and services/salaryService.js instead
// (see those files for the details).

export const store = configureStore({
  reducer: {
    company: companyReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export default store;
