import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import Icon from '../components/common/Icon';

// Screens
import HRDashboardScreen from '../screens/hr/HRDashboardScreen';
import CompanyAttendanceScreen from '../screens/hr/CompanyAttendanceScreen';
import SalaryEstimatesScreen from '../screens/hr/SalaryEstimatesScreen';
import HRTicketListScreen from '../screens/hr/HRTicketListScreen';
import SalaryConfigScreen from '../screens/hr/SalaryConfigScreen';
import HRTicketDetailScreen from '../screens/hr/HRTicketDetailScreen';
import HRProfileScreen from '../screens/hr/HRProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const HRTabs = () => {
  const { getRolePalette } = useTheme();
  const palette = getRolePalette('HR');

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
          else if (route.name === 'Attendance') iconName = 'time';
          else if (route.name === 'Payroll') iconName = 'cash';
          else if (route.name === 'Tickets') iconName = 'ticket';
          return <Icon name={iconName} size={size || 20} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={HRDashboardScreen} />
      <Tab.Screen name="Attendance" component={CompanyAttendanceScreen} />
      <Tab.Screen name="Payroll" component={SalaryEstimatesScreen} />
      <Tab.Screen name="Tickets" component={HRTicketListScreen} />
    </Tab.Navigator>
  );
};

export const HRNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HRTabs" component={HRTabs} />
      <Stack.Screen name="SalaryConfig" component={SalaryConfigScreen} />
      <Stack.Screen name="HRTicketDetail" component={HRTicketDetailScreen} />
      <Stack.Screen name="HRProfile" component={HRProfileScreen} />
    </Stack.Navigator>
  );
};

export default HRNavigator;
