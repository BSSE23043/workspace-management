import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import Icon from '../components/common/Icon';

// Screens
import ClientDashboardScreen from '../screens/client/ClientDashboardScreen';
import MyRequirementsScreen from '../screens/client/MyRequirementsScreen';
import ProfileSettingsScreen from '../screens/client/ProfileSettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const ClientTabs = () => {
  const { getRolePalette } = useTheme();
  const palette = getRolePalette('CLIENT');

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
          else if (route.name === 'Milestones') iconName = 'flag';
          return <Icon name={iconName} size={size || 20} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={ClientDashboardScreen} />
      <Tab.Screen name="Milestones" component={MyRequirementsScreen} />
    </Tab.Navigator>
  );
};

export const ClientNavigator = () => {
  const { logout } = useAuth();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ClientTabs" component={ClientTabs} />
      <Stack.Screen name="ClientProfile">
        {(props) => <ProfileSettingsScreen {...props} onLogout={logout} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

export default ClientNavigator;
