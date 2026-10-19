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
import { useTheme } from '../../hooks/useTheme';
import HeaderBar from '../../components/common/HeaderBar';
import AppInput from '../../components/common/AppInput';
import Icon from '../../components/common/Icon';
import { getAvatarSource } from '../../assets/images';
import { pickProfilePictureFromGallery } from '../../utils/imagePicker';

export const HRProfileScreen = ({ navigation }) => {
  const { currentUser, updateCurrentUser, logout } = useAuth();
  const { getRolePalette, isDark, toggleTheme } = useTheme();
  const palette = getRolePalette('HR');

  const [notifyOnTickets, setNotifyOnTickets] = useState(true);

  // Opens the device gallery to pick a new profile picture (DP).
  const handleChangeDp = () => {
    pickProfilePictureFromGallery((uri) => {
      updateCurrentUser({ avatarKey: uri, avatarCustomUri: uri });
    });
  };

  const handleLogout = () => {
    Alert.alert('Log Out of Operations', 'Are you sure you want to exit the HR Operations session?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <HeaderBar
        title="HR View Profile & Credentials"
        subtitle="Human Resources"
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
            {/* Active DP change button for HR */}
            <TouchableOpacity
              style={[styles.cameraBadge, { backgroundColor: palette.primary }]}
              onPress={handleChangeDp}
            >
              <Icon name="camera" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <Text style={[styles.userName, { color: palette.textPrimary }]}>{currentUser?.name}</Text>
          <View style={[styles.roleTag, { backgroundColor: palette.primary }]}>
            <Text style={styles.roleTagText}>HR & Payroll Specialist</Text>
          </View>
          <Text style={[styles.userEmail, { color: palette.textSecondary }]}>{currentUser?.email}</Text>
        </View>

        {/* Operational Scope 2x2 Privilege Grid */}
        <Text style={[styles.sectionHeading, { color: palette.textPrimary }]}>
          Operational Scope & Privileges
        </Text>
        <View style={styles.scopeGrid}>
          <View style={[styles.scopeCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
            <Icon name="shield-checkmark" size={18} color="#0F766E" />
            <Text style={[styles.scopeTitle, { color: palette.textPrimary }]}>Attendance Override</Text>
            <Text style={[styles.scopeSub, { color: palette.textSecondary }]}>Audit punch logs</Text>
          </View>

          <View style={[styles.scopeCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
            <Icon name="cash" size={18} color="#0F766E" />
            <Text style={[styles.scopeTitle, { color: palette.textPrimary }]}>Custom Deduction</Text>
            <Text style={[styles.scopeSub, { color: palette.textSecondary }]}>Configure rates</Text>
          </View>

          <View style={[styles.scopeCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
            <Icon name="ticket" size={18} color="#0F766E" />
            <Text style={[styles.scopeTitle, { color: palette.textPrimary }]}>Ticket Resolution</Text>
            <Text style={[styles.scopeSub, { color: palette.textSecondary }]}>Dispute timeline</Text>
          </View>

          <View style={[styles.scopeCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
            <Icon name="wallet" size={18} color="#0F766E" />
            <Text style={[styles.scopeTitle, { color: palette.textPrimary }]}>Monthly Payroll</Text>
            <Text style={[styles.scopeSub, { color: palette.textSecondary }]}>Lock & export slip</Text>
          </View>
        </View>

        {/* Personnel Details (Managed by Admin - STRICTLY READ-ONLY LOCKED FIELDS) */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
          <View style={styles.lockedHeaderRow}>
            <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>
              Personnel Details (Managed by Admin)
            </Text>
            <View style={styles.lockIconRow}>
              <Icon name="lock-closed" size={14} color="#64748B" />
              <Text style={styles.lockNoticeText}>🔒 Read-Only Fields</Text>
            </View>
          </View>
          <Text style={[styles.cardSubtitle, { color: palette.textSecondary }]}>
            To modify contact or assignment details, please coordinate with Company Administrator.
          </Text>

          {/* Strictly read-only locked inputs: editable={false} */}
          <AppInput
            label="Full Name"
            value={currentUser?.name || ''}
            editable={false}
          />

          <AppInput
            label="Work Email"
            value={currentUser?.email || ''}
            editable={false}
          />

          <AppInput
            label="Direct Extension / Mobile"
            value={currentUser?.phone || '—'}
            editable={false}
          />

          <AppInput
            label="Office Station"
            value={currentUser?.location || '—'}
            editable={false}
          />

          <AppInput
            label="Emergency Contact"
            value={currentUser?.emergencyContact || '—'}
            editable={false}
          />
          {/* Note: DO NOT show a "Save Profile Information" button per blueprint specification */}
        </View>

        {/* Preferences & Compliance */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>
            Preferences & Compliance
          </Text>

          <View style={styles.prefRow}>
            <View>
              <Text style={[styles.prefTitle, { color: palette.textPrimary }]}>Ticket Activity Alerts</Text>
              <Text style={[styles.prefSub, { color: palette.textSecondary }]}>Push notifications for new support requests</Text>
            </View>
            <Switch
              value={notifyOnTickets}
              onValueChange={setNotifyOnTickets}
              trackColor={{ false: '#CBD5E1', true: '#99F6E4' }}
              thumbColor={notifyOnTickets ? '#0F766E' : '#94A3B8'}
            />
          </View>

          <View style={[styles.prefRow, { borderTopWidth: 1, borderTopColor: palette.divider, marginTop: 8 }]}>
            <View>
              <Text style={[styles.prefTitle, { color: palette.textPrimary }]}>Dark Mode</Text>
              <Text style={[styles.prefSub, { color: palette.textSecondary }]}>Toggle dark high-contrast mode</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#CBD5E1', true: '#99F6E4' }}
              thumbColor={isDark ? '#0F766E' : '#94A3B8'}
            />
          </View>
        </View>

        {/* Demo Switcher & Logout */}
        {/* Logout */}
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
          >
            <Icon name="log-out" size={16} color="#DC2626" />
            <Text style={styles.logoutBtnText}>Log Out of Operations</Text>
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
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  scopeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    marginBottom: 16,
  },
  scopeCard: {
    width: '48%',
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    alignItems: 'flex-start',
    gap: 4,
  },
  scopeTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  scopeSub: {
    fontSize: 11,
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
  lockIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lockNoticeText: {
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

export default HRProfileScreen;
