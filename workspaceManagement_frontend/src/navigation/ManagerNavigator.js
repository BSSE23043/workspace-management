import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../hooks/useTheme';
import Icon from '../components/common/Icon';

// Screens
import ManagerDashboardScreen from '../screens/manager/ManagerDashboardScreen';
import TeamAttendanceScreen from '../screens/manager/TeamAttendanceScreen';
import TaskManagementScreen from '../screens/manager/TaskManagementScreen';
import RequirementCoordinationScreen from '../screens/manager/RequirementCoordinationScreen';
import TeamLeaveRequestsScreen from '../screens/manager/TeamLeaveRequestsScreen';
import TaskDetailScreen from '../screens/manager/TaskDetailScreen';
import ManagerProfileScreen from '../screens/manager/ManagerProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const ManagerTabs = () => {
  const { getRolePalette } = useTheme();
  const palette = getRolePalette('MANAGER');

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
          else if (route.name === 'Team & Leave') iconName = 'people';
          else if (route.name === 'Tasks') iconName = 'briefcase';
          else if (route.name === 'Requirements') iconName = 'flag';
          return <Icon name={iconName} size={size || 20} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={ManagerDashboardScreen} />
      <Tab.Screen name="Team & Leave" component={TeamAttendanceScreen} />
      <Tab.Screen name="Tasks" component={TaskManagementScreen} />
      <Tab.Screen name="Requirements" component={RequirementCoordinationScreen} />
    </Tab.Navigator>
  );
};

export const ManagerNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ManagerTabs" component={ManagerTabs} />
      <Stack.Screen name="TeamLeaveRequests" component={TeamLeaveRequestsScreen} />
      <Stack.Screen name="TaskDetail" component={TaskDetailScreen} />
      <Stack.Screen name="RequirementCoordination" component={RequirementCoordinationScreen} />
      <Stack.Screen name="ManagerProfile" component={ManagerProfileScreen} />
    </Stack.Navigator>
  );
};

export default ManagerNavigator;
