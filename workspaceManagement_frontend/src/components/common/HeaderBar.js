import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  onBackPress,
  rightAction,
  onProfilePress,
  statusText = 'ONLINE',
  statusColor = '#10B981',
  showStatus = true,
  isEmbedded = false,
}) => {
  if (isEmbedded) {
    return null;
  }

  const insets = useSafeAreaInsets();
  const { currentUser } = useAuth();
  const { getRolePalette } = useTheme();
  const role = currentUser?.role || 'EMPLOYEE';
  const palette = getRolePalette(role);
  const isAdmin = role === 'ADMIN';

  const handleAvatarPress = () => {
    if (onProfilePress) {
      onProfilePress();
    } else if (navigation) {
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

  // Syllabus Requirement: Status pill constructed via React.createElement
  const statusPill = React.createElement(
    View,
    {
      style: [
        styles.statusPill,
        {
          borderColor: statusColor,
          backgroundColor: statusColor + '20',
        },
      ],
    },
    React.createElement(
      View,
      {
        style: [styles.statusDot, { backgroundColor: statusColor }],
      }
    ),
    React.createElement(
      Text,
      {
        style: [styles.statusText, { color: statusColor }],
      },
      statusText
    )
  );

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: palette.surface,
          borderBottomColor: palette.cardBorder,
          paddingTop: Math.max(insets.top, 12),
          height: 60 + Math.max(insets.top, 12),
          borderTopWidth: 3,
          borderTopColor: palette.primary,
        },
      ]}
    >
      <View style={styles.leftRow}>
        {showBack ? (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onBackPress || (() => navigation && navigation.goBack())}
            accessibilityRole="button"
            accessibilityLabel="Go Back"
          >
            <Icon name="arrow-back" size={24} color={palette.textPrimary} />
          </TouchableOpacity>
        ) : isAdmin ? (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => {
              if (navigation) {
                if (typeof navigation.openDrawer === 'function') {
                  navigation.openDrawer();
                } else if (typeof navigation.dispatch === 'function') {
                  navigation.dispatch(DrawerActions.openDrawer());
                }
              }
            }}
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
              {Boolean(subtitle) && (
                <Text style={[styles.subtitle, { color: palette.primary }]}>{subtitle}</Text>
              )}
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
            {/* Render the React.createElement syllabus status pill only on main screens */}
            {showStatus && statusPill}
            <TouchableOpacity
              style={[styles.avatarButton, { borderColor: palette.primary }]}
              onPress={handleAvatarPress}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="View Profile"
            >
              <Image
                source={getAvatarSource(currentUser?.avatarKey || currentUser?.avatarCustomUri)}
                style={styles.avatarImage}
              />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
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
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
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
