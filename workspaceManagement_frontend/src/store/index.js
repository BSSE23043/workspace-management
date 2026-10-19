import { configureStore } from '@reduxjs/toolkit';
import companyReducer from './slices/companySlice';
import themeReducer from './slices/themeSlice';
// NOTE: tasks, requirements, tickets, leaves, attendance & salary were removed
// from Redux on purpose — they are loaded from AsyncStorage on demand by
// services/taskService.js, services/requirementService.js,
// services/ticketService.js, services/leaveService.js,
// services/attendanceService.js and services/salaryService.js instead
// (see those files for the details). The dark/light theme flag also lives in
// Redux now (slices/themeSlice.js) — it replaced the old ThemeContext.

export const store = configureStore({
  reducer: {
    company: companyReducer,
    theme: themeReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export default store;
