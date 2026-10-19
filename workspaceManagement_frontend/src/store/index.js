import { configureStore } from '@reduxjs/toolkit';
import companyReducer from './slices/companySlice';
import attendanceReducer from './slices/attendanceSlice';
import salaryReducer from './slices/salarySlice';
// NOTE: tasks, requirements, tickets & leaves were removed from Redux on
// purpose — they are loaded from AsyncStorage on demand by
// services/taskService.js, services/requirementService.js,
// services/ticketService.js and services/leaveService.js instead
// (see those files for the details).

export const store = configureStore({
  reducer: {
    company: companyReducer,
    attendance: attendanceReducer,
    salary: salaryReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export default store;
