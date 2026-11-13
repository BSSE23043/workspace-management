import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import Icon from './Icon';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';

// Reusable filled / outline / text action button.
// variant: primary | secondary | outline | danger | dangerSoft | success |
//          ghost | dark | soft | field
// size:    xs | sm | md | lg
const SIZE_STYLES = {
  xs: {
    container: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4 },
    text: { fontSize: 11 },
  },
  sm: {
    container: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 6 },
    text: { fontSize: 12 },
  },
  md: {
    container: { paddingVertical: 11, paddingHorizontal: 16, borderRadius: 8 },
    text: { fontSize: 13 },
  },
  lg: {
    container: { paddingVertical: 13, paddingHorizontal: 18, borderRadius: 10 },
    text: { fontSize: 14 },
  },
};

const getVariantStyles = (variant, palette) => {
  switch (variant) {
    case 'secondary':
      return {
        container: {
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: palette.primary,
        },
        text: { color: palette.primary },
      };
    case 'outline':
      return {
        container: {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: palette.cardBorder,
        },
        text: { color: palette.textPrimary },
      };
    case 'danger':
      return {
        container: {
          backgroundColor: '#DC2626',
          borderWidth: 0,
          borderColor: '#DC2626',
        },
        text: { color: '#FFFFFF' },
      };
    case 'dangerSoft':
      return {
        container: {
          backgroundColor: '#FEE2E2',
          borderWidth: 1,
          borderColor: '#FCA5A5',
        },
        text: { color: '#DC2626' },
      };
    case 'success':
      return {
        container: {
          backgroundColor: '#16A34A',
          borderWidth: 0,
          borderColor: '#16A34A',
        },
        text: { color: '#FFFFFF' },
      };
    case 'ghost':
      return {
        container: { backgroundColor: 'transparent', borderWidth: 0 },
        text: { color: palette.primary },
      };
    case 'dark':
      return {
        container: { backgroundColor: '#1E293B', borderWidth: 0 },
        text: { color: '#FFFFFF' },
      };
    case 'soft':
      return {
        container: {
          backgroundColor: palette.inputBackground,
          borderWidth: 1,
          borderColor: palette.cardBorder,
        },
        text: { color: palette.textPrimary },
      };
    case 'field':
      return {
        container: {
          backgroundColor: palette.inputBackground,
          borderWidth: 1,
          borderColor: palette.inputBorder,
          justifyContent: 'space-between',
        },
        text: { color: palette.textPrimary },
      };
    case 'primary':
    default:
      return {
        container: {
          backgroundColor: palette.primary,
          borderWidth: 0,
          borderColor: palette.primary,
        },
        text: { color: '#FFFFFF' },
      };
  }
};

const AppButton = ({
  title,
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  iconSize,
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
  activeOpacity = 0.85,
  accessibilityLabel,
  hitSlop,
  palette: paletteOverride,
  ...rest
}) => {
  const { currentUser } = useAuth();
  const { getRolePalette } = useTheme();
  const palette = paletteOverride || getRolePalette(currentUser?.role || 'EMPLOYEE');
  const variantStyles = getVariantStyles(variant, palette);
  const sizeStyles = SIZE_STYLES[size] || SIZE_STYLES.md;
  const isDisabled = disabled || loading;
  const resolvedIconSize =
    iconSize || (size === 'xs' ? 12 : size === 'sm' ? 14 : 16);
  const textColor = variantStyles.text.color;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        sizeStyles.container,
        variantStyles.container,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={activeOpacity}
      accessibilityRole="button"
      accessibilityLabel={
        accessibilityLabel || (typeof title === 'string' ? title : undefined)
      }
      accessibilityState={{ disabled: isDisabled }}
      hitSlop={hitSlop}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={textColor}
          style={styles.spinner}
        />
      ) : null}

      {!loading && icon && iconPosition === 'left' ? (
        <Icon name={icon} size={resolvedIconSize} color={textColor} />
      ) : null}

      {!loading &&
        (children ||
          (title ? (
            <Text
              style={[
                styles.text,
                sizeStyles.text,
                variantStyles.text,
                textStyle,
              ]}
            >
              {title}
            </Text>
          ) : null))}

      {!loading && icon && iconPosition === 'right' ? (
        <Icon name={icon} size={resolvedIconSize} color={textColor} />
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    fontWeight: '700',
    textAlign: 'center',
  },
  spinner: {
    marginRight: 4,
  },
});

export default AppButton;
