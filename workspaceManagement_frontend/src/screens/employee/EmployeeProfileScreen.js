import React, { useState } from 'react';
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
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import HeaderBar from '../../components/common/HeaderBar';
import AppInput from '../../components/common/AppInput';
import Icon from '../../components/common/Icon';
import { getAvatarSource } from '../../assets/images';
import { pickProfilePictureFromGallery } from '../../utils/imagePicker';

export const EmployeeProfileScreen = ({ navigation }) => {
  const { currentUser, updateCurrentUser, logout } = useAuth();
  const { getRolePalette, isDark, toggleTheme } = useTheme();
  const palette = getRolePalette('EMPLOYEE');

  const [taskPushAlerts, setTaskPushAlerts] = useState(true);

  // Opens the device gallery to pick a new profile picture (DP).
  const handleChangeDp = () => {
    pickProfilePictureFromGallery((uri) => {
      updateCurrentUser({ avatarKey: uri, avatarCustomUri: uri });
    });
  };

  const handleLogout = () => {
    Alert.alert('Terminate Session', 'Are you sure you want to log out of employee workspace?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <HeaderBar
        title="Employee View Profile & Workplace"
        subtitle="Engineering Division"
        showBack
        navigation={navigation}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Avatar Card */}
        <View style={[styles.avatarCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
          <View style={styles.avatarWrap}>
            <Image
              source={getAvatarSource(currentUser?.avatarKey || currentUser?.avatarCustomUri)}
              style={styles.avatarImg}
            />
            {/* Active DP change badge for Employee */}
            <TouchableOpacity
              style={[styles.cameraBadge, { backgroundColor: palette.primary }]}
              onPress={handleChangeDp}
            >
              <Icon name="camera" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <Text style={[styles.userName, { color: palette.textPrimary }]}>{currentUser?.name || 'Team Member'}</Text>
          <View style={[styles.roleTag, { backgroundColor: palette.primary }]}>
            <Text style={styles.roleTagText}>Software Engineer II</Text>
          </View>
          <Text style={[styles.userEmail, { color: palette.textSecondary }]}>{currentUser?.email}</Text>
        </View>

        {/* Telemetry & Leave Quota Row */}
        <View style={[styles.quotaCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
          <Text style={[styles.quotaHeading, { color: palette.textPrimary }]}>Telemetry &amp; Leave Quota</Text>
          <View style={styles.quotaRow}>
            <View style={styles.quotaItem}>
              <Text style={[styles.quotaVal, { color: palette.primary }]}>14</Text>
              <Text style={[styles.quotaSub, { color: palette.textSecondary }]}>Annual Leave</Text>
            </View>
            <View style={styles.quotaDivider} />
            <View style={styles.quotaItem}>
              <Text style={[styles.quotaVal, { color: '#2563EB' }]}>06</Text>
              <Text style={[styles.quotaSub, { color: palette.textSecondary }]}>Medical Leave</Text>
            </View>
            <View style={styles.quotaDivider} />
            <View style={styles.quotaItem}>
              <Text style={[styles.quotaVal, { color: '#16A34A' }]}>96%</Text>
              <Text style={[styles.quotaSub, { color: palette.textSecondary }]}>Presence Rate</Text>
            </View>
          </View>
        </View>

        {/* Personal Information (STRICTLY READ-ONLY LOCKED) */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
          <View style={styles.lockedHeaderRow}>
            <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>
              Personal Information (Managed by Admin)
            </Text>
            <View style={styles.lockRow}>
              <Icon name="lock-closed" size={13} color="#64748B" />
              <Text style={styles.lockText}>🔒 Locked</Text>
            </View>
          </View>
          <Text style={[styles.cardSubtitle, { color: palette.textSecondary }]}>
            All legal identifiers are centrally provisioned by Company Administrator.
          </Text>

          <AppInput
            label="Full Legal Name"
            value={currentUser?.name || ''}
            editable={false}
          />

          <AppInput
            label="Work Email"
            value={currentUser?.email || ''}
            editable={false}
          />

          <AppInput
            label="Mobile Contact"
            value={currentUser?.phone || '+92 333 1122334'}
            editable={false}
          />

          <AppInput
            label="Emergency Primary Contact"
            value={currentUser?.emergencyContact || 'Mrs. Raza (+92 345 9988776)'}
            editable={false}
          />

          <AppInput
            label="Residential Address"
            value={currentUser?.address || 'House 42, St 9, F-10/2, Islamabad'}
            editable={false}
          />
        </View>

        {/* Employment & Assignment (STRICTLY READ-ONLY LOCKED) */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
          <View style={styles.lockedHeaderRow}>
            <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>
              Employment &amp; Assignment
            </Text>
            <View style={styles.lockRow}>
              <Icon name="lock-closed" size={13} color="#64748B" />
              <Text style={styles.lockText}>🔒 Locked</Text>
            </View>
          </View>

          <AppInput
            label="Assigned Reporting Manager"
            value={currentUser?.reportsTo || '—'}
            editable={false}
          />

          <AppInput
            label="Designated Geofence Campus"
            value="Lahore Campus • Building B (200m Perimeter)"
            editable={false}
          />

          <AppInput
            label="Shift Schedule"
            value="Mon-Fri • 09:00 - 18:00 PKT"
            editable={false}
          />

          <AppInput
            label="Monthly Base Bracket"
            value="150,000 PKR / month"
            editable={false}
          />
          {/* Note: NO "Update Personal Info" button is rendered per blueprint specification */}
        </View>

        {/* Workspace Preferences & Settings */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>
            Workspace Preferences &amp; Settings
          </Text>

          <View style={styles.prefRow}>
            <View>
              <Text style={[styles.prefTitle, { color: palette.textPrimary }]}>Task &amp; Sprint Push Alerts</Text>
              <Text style={[styles.prefSub, { color: palette.textSecondary }]}>Notify when assigned sprint tasks or deadlines change</Text>
            </View>
            <Switch
              value={taskPushAlerts}
              onValueChange={setTaskPushAlerts}
              trackColor={{ false: '#CBD5E1', true: '#C7D2FE' }}
              thumbColor={taskPushAlerts ? palette.primary : '#94A3B8'}
            />
          </View>

          <View style={[styles.prefRow, { borderTopWidth: 1, borderTopColor: palette.divider, marginTop: 8 }]}>
            <View>
              <Text style={[styles.prefTitle, { color: palette.textPrimary }]}>Terminal Night Mode (ThemeContext)</Text>
              <Text style={[styles.prefSub, { color: palette.textSecondary }]}>High contrast dark styling</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#CBD5E1', true: '#C7D2FE' }}
              thumbColor={isDark ? palette.primary : '#94A3B8'}
            />
          </View>
        </View>

        {/* Terminate Session */}
        <View style={styles.bottomActions}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Icon name="log-out" size={16} color="#DC2626" />
            <Text style={styles.logoutBtnText}>Terminate Session / Log Out</Text>
          </TouchableOpacity>
        </View>
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
  avatarCard: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 8,
  },
  avatarImg: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
  },
  roleTag: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
    marginBottom: 4,
  },
  roleTagText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: 12,
    marginBottom: 12,
  },
  quotaCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  quotaHeading: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  quotaRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  quotaItem: {
    alignItems: 'center',
  },
  quotaVal: {
    fontSize: 18,
    fontWeight: '800',
  },
  quotaSub: {
    fontSize: 11,
    marginTop: 2,
  },
  quotaDivider: {
    width: 1,
    height: 26,
    backgroundColor: '#E2E8F0',
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  lockedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  lockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lockText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  cardSubtitle: {
    fontSize: 11,
    marginBottom: 12,
  },
  prefRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  prefTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  prefSub: {
    fontSize: 11,
    marginTop: 2,
  },
  bottomActions: {
    gap: 10,
  },
  switchRoleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
  },
  switchRoleText: {
    fontSize: 13,
    fontWeight: '700',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    paddingVertical: 12,
  },
  logoutBtnText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
  },
});

export default EmployeeProfileScreen;
