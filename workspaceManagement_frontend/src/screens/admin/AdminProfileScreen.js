import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Switch,
  Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import HeaderBar from '../../components/common/HeaderBar';
import AppInput from '../../components/common/AppInput';
import AppButton from '../../components/common/AppButton';
import IconButton from '../../components/common/IconButton';
import { getAvatarSource } from '../../assets/images';
import { pickProfilePictureFromGallery } from '../../utils/imagePicker';

export const AdminProfileScreen = ({ navigation }) => {
  const { currentUser, updateCurrentUser, logout } = useAuth();
  const { getRolePalette, isDark, toggleTheme } = useTheme();
  const palette = getRolePalette('ADMIN');

  const [name, setName] = useState(currentUser?.name || '');
  const [title, setTitle] = useState(currentUser?.title || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [location, setLocation] = useState(currentUser?.location || '');

  // Opens the device gallery to pick a new profile picture (DP).
  const handleChangeDp = () => {
    pickProfilePictureFromGallery((uri) => {
      updateCurrentUser({ avatarKey: uri, avatarCustomUri: uri });
    });
  };

  const handleSaveProfile = async () => {
    const res = await updateCurrentUser({
      name,
      title,
      phone,
      location,
    });
    if (res.success) {
      Alert.alert('Profile Saved', 'Administrator profile details updated.');
    } else {
      Alert.alert('Error', res.error || 'Failed to update profile.');
    }
  };

  const handleLogout = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out of Admin session?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <HeaderBar
        title="Admin Profile & Account Settings"
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
            <IconButton
              icon="camera"
              size={14}
              buttonSize={26}
              borderRadius={13}
              variant="primary"
              style={styles.cameraBadge}
              onPress={handleChangeDp}
              accessibilityLabel="Change profile picture"
            />
          </View>

          <Text style={[styles.userName, { color: palette.textPrimary }]}>{currentUser?.name}</Text>
          <View style={[styles.roleTag, { backgroundColor: palette.primary }]}>
            <Text style={styles.roleTagText}>Company Administrator (Full Access)</Text>
          </View>
          <Text style={[styles.userEmail, { color: palette.textSecondary }]}>{currentUser?.email}</Text>
        </View>

        {/* Editable Profile Information Form */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>
            Editable Profile Fields (Admin Only)
          </Text>
          <Text style={[styles.cardSubtitle, { color: palette.textSecondary }]}>
            As Company Administrator, you hold full permission to edit personal details
          </Text>

          <AppInput
            label="Full Name"
            value={name}
            onChangeText={setName}
            editable={true}
          />

          <AppInput
            label="Job Title & Role Designation"
            value={title}
            onChangeText={setTitle}
            editable={true}
          />

          <AppInput
            label="Direct Mobile / Phone"
            value={phone}
            onChangeText={setPhone}
            editable={true}
            keyboardType="phone-pad"
          />

          <AppInput
            label="Assigned Location / Floor"
            value={location}
            onChangeText={setLocation}
            editable={true}
          />

          <AppButton
            title="Save Profile Changes"
            variant="primary"
            size="lg"
            fullWidth
            style={{ marginTop: 4 }}
            onPress={handleSaveProfile}
          />
        </View>

        {/* Security & System Preferences */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>
            Security & System Preferences
          </Text>

          <View style={styles.prefRow}>
            <View>
              <Text style={[styles.prefTitle, { color: palette.textPrimary }]}>Dark Mode</Text>
              <Text style={[styles.prefSub, { color: palette.textSecondary }]}>
                Toggle high-contrast dark theme
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#CBD5E1', true: '#64748B' }}
              thumbColor={isDark ? '#1E293B' : '#F1F5F9'}
            />
          </View>
        </View>

        {/* Sign Out Button */}
        <AppButton
          title="Sign Out of Admin Session"
          variant="dangerSoft"
          size="lg"
          icon="log-out"
          fullWidth
          onPress={handleLogout}
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
  avatarCard: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 20,
    marginBottom: 18,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 10,
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
    marginBottom: 14,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 18,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 11,
    marginTop: 2,
    marginBottom: 14,
  },
  prefRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  prefTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  prefSub: {
    fontSize: 11,
    marginTop: 2,
  },
});

export default AdminProfileScreen;
