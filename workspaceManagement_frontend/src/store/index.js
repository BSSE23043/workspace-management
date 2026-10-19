import { configureStore } from '@reduxjs/toolkit';
import themeReducer from './slices/themeSlice';
// NOTE: every domain dataset was removed from Redux on purpose — tasks,
// requirements, tickets, leaves, attendance, salary AND the company profile are
// loaded from AsyncStorage on demand through the matching
// services/*Service.js file (see those files for the details). The only things
// left in Redux are the dark/light theme flag (slices/themeSlice.js) and no
// other slices.

export const store = configureStore({
  reducer: {
    theme: themeReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export default store;
