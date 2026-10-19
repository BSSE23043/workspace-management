// Super Admin Navigator
// ----------------------------------------------------------------------------
// The Super Admin sits "above" all companies. Their portal is deliberately
// simple: a dashboard + a "Company Admins" management screen (bottom tabs),
// plus a read-only profile screen (stack).
// It follows the exact same Bottom-Tabs + Stack pattern used by the other
// role navigators (see ClientNavigator.js for comparison).
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import Icon from '../components/common/Icon';

// Screens
import SuperAdminDashboardScreen from '../screens/superAdmin/SuperAdminDashboardScreen';
import CompanyAdminsScreen from '../screens/superAdmin/CompanyAdminsScreen';
import SuperAdminProfileScreen from '../screens/superAdmin/SuperAdminProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Bottom tab bar themed with the SUPER_ADMIN palette (same pattern as other roles)
const SuperAdminTabs = () => {
  const { getRolePalette } = useTheme();
  const palette = getRolePalette('SUPER_ADMIN');

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: {
          backgroundColor: palette.card,
          borderTopColor: palette.primary,
          borderTopWidth: 2.5,
          height: 60,
          paddingBottom: 6,
          paddingTop: 6,
        },
        tabBarIcon: ({ color, size }) => {
          let iconName = 'grid';
          if (route.name === 'Dashboard') iconName = 'grid';
          else if (route.name === 'Company Admins') iconName = 'people';
          return <Icon name={iconName} size={size || 20} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={SuperAdminDashboardScreen} />
      <Tab.Screen name="Company Admins" component={CompanyAdminsScreen} />
    </Tab.Navigator>
  );
};

export const SuperAdminNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SuperAdminTabs" component={SuperAdminTabs} />
      <Stack.Screen name="SuperAdminProfile" component={SuperAdminProfileScreen} />
    </Stack.Navigator>
  );
};

export default SuperAdminNavigator;
