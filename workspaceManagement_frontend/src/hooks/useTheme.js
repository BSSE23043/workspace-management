import { useSelector, useDispatch } from 'react-redux';
import { ROLES, ROLE_THEMES } from '../utils/permissions';
import { setDarkMode } from '../store/slices/themeSlice';
import storageService, { STORAGE_KEYS } from '../services/storageService';

// Builds the full role palette from the current theme flag. This is the same
// logic the old ThemeContext.getRolePalette had — only the source of `isDark`
// changed (Redux instead of context state).
export const getRolePalette = (isDark, role = ROLES.EMPLOYEE) => {
  const basePalette = ROLE_THEMES[role] || ROLE_THEMES.EMPLOYEE;
  return {
    ...basePalette,
    isDark,
    background: isDark ? '#0B0F17' : '#F8FAFC',
    surface: isDark ? '#151D2A' : '#FFFFFF',
    card: isDark ? '#1E293B' : '#FFFFFF',
    cardBorder: isDark ? '#334155' : '#E2E8F0',
    textPrimary: isDark ? '#F8FAFC' : '#0F172A',
    textSecondary: isDark ? '#94A3B8' : '#64748B',
    textMuted: isDark ? '#64748B' : '#94A3B8',
    divider: isDark ? '#334155' : '#F1F5F9',
    inputBackground: isDark ? '#0F172A' : '#F8FAFC',
    inputBorder: isDark ? '#334155' : '#CBD5E1',
    statusBar: isDark ? 'light-content' : 'dark-content',
  };
};

// Drop-in replacement for the old useTheme() context hook: it returns the exact
// same three values ({ isDark, toggleTheme, getRolePalette }), but the theme
// flag now comes from the Redux `theme` slice and the preference is persisted
// to AsyncStorage on toggle. Because the shape is unchanged, no screen body had
// to change — only the import path moved here.
export const useTheme = () => {
  const dispatch = useDispatch();
  const isDark = useSelector((state) => state.theme.isDark);

  const toggleTheme = async () => {
    const nextVal = !isDark;
    dispatch(setDarkMode(nextVal));
    await storageService.setItem(STORAGE_KEYS.THEME_PREFERENCE, nextVal);
  };

  const paletteForRole = (role) => getRolePalette(isDark, role);

  return { isDark, toggleTheme, getRolePalette: paletteForRole };
};

export default useTheme;
