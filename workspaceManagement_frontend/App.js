/**
 * Workforce Management System (WMS)
 * Course Syllabus Aligned React Native Application
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider, useDispatch } from 'react-redux';
import { store } from './src/store';
import { setDarkMode } from './src/store/slices/themeSlice';
import { useTheme } from './src/hooks/useTheme';
import storageService, { STORAGE_KEYS } from './src/services/storageService';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

const ThemedStatusBar = () => {
  const { isDark } = useTheme();
  return (
    <StatusBar
      barStyle={isDark ? 'light-content' : 'dark-content'}
      backgroundColor={isDark ? '#0B0F17' : '#FFFFFF'}
    />
  );
};

// Replaces the old ThemeProvider. The theme now lives in the Redux `theme`
// slice, so all this does is restore the saved dark/light preference once when
// the app starts (the hook in src/hooks/useTheme.js handles toggling/saving).
const ThemeBootstrap = ({ children }) => {
  const dispatch = useDispatch();
  useEffect(() => {
    (async () => {
      const savedTheme = await storageService.getItem(STORAGE_KEYS.THEME_PREFERENCE, false);
      dispatch(setDarkMode(Boolean(savedTheme)));
    })();
  }, [dispatch]);
  return children;
};

export default function App() {
  return (
    <Provider store={store}>
      <ThemeBootstrap>
        <AuthProvider>
          <SafeAreaProvider>
            <ThemedStatusBar />
            <AppNavigator />
          </SafeAreaProvider>
        </AuthProvider>
      </ThemeBootstrap>
    </Provider>
  );
}
