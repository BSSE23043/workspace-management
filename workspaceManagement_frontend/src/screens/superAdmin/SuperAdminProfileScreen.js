// ============================================================================
// Super Admin Profile Screen
// ----------------------------------------------------------------------------
// Read-only profile of the hardcoded Super Admin account. The Super Admin
// details cannot be edited from the app (they live in superAdminConfig.js).
// Includes a dark-mode switch (theme hook backed by Redux) and the logout button,
// matching the style of the other role profile screens.
// ============================================================================
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Image, Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { getAvatarSource } from '../../assets/images';
import { ROLE_THEMES } from '../../utils/permissions';
import HeaderBar from '../../components/common/HeaderBar';
import Icon from '../../components/common/Icon';

export const SuperAdminProfileScreen = ({ navigation }) => {
  const { currentUser, logout } = useAuth();
  const { isDark, toggleTheme, getRolePalette } = useTheme();
  const palette = getRolePalette('SUPER_ADMIN');

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out of the Super Admin portal?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <HeaderBar
        title="Platform Owner Profile"
        subtitle="Super Admin Portal"
        navigation={navigation}
        showBack
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar + Name Card */}
        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.cardBorder }]}>
          <View style={[styles.avatarRing, { borderColor: palette.primary }]}>
            <Image
              source={getAvatarSource(currentUser?.avatarKey)}
              style={styles.avatarImage}
              resizeMode="cover"
            />
          </View>
          <Text style={[styles.profileName, { color: palette.textPrimary }]}>
            {currentUser?.name}
          </Text>
          <View style={[styles.roleBadge, { backgroundColor: palette.badge }]}>
            <Text style={[styles.roleBadgeText, { color: palette.text }]}>
              {ROLE_THEMES.SUPER_ADMIN.roleLabel}
            </Text>
          </View>
        </View>

        {/* Read-Only Account Details */}
        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>
            Platform Account Details
          </Text>

          {/* Each row is a locked, read-only field (managed in code) */}
          <View style={[styles.detailRow, { borderBottomColor: palette.divider }]}>
            <Text style={[styles.detailLabel, { color: palette.textSecondary }]}>Full Name</Text>
            <Text style={[styles.detailValue, { color: palette.textPrimary }]}>
              {currentUser?.name}
            </Text>
            <Icon name="lock-closed" size={14} color={palette.textMuted} />
          </View>

          <View style={[styles.detailRow, { borderBottomColor: palette.divider }]}>
            <Text style={[styles.detailLabel, { color: palette.textSecondary }]}>Email</Text>
            <Text style={[styles.detailValueLocked, { color: palette.textPrimary }]}>
              {currentUser?.email}
            </Text>
            <Icon name="lock-closed" size={14} color={palette.textMuted} />
          </View>

          <View style={[styles.detailRow, { borderBottomColor: palette.divider }]}>
            <Text style={[styles.detailLabel, { color: palette.textSecondary }]}>Role</Text>
            <Text style={[styles.detailValueLocked, { color: palette.textPrimary }]}>
              Super Admin (Platform Owner)
            </Text>
            <Icon name="lock-closed" size={14} color={palette.textMuted} />
          </View>

          <View style={styles.lockedNote}>
            <Icon name="lock-closed" size={13} color={palette.textMuted} />
            <Text style={[styles.lockedNoteText, { color: palette.textMuted }]}>
              Super Admin credentials are hardcoded in the app and cannot be
              edited from this screen.
            </Text>
          </View>
        </View>

        {/* Preferences Card */}
        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>Preferences</Text>

          <View style={styles.switchRow}>
            <Text style={[styles.switchLabel, { color: palette.textPrimary }]}>
              Dark Mode
            </Text>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ true: palette.primary, false: '#CBD5E1' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <Icon name="log-out" size={16} color="#DC2626" />
          <Text style={styles.logoutBtnText}>Log Out of Platform</Text>
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
    paddingBottom: 32,
  },
  card: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    marginBottom: 14,
    elevation: 2,
  },
  avatarRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    overflow: 'hidden',
    alignSelf: 'center',
    marginBottom: 12,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  profileName: {
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
  },
  roleBadge: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  roleBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    gap: 8,
  },
  detailLabel: {
    width: 90,
    fontSize: 12,
    fontWeight: '600',
  },
  detailValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  detailValueLocked: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '600',
  },
  lockedNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  lockedNoteText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    paddingVertical: 13,
  },
  logoutBtnText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default SuperAdminProfileScreen;
