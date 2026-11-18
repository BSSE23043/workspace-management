import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Switch,
  Alert,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../context/AuthContext';
import HeaderBar from '../../components/common/HeaderBar';
import AppInput from '../../components/common/AppInput';
import AppButton from '../../components/common/AppButton';
import ChipButton from '../../components/common/ChipButton';
import CardButton from '../../components/common/CardButton';
import { getAvatarSource } from '../../assets/images';
import { isValidEmail } from '../../utils/validation';
import { pickProfilePictureFromGallery } from '../../utils/imagePicker';
import {
  fetchCompanyUsersApi,
  createCompanyUserApi,
  updateCompanyUserApi,
} from '../../services/api';

const SYSTEM_ROLES = [
  { id: 'EMPLOYEE', label: 'Employee', desc: 'Can submit leave, punch attendance, view salary & work tasks' },
  { id: 'MANAGER', label: 'Manager', desc: 'Handles client requirements and task management' },
  { id: 'HR', label: 'HR Specialist', desc: 'Configures deduction rates, handles tickets & attendance overrides' },
  { id: 'CLIENT', label: 'Client Representative', desc: 'Tracks requirement milestones & sends broadcast clarifications' },
];

export const EmployeeFormScreen = ({ navigation, route }) => {
  const { getRolePalette } = useTheme();
  const palette = getRolePalette('ADMIN');

  const userId = route?.params?.userId;
  const { currentUser } = useAuth();

  // Users are loaded from the MySQL database via backend API.
  const [users, setUsers] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Company-scope: a company admin created by the Super Admin only works
  // with users of their own companyId.
  const scopedUsers = currentUser?.companyId
    ? users.filter((u) => u.companyId === currentUser.companyId)
    : users;

  const existingUser = userId
    ? scopedUsers.find((u) => u.id === userId || u.email === userId)
    : null;
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

  // Load the company users from the MySQL database once on mount; after loading,
  // prefill the form fields when editing an existing user (or pick a default
  // manager for a new one).
  useEffect(() => {
    (async () => {
      try {
        const scoped = await fetchCompanyUsersApi(currentUser?.companyId);
        const userList = Array.isArray(scoped) ? scoped : [];
        setUsers(userList);

        const existing = userId
          ? userList.find((u) => u.id === userId || u.email === userId)
          : null;
        if (existing) {
          setName(existing.name || '');
          setEmail(existing.email || '');
          setPassword(existing.password || 'password123');
          setRole(existing.role || 'EMPLOYEE');
          const managerTarget = existing.managerId || existing.managerEmail;
          const storedManager = userList.find(
            (u) => (u.id === managerTarget || u.email === managerTarget) && u.role === 'MANAGER'
          );
          setSelectedManagerId(storedManager ? storedManager.id : '');
          setAvatarKey(existing.avatarKey || 'dpEmpAli');
          setIsActive(existing.isActive !== false);
        } else {
          // New user: default to the first available manager of this company
          setSelectedManagerId(userList.find((u) => u.role === 'MANAGER')?.id || '');
        }
      } catch (err) {
        console.warn('[EmployeeForm] Failed loading company users from DB:', err);
      } finally {
        setIsLoaded(true);
      }
    })();
  }, [currentUser?.companyId, userId]);

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
    const mgrObj = scopedUsers.find((u) => u.id === selectedManagerId && u.role === 'MANAGER');

    // Users are typed by ROLE only (no departments in the system).
    const userPayload = {
      companyId: currentUser?.companyId,
      name: name.trim(),
      email: normalizedEmail,
      password,
      role,
      managerId: role === 'EMPLOYEE' && mgrObj ? mgrObj.email : null,
      managerEmail: role === 'EMPLOYEE' && mgrObj ? mgrObj.email : null,
      reportsTo: role === 'EMPLOYEE' && mgrObj ? mgrObj.name : null,
      avatarKey,
      isActive,
      title: existingUser?.title || `${role} Specialist`,
    };

    try {
      if (isEditing) {
        await updateCompanyUserApi(existingUser.email, userPayload);
        Alert.alert('Success', `User record for "${name}" updated successfully.`, [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        await createCompanyUserApi(userPayload);
        Alert.alert('User Provisioned', `New user "${name}" created and provisioned.`, [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (err) {
      Alert.alert('Validation Error', err.message || 'Failed to save user record to database.');
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
              <AppButton
                title="Change Employee DP"
                variant="primary"
                size="sm"
                icon="camera"
                style={{ marginBottom: 4, borderRadius: 8, paddingVertical: 9 }}
                onPress={handlePickEmployeeDp}
              />
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
                <CardButton
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
                </CardButton>
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
                    <ChipButton
                      key={mgr.id}
                      label={`${mgr.name} (${mgr.role})`}
                      selected={isSelected}
                      activeColor="#1D4ED8"
                      style={{ paddingHorizontal: 12, paddingVertical: 7 }}
                      textStyle={{ color: isSelected ? '#FFFFFF' : palette.textPrimary }}
                      onPress={() => setSelectedManagerId(mgr.id)}
                    />
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
        <AppButton
          title="Save User Record"
          variant="primary"
          size="lg"
          fullWidth
          onPress={handleSave}
        />
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
});

export default EmployeeFormScreen;
