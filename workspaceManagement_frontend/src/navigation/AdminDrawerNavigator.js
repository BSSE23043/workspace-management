import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
} from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getAvatarSource, IMAGES } from '../assets/images';
import Icon from '../components/common/Icon';

// Screens
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import CompanyProfileScreen from '../screens/admin/CompanyProfileScreen';
import EmployeeDirectoryScreen from '../screens/admin/EmployeeDirectoryScreen';
import EmployeeFormScreen from '../screens/admin/EmployeeFormScreen';
import AdminProfileScreen from '../screens/admin/AdminProfileScreen';

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

const AdminStackNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <Stack.Screen name="CompanyProfile" component={CompanyProfileScreen} />
      <Stack.Screen name="EmployeeDirectory" component={EmployeeDirectoryScreen} />
      <Stack.Screen name="EmployeeForm" component={EmployeeFormScreen} />
      <Stack.Screen name="AdminProfile" component={AdminProfileScreen} />
    </Stack.Navigator>
  );
};

const CustomAdminDrawerContent = (props) => {
  const { currentUser, logout } = useAuth();
  const { getRolePalette } = useTheme();
  const palette = getRolePalette('ADMIN');

  const navigateTo = (screenName) => {
    try {
      props.navigation.navigate('AdminStack', { screen: screenName });
    } catch {
      props.navigation.navigate(screenName);
    }
    if (props.navigation.closeDrawer) {
      props.navigation.closeDrawer();
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out of Admin portal?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <View style={[styles.drawerContainer, { backgroundColor: palette.card }]}>
      <DrawerContentScrollView {...props} contentContainerStyle={styles.scrollContent}>
        {/* Drawer Header matching Drawer Menu.png */}
        <View style={[styles.drawerHeader, { borderBottomColor: palette.divider }]}>
          <Image
            source={getAvatarSource(currentUser?.avatarKey || IMAGES.dpAdminUsman)}
            style={styles.adminAvatar}
          />
          <Text style={[styles.adminName, { color: palette.textPrimary }]}>
            {currentUser?.name || 'Administrator'} (ADMIN)
          </Text>
          <Text style={[styles.adminEmail, { color: palette.textSecondary }]}>
            {currentUser?.email || ''}
          </Text>
        </View>

        {/* Menu Items */}
        <View style={styles.menuItemsList}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigateTo('AdminDashboard')}
          >
            <Icon name="grid" size={18} color="#1E293B" />
            <Text style={[styles.menuItemText, { color: palette.textPrimary }]}>Executive Dashboard</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigateTo('AdminProfile')}
          >
            <Icon name="settings" size={18} color="#1E293B" />
            <Text style={[styles.menuItemText, { color: palette.textPrimary }]}>
              Editable Profile &amp; Theme Settings
            </Text>
          </TouchableOpacity>
        </View>
      </DrawerContentScrollView>

      {/* Bottom Red Logout Button */}
      <View style={[styles.drawerFooter, { borderTopColor: palette.divider }]}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Icon name="log-out" size={18} color="#DC2626" />
          <Text style={styles.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const AdminDrawerNavigator = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomAdminDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        drawerStyle: { width: 300 },
      }}
    >
      <Drawer.Screen name="AdminStack" component={AdminStackNavigator} />
    </Drawer.Navigator>
  );
};

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 20,
  },
  drawerHeader: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    alignItems: 'flex-start',
  },
  adminAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 10,
  },
  adminName: {
    fontSize: 16,
    fontWeight: '800',
  },
  adminEmail: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 8,
  },
  menuItemsList: {
    paddingTop: 12,
    paddingHorizontal: 12,
    gap: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 12,
  },
  menuItemText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  drawerFooter: {
    borderTopWidth: 1,
    padding: 16,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  logoutBtnText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
  },
});

export default AdminDrawerNavigator;
