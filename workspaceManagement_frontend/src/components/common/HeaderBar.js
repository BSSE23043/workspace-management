import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DrawerActions } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { getAvatarSource, IMAGES } from '../../assets/images';
import Icon from './Icon';

export const HeaderBar = ({
  title,
  subtitle,
  navigation,
  showBack = false,
  rightAction,
  isEmbedded = false,
}) => {
  if (isEmbedded) {
    return null;
  }

  const { currentUser } = useAuth();
  const { getRolePalette } = useTheme();
  const role = currentUser?.role || 'EMPLOYEE';
  const palette = getRolePalette(role);
  const isAdmin = role === 'ADMIN';

  const handleAvatarPress = () => {
    if (navigation) {
      if (role === 'SUPER_ADMIN') {
        navigation.navigate('SuperAdminProfile');
      } else if (isAdmin) {
        navigation.navigate('AdminProfile');
      } else if (role === 'HR') {
        navigation.navigate('HRProfile');
      } else if (role === 'MANAGER') {
        navigation.navigate('ManagerProfile');
      } else if (role === 'CLIENT') {
        navigation.navigate('ClientProfile');
      } else {
        navigation.navigate('EmployeeProfile');
      }
    }
  };

  return (
    <SafeAreaView
      edges={['top']}
      style={[
        styles.container,
        {
          backgroundColor: palette.surface,
          borderBottomColor: palette.cardBorder,
          borderTopWidth: 3,
          borderTopColor: palette.primary,
        },
      ]}
    >
      <View style={styles.leftRow}>
        {showBack ? (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation && navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go Back"
          >
            <Icon name="arrow-back" size={24} color={palette.textPrimary} />
          </TouchableOpacity>
        ) : isAdmin ? (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation && navigation.dispatch(DrawerActions.openDrawer())}
            accessibilityRole="button"
            accessibilityLabel="Open Navigation Drawer"
          >
            <Icon name="menu" size={24} color={palette.textPrimary} />
          </TouchableOpacity>
        ) : null}

        <View style={styles.titleContainer}>
          {isAdmin ? (
            <View style={styles.adminTitleRow}>
              <View style={[styles.brandIconBox, { backgroundColor: palette.primary }]}>
                <Image source={IMAGES.appLogo} style={styles.brandLogo} resizeMode="contain" />
              </View>
              <View>
                <Text style={[styles.adminHeaderBrand, { color: palette.textPrimary }]}>WMS ADMIN</Text>
                <Text style={[styles.adminHeaderSub, { color: palette.textSecondary }]}>
                  {title || 'Dashboard'}
                </Text>
              </View>
            </View>
          ) : (
            <View>
              {subtitle ? (
                <Text style={[styles.subtitle, { color: palette.primary }]}>{subtitle}</Text>
              ) : null}
              <Text style={[styles.title, { color: palette.textPrimary }]} numberOfLines={1}>
                {title || 'Workforce Portal'}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.rightRow}>
        {rightAction ? (
          rightAction
        ) : showBack ? null : (
          <>
            <TouchableOpacity
              style={[styles.avatarButton, { borderColor: palette.primary }]}
              onPress={handleAvatarPress}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="View Profile"
            >
              {/* <Image
                source={getAvatarSource(currentUser?.avatarKey || currentUser?.avatarCustomUri)}
                style={styles.avatarImage}
              /> */}
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  adminTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  brandLogo: {
    width: 20,
    height: 20,
  },
  adminHeaderBrand: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  adminHeaderSub: {
    fontSize: 12,
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
});

export default HeaderBar;
