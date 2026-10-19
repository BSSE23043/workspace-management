// ============================================================================
// Company Admins Screen (Super Admin Portal)
// ----------------------------------------------------------------------------
// This screen lets the Super Admin:
//   1. ADD a new Company Admin account (Company Name, Admin Name, Email,
//      Password) — e.g. when a new company subscribes to WMS.
//   2. REMOVE an existing Company Admin account.
//
// Company Admin accounts are stored in AsyncStorage under STORAGE_KEYS.USERS
// with role = 'ADMIN' (the user database has no demo users anymore). That way
// the normal Login flow picks them up automatically (no extra login code needed).
// ============================================================================
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import storageService, { STORAGE_KEYS } from '../../services/storageService';
import { isValidEmail, isValidPassword } from '../../utils/validation';
import HeaderBar from '../../components/common/HeaderBar';
import AppInput from '../../components/common/AppInput';
import Icon from '../../components/common/Icon';

export const CompanyAdminsScreen = ({ navigation }) => {
  const { getRolePalette } = useTheme();
  const palette = getRolePalette('SUPER_ADMIN');

  // Form state (controlled inputs)
  const [companyName, setCompanyName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // List state: all Company Admin accounts loaded from AsyncStorage
  const [admins, setAdmins] = useState([]);

  // Syllabus requirement: useRef focus chaining (name -> email -> password)
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);

  // Reload the admin list from AsyncStorage (used on mount and after changes)
  const loadAdmins = async () => {
    const storedUsers = await storageService.getItem(STORAGE_KEYS.USERS, []);
    // Company Admins are every stored user with role ADMIN
    const adminUsers = storedUsers.filter((u) => u.role === 'ADMIN');
    setAdmins(adminUsers);
  };

  // Load the list once when the screen mounts
  useEffect(() => {
    loadAdmins();
  }, []);

  // ------------------------------------------------------------------
  // ADD a new Company Admin account
  // ------------------------------------------------------------------
  const handleAddAdmin = async () => {
    setErrorMessage('');

    // Simple beginner-friendly validation (pure functions from utils)
    if (!companyName.trim()) {
      setErrorMessage('Please enter the company name');
      return;
    }
    if (!adminName.trim()) {
      setErrorMessage('Please enter the admin full name');
      return;
    }
    if (!isValidEmail(adminEmail)) {
      setErrorMessage('Please enter a valid work email address');
      return;
    }
    if (!isValidPassword(adminPassword)) {
      setErrorMessage('! Password must be at least 6 characters');
      return;
    }

    const storedUsers = await storageService.getItem(STORAGE_KEYS.USERS, []);

    // Check that no account (of any role) already uses this email
    const existingUser = storedUsers.find(
      (u) => u.email.toLowerCase() === adminEmail.toLowerCase().trim()
    );
    if (existingUser) {
      setErrorMessage('An account with this email already exists');
      return;
    }

    // Build the new Company Admin user object.
    // The companyId is a unique scope key for this company: every user this
    // admin later creates will carry the same companyId, so their portal
    // never shows users belonging to another company (or the demo seeds).
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const newAdmin = {
      id: `ADM-${randomSuffix}`,
      companyId: `CO-${randomSuffix}`,
      name: adminName.trim(),
      email: adminEmail.toLowerCase().trim(),
      password: adminPassword,
        role: 'ADMIN',
        title: 'Company Administrator',
      companyName: companyName.trim(),
      location: 'HQ - Main Office',
      phone: '+92 300 0000000',
      avatarKey: 'dpAdminUsman',
      isActive: true,
      reportsTo: null,
      createdAt: new Date().toISOString(),
    };

    // Save the updated users list back to AsyncStorage
    const updatedUsers = [newAdmin, ...storedUsers];
    await storageService.setItem(STORAGE_KEYS.USERS, updatedUsers);

    // Clear the form and refresh the visible list
    setCompanyName('');
    setAdminName('');
    setAdminEmail('');
    setAdminPassword('');
    loadAdmins();

    Alert.alert(
      'Company Admin Created',
      `${newAdmin.name} can now log in with:\n${newAdmin.email}\n${newAdmin.password}`,
      [{ text: 'OK' }]
    );
  };

  // ------------------------------------------------------------------
  // REMOVE an existing Company Admin account
  // ------------------------------------------------------------------
  const handleRemoveAdmin = (admin) => {
    Alert.alert(
      'Remove Company Admin',
      `Are you sure you want to remove ${admin.name} (${admin.email})? They will no longer be able to log in.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const storedUsers = await storageService.getItem(STORAGE_KEYS.USERS, []);
            // Keep everyone except the removed admin (immutability: filter creates a new array)
            const updatedUsers = storedUsers.filter((u) => u.id !== admin.id);
            await storageService.setItem(STORAGE_KEYS.USERS, updatedUsers);
            loadAdmins();
          },
        },
      ]
    );
  };

  // Renders one Company Admin row inside the FlatList
  const renderAdminItem = ({ item }) => (
    <View style={[styles.adminCard, { backgroundColor: palette.surface, borderColor: palette.cardBorder }]}>
      <View style={[styles.adminAvatar, { backgroundColor: palette.primary }]}>
        <Text style={styles.adminAvatarText}>{item.name.charAt(0).toUpperCase()}</Text>
      </View>

      <View style={styles.adminInfo}>
        <Text style={[styles.adminName, { color: palette.textPrimary }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.adminCompany, { color: palette.primary }]} numberOfLines={1}>
          {item.companyName || 'Unassigned Company'}
        </Text>
        <Text style={[styles.adminEmail, { color: palette.textSecondary }]} numberOfLines={1}>
          {item.email}
        </Text>
      </View>

      {/* Remove button (trash icon) */}
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleRemoveAdmin(item)}
        activeOpacity={0.7}
        accessibilityLabel={`Remove ${item.name}`}
      >
        <Icon name="trash" size={18} color="#DC2626" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <HeaderBar
        title="Company Admins"
        subtitle="Super Admin Portal"
        navigation={navigation}
        statusText="PLATFORM LIVE"
      />

      <KeyboardAvoidingView
        style={styles.flexOne}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          data={admins}
          keyExtractor={(item) => item.id}
          renderItem={renderAdminItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View>
              {/* ---------------- Add Company Admin Form Card ---------------- */}
              <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.cardBorder }]}>
                <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>
                  + Add Company Admin
                </Text>
                <Text style={[styles.cardDesc, { color: palette.textSecondary }]}>
                  When a new company registers with WMS, create their Company
                  Admin account here. The company then manages its own
                  employees from that account.
                </Text>

                {/* Inline error banner (conditional rendering with &&) */}
                {Boolean(errorMessage) && (
                  <View style={styles.errorBanner}>
                    <Icon name="alert-circle" size={16} color="#DC2626" />
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                )}

                <AppInput
                  label="Company Name *"
                  value={companyName}
                  onChangeText={(txt) => {
                    setCompanyName(txt);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder="e.g. Zafar Corp"
                  returnKeyType="next"
                />

                <AppInput
                  label="Admin Full Name *"
                  value={adminName}
                  onChangeText={(txt) => {
                    setAdminName(txt);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder="e.g. Ahmed Khan"
                  returnKeyType="next"
                  onSubmitEditing={() => emailInputRef.current?.focus()}
                />

                <AppInput
                  ref={emailInputRef}
                  label="Admin Email Address *"
                  value={adminEmail}
                  onChangeText={(txt) => {
                    setAdminEmail(txt);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder="e.g. admin@zafarcorp.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                />

                <AppInput
                  ref={passwordInputRef}
                  label="Initial Password *"
                  value={adminPassword}
                  onChangeText={(txt) => {
                    setAdminPassword(txt);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder="At least 6 characters"
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={handleAddAdmin}
                  error={
                    adminPassword.length > 0 && !isValidPassword(adminPassword)
                      ? '! Password must be at least 6 characters'
                      : null
                  }
                />

                <TouchableOpacity
                  style={[styles.addBtn, { backgroundColor: palette.primary }]}
                  onPress={handleAddAdmin}
                  activeOpacity={0.85}
                >
                  <Icon name="add" size={18} color="#FFFFFF" />
                  <Text style={styles.addBtnText}>Create Company Admin</Text>
                </TouchableOpacity>
              </View>

              {/* Section title above the admin list */}
              <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>
                Provisioned Company Admins ({admins.length})
              </Text>
            </View>
          }
          // Shown when the list has no items
          ListEmptyComponent={
            <View style={[styles.emptyBox, { borderColor: palette.cardBorder }]}>
              <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
                No Company Admins yet. Create one using the form above.
              </Text>
            </View>
          }
        />
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flexOne: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    marginBottom: 16,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardDesc: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 14,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
    gap: 8,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
    paddingVertical: 13,
    marginTop: 6,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  adminCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
    gap: 12,
  },
  adminAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  adminInfo: {
    flex: 1,
  },
  adminName: {
    fontSize: 14,
    fontWeight: '700',
  },
  adminCompany: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 1,
  },
  adminEmail: {
    fontSize: 11.5,
    marginTop: 1,
  },
  removeButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12.5,
    textAlign: 'center',
  },
});

export default CompanyAdminsScreen;
