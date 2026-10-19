import { configureStore } from '@reduxjs/toolkit';
import companyReducer from './slices/companySlice';
import attendanceReducer from './slices/attendanceSlice';
import salaryReducer from './slices/salarySlice';
import leavesReducer from './slices/leavesSlice';
import ticketsReducer from './slices/ticketsSlice';
// NOTE: tasks & requirements were removed from Redux on purpose — they are
// loaded from AsyncStorage on demand by services/taskService.js and
// services/requirementService.js instead (see those files for the details).

export const store = configureStore({
  reducer: {
    company: companyReducer,
    attendance: attendanceReducer,
    salary: salaryReducer,
    leaves: leavesReducer,
    tickets: ticketsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export default store;
