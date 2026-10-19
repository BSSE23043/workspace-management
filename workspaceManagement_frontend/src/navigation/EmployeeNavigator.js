import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import Icon from '../components/common/Icon';

// Screens
import EmployeeDashboardScreen from '../screens/employee/EmployeeDashboardScreen';
import AttendanceActionScreen from '../screens/employee/AttendanceActionScreen';
import MySalaryEstimateScreen from '../screens/employee/MySalaryEstimateScreen';
import WorkAndRequestsHubScreen from '../screens/employee/WorkAndRequestsHubScreen';
import MyLeaveRequestsScreen from '../screens/employee/MyLeaveRequestsScreen';
import MyTasksScreen from '../screens/employee/MyTasksScreen';
import EmployeeProfileScreen from '../screens/employee/EmployeeProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const EmployeeTabs = () => {
  const { getRolePalette } = useTheme();
  const palette = getRolePalette('EMPLOYEE');

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
          if (route.name === 'Workspace') iconName = 'grid';
          else if (route.name === 'Attendance') iconName = 'location';
          else if (route.name === 'Salary') iconName = 'cash';
          else if (route.name === 'Work & Requests') iconName = 'briefcase';
          return <Icon name={iconName} size={size || 20} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Workspace" component={EmployeeDashboardScreen} />
      <Tab.Screen name="Attendance" component={AttendanceActionScreen} />
      <Tab.Screen name="Salary" component={MySalaryEstimateScreen} />
      <Tab.Screen name="Work & Requests" component={WorkAndRequestsHubScreen} />
    </Tab.Navigator>
  );
};

export const EmployeeNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EmployeeTabs" component={EmployeeTabs} />
      <Stack.Screen name="MyLeaveRequests" component={MyLeaveRequestsScreen} />
      <Stack.Screen name="MyTasks" component={MyTasksScreen} />
      <Stack.Screen name="EmployeeProfile" component={EmployeeProfileScreen} />
    </Stack.Navigator>
  );
};

export default EmployeeNavigator;
