import { configureStore } from '@reduxjs/toolkit';
import companyReducer from './slices/companySlice';
import salaryReducer from './slices/salarySlice';
// NOTE: tasks, requirements, tickets, leaves & attendance were removed from
// Redux on purpose — they are loaded from AsyncStorage on demand by
// services/taskService.js, services/requirementService.js,
// services/ticketService.js, services/leaveService.js and
// services/attendanceService.js instead (see those files for the details).

export const store = configureStore({
  reducer: {
    company: companyReducer,
    salary: salaryReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export default store;
