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

export const ManagerProfileScreen = ({ navigation }) => {
  const { currentUser, updateCurrentUser, logout } = useAuth();
  const { getRolePalette, isDark, toggleTheme } = useTheme();
  const palette = getRolePalette('MANAGER');

  const [soundOnTasks, setSoundOnTasks] = useState(true);

  // Opens the device gallery to pick a new profile picture (DP).
  const handleChangeDp = () => {
    pickProfilePictureFromGallery((uri) => {
      updateCurrentUser({ avatarKey: uri, avatarCustomUri: uri });
    });
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Sign out of Engineering Manager session?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <HeaderBar
        title="Manager View Profile & Workspace"
        subtitle="Engineering Management"
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
            <TouchableOpacity
              style={[styles.cameraBadge, { backgroundColor: palette.primary }]}
              onPress={handleChangeDp}
            >
              <Icon name="camera" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <Text style={[styles.userName, { color: palette.textPrimary }]}>{currentUser?.name}</Text>
          <View style={[styles.roleTag, { backgroundColor: palette.primary }]}>
            <Text style={styles.roleTagText}>Engineering Manager</Text>
          </View>
          <Text style={[styles.userEmail, { color: palette.textSecondary }]}>{currentUser?.email}</Text>
        </View>

        {/* Personal & Contact Details (Managed by Admin - STRICTLY READ-ONLY) */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
          <View style={styles.lockedHeaderRow}>
            <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>
              Personal &amp; Contact Details (Managed by Admin)
            </Text>
            <View style={styles.lockRow}>
              <Icon name="lock-closed" size={13} color="#64748B" />
              <Text style={styles.lockText}>🔒 Locked</Text>
            </View>
          </View>
          <Text style={[styles.cardSubtitle, { color: palette.textSecondary }]}>
            Contact Company Administrator to modify contract or department assignment.
          </Text>

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
            label="Mobile"
            value={currentUser?.phone || '—'}
            editable={false}
          />

          <AppInput
            label="Work Hours & Timezone"
            value={currentUser?.workHours || '—'}
            editable={false}
          />

          <AppInput
            label="Slack Handle"
            value={currentUser?.slackHandle || '—'}
            editable={false}
          />
        </View>

        {/* App Preferences */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>
            App Preferences
          </Text>

          <View style={styles.prefRow}>
            <View>
              <Text style={[styles.prefTitle, { color: palette.textPrimary }]}>Sound on Task Submissions</Text>
              <Text style={[styles.prefSub, { color: palette.textSecondary }]}>Auditory chime on milestone completion</Text>
            </View>
            <Switch
              value={soundOnTasks}
              onValueChange={setSoundOnTasks}
              trackColor={{ false: '#CBD5E1', true: '#BFDBFE' }}
              thumbColor={soundOnTasks ? '#1D4ED8' : '#94A3B8'}
            />
          </View>

          <View style={[styles.prefRow, { borderTopWidth: 1, borderTopColor: palette.divider, marginTop: 8 }]}>
            <View>
              <Text style={[styles.prefTitle, { color: palette.textPrimary }]}>Dark Mode (ThemeContext)</Text>
              <Text style={[styles.prefSub, { color: palette.textSecondary }]}>Toggle dark high-contrast mode</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#CBD5E1', true: '#BFDBFE' }}
              thumbColor={isDark ? '#1D4ED8' : '#94A3B8'}
            />
          </View>
        </View>

        {/* Logout */}
        <View style={styles.bottomActions}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Icon name="log-out" size={16} color="#DC2626" />
            <Text style={styles.logoutBtnText}>Sign Out of Manager Account</Text>
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

export default ManagerProfileScreen;
