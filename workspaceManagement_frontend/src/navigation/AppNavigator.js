import React from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { IMAGES } from '../assets/images';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
// NOTE: The Register screen (public self sign-up) was removed on purpose.
// Company Admin accounts are now created from the Super Admin portal, and all
// other accounts are created by the Company Admin inside the Admin portal.

// Role Navigators
import SuperAdminNavigator from './SuperAdminNavigator';
import AdminDrawerNavigator from './AdminDrawerNavigator';
import HRNavigator from './HRNavigator';
import ManagerNavigator from './ManagerNavigator';
import EmployeeNavigator from './EmployeeNavigator';
import ClientNavigator from './ClientNavigator';

const Stack = createNativeStackNavigator();

const AuthStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
};

export const AppNavigator = () => {
  const { currentUser, isSplashLoading } = useAuth();
  const { isDark } = useTheme();

  // Syllabus Requirement: Splash screen with loading state
  if (isSplashLoading) {
    return (
      <View style={[styles.splashContainer, isDark && styles.splashContainerDark]}>
        <View style={styles.splashBrandBox}>
          <Image source={IMAGES.appLogo} style={styles.splashLogo} resizeMode="contain" />
        </View>
        <Text style={[styles.splashTitle, isDark && styles.textWhite]}>
          Workforce Management System
        </Text>
        <Text style={[styles.splashSub, isDark && styles.textMuted]}>
          Multi-Company Workforce Administration Platform
        </Text>
        <ActivityIndicator size="small" color="#1E293B" style={styles.splashSpinner} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!currentUser ? (
        <AuthStack />
      ) : currentUser.role === 'SUPER_ADMIN' ? (
        <SuperAdminNavigator />
      ) : currentUser.role === 'ADMIN' ? (
        <AdminDrawerNavigator />
      ) : currentUser.role === 'HR' ? (
        <HRNavigator />
      ) : currentUser.role === 'MANAGER' ? (
        <ManagerNavigator />
      ) : currentUser.role === 'CLIENT' ? (
        <ClientNavigator />
      ) : (
        <EmployeeNavigator />
      )}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 20,
  },
  splashContainerDark: {
    backgroundColor: '#0B0F17',
  },
  splashBrandBox: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 4,
  },
  splashLogo: {
    width: 40,
    height: 40,
  },
  splashTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  splashSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 20,
  },
  splashSpinner: {
    marginTop: 10,
  },
  textWhite: {
    color: '#F8FAFC',
  },
  textMuted: {
    color: '#94A3B8',
  },
});

export default AppNavigator;
