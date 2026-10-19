import React from 'react';
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
import AuthContext from '../../context/AuthContext';
import storageService, { STORAGE_KEYS } from '../../services/storageService';
import HeaderBar from '../../components/common/HeaderBar';
import AppInput from '../../components/common/AppInput';
import Icon from '../../components/common/Icon';
import { getAvatarSource } from '../../assets/images';
import { pickProfilePictureFromGallery } from '../../utils/imagePicker';

// Syllabus Requirement: ES6 Class Component with constructor, this.state, this.setState
export class ProfileSettingsScreen extends React.Component {
  // Class components read the logged-in user from AuthContext via contextType
  // (the user list itself lives in AsyncStorage, not Redux).
  static contextType = AuthContext;

  constructor(props) {
    super(props);
    // Only real app state lives here. Every demo value that used to be hardcoded
    // (Zafar Ahmed / Zafar Corp / a fake phone / "Enterprise Partner" tier) has
    // been removed: the client's own details now come from the account the
    // Company Admin provisioned, and the organization name comes from the
    // Company Profile the admin saved (loaded below from AsyncStorage).
    this.state = {
      isDarkMode: false,
      orgName: '',
    };
  }

  componentDidMount() {
    this.loadCompanyProfile();
  }

  // Reads the organization name the Company Admin typed on the Admin "Company
  // Profile" screen (persisted as @wms_company). It stays empty until the admin
  // configures it, and the screen shows "—" in that case.
  loadCompanyProfile = async () => {
    const company = await storageService.getItem(STORAGE_KEYS.COMPANY, {});
    this.setState({ orgName: company?.name || '' });
  };

  handleToggleDarkMode = () => {
    this.setState((prevState) => ({
      isDarkMode: !prevState.isDarkMode,
    }));
  };

  // Opens the device gallery to pick a new profile picture (DP).
  handleChangeDp = () => {
    pickProfilePictureFromGallery((uri) => {
      const { currentUser, updateCurrentUser } = this.context;
      if (currentUser?.id) {
        // Persists the new DP to the session + the stored users list
        updateCurrentUser({ avatarKey: uri, avatarCustomUri: uri });
      }
    });
  };

  handleSignOut = () => {
    const { orgName } = this.state;
    Alert.alert('Sign Out', `Sign out of ${orgName || 'the partner portal'}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          if (this.props.onLogout) {
            this.props.onLogout();
          }
        },
      },
    ]);
  };

  render() {
    const { navigation } = this.props;
    const { currentUser } = this.context;
    const { isDarkMode, orgName } = this.state;

    return (
      <View style={styles.container}>
        <HeaderBar
          title="Client Profile & Settings"
          subtitle="Class Component"
          showBack
          navigation={navigation}
        />

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Top Read-Only Banner */}
          <View style={styles.readOnlyBanner}>
            <Icon name="lock-closed" size={16} color="#92400E" />
            <Text style={styles.readOnlyBannerText}>
              🔒 Read-Only Client Profile: Contact Company Administrator to update organization details.
            </Text>
          </View>

          {/* Top Avatar Card with active camera/upload badge for Client DP */}
          <View style={styles.avatarCard}>
            <View style={styles.avatarWrap}>
              <Image
                source={getAvatarSource(currentUser?.avatarKey || currentUser?.avatarCustomUri)}
                style={styles.avatarImg}
              />
              <TouchableOpacity
                style={styles.cameraBadge}
                onPress={this.handleChangeDp}
              >
                <Icon name="camera" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.userName}>{currentUser?.name || '—'}</Text>
            {/* The fake "Enterprise Partner" tier tag was removed: the system
                has no tier field for a client account. */}
            <Text style={styles.userOrg}>{orgName || '—'}</Text>
          </View>

          {/* Locked Read-Only Client Details */}
          <View style={styles.card}>
            <View style={styles.lockedHeaderRow}>
              <Text style={styles.cardTitle}>Client &amp; Organization Details</Text>
              <View style={styles.lockedRow}>
                <Icon name="lock-closed" size={12} color="#64748B" />
                <Text style={styles.lockedNotice}>Read-Only</Text>
              </View>
            </View>

            <AppInput
              label="Organization Name"
              value={orgName || '—'}
              editable={false}
            />

            <AppInput
              label="Client Representative"
              value={currentUser?.name || '—'}
              editable={false}
            />

            <AppInput
              label="Work Email"
              value={currentUser?.email || '—'}
              editable={false}
            />

            <AppInput
              label="Phone Contact"
              value={currentUser?.phone || '—'}
              editable={false}
            />
          </View>

          {/* Appearance Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Appearance &amp; Theme</Text>
            <View style={styles.prefRow}>
              <View>
                <Text style={styles.prefTitle}>Dark Mode Theme (ThemeContext)</Text>
                <Text style={styles.prefSub}>Class component state toggle</Text>
              </View>
              <Switch
                value={isDarkMode}
                onValueChange={this.handleToggleDarkMode}
                trackColor={{ false: '#CBD5E1', true: '#FDE68A' }}
                thumbColor={isDarkMode ? '#92400E' : '#94A3B8'}
              />
            </View>
          </View>

          {/* Sign Out Button */}
          <TouchableOpacity style={styles.signOutBtn} onPress={this.handleSignOut}>
            <Icon name="log-out" size={16} color="#DC2626" />
            <Text style={styles.signOutBtnText}>Sign Out of Account</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  readOnlyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  readOnlyBannerText: {
    color: '#92400E',
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
    lineHeight: 16,
  },
  avatarCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    backgroundColor: '#92400E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  userOrg: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 16,
  },
  lockedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  lockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lockedNotice: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
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
    color: '#0F172A',
  },
  prefSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  signOutBtn: {
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
  signOutBtnText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
  },
});

export default ProfileSettingsScreen;
