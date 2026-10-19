import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
  Alert,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../context/AuthContext';
import HeaderBar from '../../components/common/HeaderBar';
import AppInput from '../../components/common/AppInput';
import Icon from '../../components/common/Icon';
import { getAvatarSource } from '../../assets/images';
import { isValidEmail } from '../../utils/validation';
import { pickProfilePictureFromGallery } from '../../utils/imagePicker';
import storageService, { STORAGE_KEYS } from '../../services/storageService';

const SYSTEM_ROLES = [
  { id: 'EMPLOYEE', label: 'Employee', desc: 'Can submit leave, punch attendance, view salary & work tasks' },
  { id: 'MANAGER', label: 'Manager', desc: 'Handles client requirements and task management' },
  { id: 'HR', label: 'HR Specialist', desc: 'Configures deduction rates, handles tickets & attendance overrides' },
  { id: 'ADMIN', label: 'Company Administrator', desc: 'Full account provisioning, policy setup & system drawer' },
  { id: 'CLIENT', label: 'Client Representative', desc: 'Tracks requirement milestones & sends broadcast clarifications' },
];

export const EmployeeFormScreen = ({ navigation, route }) => {
  const { getRolePalette } = useTheme();
  const palette = getRolePalette('ADMIN');

  const userId = route?.params?.userId;
  const { currentUser } = useAuth();

  // Users are loaded from AsyncStorage (the single source of truth) —
  // Redux no longer stores the user list.
  const [users, setUsers] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Company-scope: a company admin created by the Super Admin only works
  // with users of their own companyId.
  const scopedUsers = currentUser?.companyId
    ? users.filter((u) => u.companyId === currentUser.companyId)
    : users;

  const existingUser = userId ? scopedUsers.find((u) => u.id === userId) : null;
  const isEditing = Boolean(existingUser);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123');
  const [role, setRole] = useState('EMPLOYEE');
  const [selectedManagerId, setSelectedManagerId] = useState('');
  const [avatarKey, setAvatarKey] = useState('dpEmpAli');
  const [isActive, setIsActive] = useState(true);

  const [submitted, setSubmitted] = useState(false);

  // Opens the device gallery so the Admin can pick the employee's DP.
  const handlePickEmployeeDp = () => {
    pickProfilePictureFromGallery((uri) => {
      setAvatarKey(uri);
    });
  };

  // Load the stored users once on mount; after loading, prefill the form
  // fields when editing an existing user (or pick a default manager for a
  // new one). AsyncStorage is async, so the fields start empty and are
  // filled here.
  useEffect(() => {
    (async () => {
      const storedUsers = await storageService.getItem(STORAGE_KEYS.USERS, []);
      const scoped = currentUser?.companyId
        ? storedUsers.filter((u) => u.companyId === currentUser.companyId)
        : storedUsers;
      setUsers(scoped);

      const existing = userId ? scoped.find((u) => u.id === userId) : null;
      if (existing) {
        setName(existing.name || '');
        setEmail(existing.email || '');
        setPassword(existing.password || 'password123');
        setRole(existing.role || 'EMPLOYEE');
        // Only keep a stored reporting manager if it actually points at a
        // MANAGER; an old wrong assignment (e.g. an admin) is treated as
        // unassigned so the "assign a manager" warning shows again.
        const storedManager = scoped.find((u) => u.id === existing.managerId);
        setSelectedManagerId(
          storedManager && storedManager.role === 'MANAGER' ? existing.managerId : ''
        );
        setAvatarKey(existing.avatarKey || 'dpEmpAli');
        setIsActive(existing.isActive !== false);
      } else {
        // New user: default to the first available manager of this company
        setSelectedManagerId(scoped.find((u) => u.role === 'MANAGER')?.id || '');
      }
      setIsLoaded(true);
    })();
  }, []);

  // Available managers list (from the loaded, company-scoped users).
  // Employees may only be assigned to a MANAGER — never to an admin.
  const managerOptions = scopedUsers.filter(
    (u) => u.role === 'MANAGER'
  );

  const handleSave = async () => {
    setSubmitted(true);
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Full Name is required.');
      return;
    }
    if (!isValidEmail(email)) {
      Alert.alert('Validation Error', 'Please enter a valid work email address.');
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Every account type (ADMIN, MANAGER, HR, EMPLOYEE, CLIENT) lives in the same
    // AsyncStorage user list and logs in with the same lookup, so one email may
    // only ever belong to ONE user. We re-read the FULL stored list here (not the
    // company-scoped subset shown in the directory) so a duplicate is caught even
    // when it belongs to another role, another company, or the super admin's own
    // Company Admin accounts. On edit we skip our own record so saving an
    // unchanged email still works.
    const storedUsers = await storageService.getItem(STORAGE_KEYS.USERS, []);
    const emailTaken = (Array.isArray(storedUsers) ? storedUsers : []).some(
      (u) => (u.email || '').toLowerCase() === normalizedEmail && u.id !== existingUser?.id
    );
    if (emailTaken) {
      Alert.alert(
        'Validation Error',
        `The email "${normalizedEmail}" is already registered to another user. Each user must have a unique email address.`
      );
      return;
    }

    const mgrObj = scopedUsers.find((u) => u.id === selectedManagerId && u.role === 'MANAGER');

    // Users are typed by ROLE only (no departments in the system).
    const userPayload = {
      id: existingUser?.id || `EMP-${Math.floor(100 + Math.random() * 900)}`,
      name: name.trim(),
      email: normalizedEmail,
      password,
      role,
      managerId: role === 'EMPLOYEE' ? selectedManagerId : null,
      reportsTo: role === 'EMPLOYEE' && mgrObj ? mgrObj.name : null,
      avatarKey,
      isActive,
      title: existingUser?.title || `${role} Specialist`,
    };

    // Only tag NEW users with the admin's company (on edit we must not
    // touch companyId, otherwise an existing company tag would be wiped).
    if (!isEditing && currentUser?.companyId) {
      userPayload.companyId = currentUser.companyId;
    }

    // Persist to AsyncStorage — the single source of truth for users.
    try {
      const updatedUsers = isEditing
        ? storedUsers.map((u) => (u.id === userPayload.id ? { ...u, ...userPayload } : u))
        : [userPayload, ...storedUsers];
      await storageService.setItem(STORAGE_KEYS.USERS, updatedUsers);
    } catch (err) {
      console.warn('[EmployeeForm] Failed persisting user to storage:', err);
    }

    if (isEditing) {
      Alert.alert('Success', `User record for "${name}" updated successfully.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } else {
      Alert.alert('User Provisioned', `New user "${name}" created and provisioned.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  };

  const hasMissingManager = role === 'EMPLOYEE' && !selectedManagerId;

  // Wait for the stored users to load before rendering the form
  if (!isLoaded) {
    return <View style={[styles.container, { backgroundColor: palette.background }]} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <HeaderBar
        title={isEditing ? 'Edit User & Role Assignment' : 'Provision New User'}
        showBack
        navigation={navigation}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Set Employee DP Section */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>
            Set Employee DP (Profile Picture)
          </Text>
          <Text style={[styles.cardSubtitle, { color: palette.textSecondary }]}>
            Admin assigns the initial display picture
          </Text>

          <View style={styles.dpPreviewRow}>
            <Image
              source={getAvatarSource(avatarKey)}
              style={styles.dpLargePreview}
            />
            <View style={styles.dpActionsCol}>
              <TouchableOpacity
                style={[styles.changeDpBtn, { backgroundColor: palette.primary }]}
                onPress={handlePickEmployeeDp}
              >
                <Icon name="camera" size={15} color="#FFFFFF" />
                <Text style={styles.changeDpBtnText}>Change Employee DP</Text>
              </TouchableOpacity>
              <Text style={[styles.dpHintText, { color: palette.textSecondary }]}>
                Pick a photo from the device gallery
              </Text>
            </View>
          </View>
        </View>

        {/* Credentials Form */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>
            Account Credentials
          </Text>

          <AppInput
            label="Full Name *"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Staff Member"
            error={submitted && !name.trim() ? '! Full name is required' : null}
          />

          <AppInput
            label="Work Email Address *"
            value={email}
            onChangeText={setEmail}
            placeholder="e.g. employee@yourcompany.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={submitted && !isValidEmail(email) ? '! Valid email is required' : null}
          />

          <AppInput
            label="Demo / Initial Password *"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter password"
            secureTextEntry
          />
        </View>

        {/* Assign System Access Role */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>
            Assign System Access Role
          </Text>
          <Text style={[styles.cardSubtitle, { color: palette.textSecondary }]}>
            Role dictates navigation layout, drawer vs tabs and permissions
          </Text>

          <View style={styles.roleRadioGroup}>
            {SYSTEM_ROLES.map((r) => {
              const isSelected = role === r.id;
              return (
                <TouchableOpacity
                  key={r.id}
                  style={[
                    styles.roleRadioCard,
                    { backgroundColor: palette.card, borderColor: palette.cardBorder },
                    isSelected && { borderColor: palette.primary, backgroundColor: palette.inputBackground },
                  ]}
                  onPress={() => setRole(r.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.radioTop}>
                    <View style={[styles.radioCircle, isSelected && { borderColor: palette.primary }]}>
                      {isSelected && <View style={[styles.radioDot, { backgroundColor: palette.primary }]} />}
                    </View>
                    <Text style={[styles.roleRadioLabel, { color: palette.textPrimary }]}>{r.label}</Text>
                  </View>
                  <Text style={[styles.roleRadioDesc, { color: palette.textSecondary }]}>{r.desc}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Organizational Hierarchy */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>
            Organizational Hierarchy
          </Text>

          {role === 'EMPLOYEE' && (
            <View style={{ marginTop: 14 }}>
              <Text style={[styles.inputLabel, { color: palette.textPrimary }]}>
                Assigned Reporting Manager
              </Text>
              <View style={styles.chipsWrap}>
                {managerOptions.map((mgr) => {
                  const isSelected = selectedManagerId === mgr.id;
                  return (
                    <TouchableOpacity
                      key={mgr.id}
                      style={[
                        styles.deptSelectChip,
                        { borderColor: palette.cardBorder },
                        isSelected && { backgroundColor: '#1D4ED8', borderColor: '#1D4ED8' },
                      ]}
                      onPress={() => setSelectedManagerId(mgr.id)}
                    >
                      <Text style={[styles.deptSelectText, isSelected ? { color: '#FFFFFF' } : { color: palette.textPrimary }]}>
                        {mgr.name} ({mgr.role})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Syllabus Requirement: Inline warning banner */}
              {hasMissingManager && (
                <Text style={styles.hierarchyWarning}>
                  ! Employee must be assigned to a manager.
                </Text>
              )}
            </View>
          )}

          {/* Account Active Toggle */}
          <View style={[styles.activeToggleRow, { borderTopColor: palette.divider }]}>
            <View>
              <Text style={[styles.activeToggleTitle, { color: palette.textPrimary }]}>
                Account Active Status
              </Text>
              <Text style={[styles.activeToggleSub, { color: palette.textSecondary }]}>
                Deactivated accounts cannot authenticate
              </Text>
            </View>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: '#CBD5E1', true: '#86EFAC' }}
              thumbColor={isActive ? '#16A34A' : '#94A3B8'}
            />
          </View>
        </View>

        {/* Save User Record Button */}
        <TouchableOpacity
          style={[styles.saveRecordBtn, { backgroundColor: palette.primary }]}
          onPress={handleSave}
          activeOpacity={0.85}
        >
          <Text style={styles.saveRecordBtnText}>Save User Record</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 18,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 14,
  },
  dpPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 14,
  },
  dpLargePreview: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    borderColor: '#CBD5E1',
  },
  dpActionsCol: {
    flex: 1,
  },
  changeDpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
    marginBottom: 4,
  },
  changeDpBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  dpHintText: {
    fontSize: 11,
  },
  roleRadioGroup: {
    gap: 8,
  },
  roleRadioCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  radioTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  roleRadioLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  roleRadioDesc: {
    fontSize: 11,
    marginTop: 4,
    marginLeft: 26,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  deptSelectChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  deptSelectText: {
    fontSize: 12,
    fontWeight: '600',
  },
  hierarchyWarning: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
  },
  activeToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 14,
    marginTop: 16,
  },
  activeToggleTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  activeToggleSub: {
    fontSize: 11,
    marginTop: 2,
  },
  saveRecordBtn: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveRecordBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default EmployeeFormScreen;
