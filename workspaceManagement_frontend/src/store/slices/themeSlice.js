import { createSlice } from '@reduxjs/toolkit';

// THEME SLICE
// The dark/light flag used to live in ThemeContext (React Context). It now
// lives here, in Redux, so any component can read it with useSelector(state =>
// state.theme.isDark). The saved preference is still persisted to AsyncStorage
// (@wms_theme_preference) — App.js restores it once at startup and the
// hooks/useTheme.js hook writes it back whenever the user toggles it.
const initialState = {
  isDark: false,
};

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    // Used both for restoring the saved theme at startup and for every toggle.
    setDarkMode: (state, action) => {
      state.isDark = action.payload;
    },
  },
});

export const { setDarkMode } = themeSlice.actions;
export default themeSlice.reducer;
