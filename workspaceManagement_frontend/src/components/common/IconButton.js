import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Icon from './Icon';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';

// Reusable icon-only button (back / menu / eye / camera / minus / close ...).
// variant: plain | primary | soft | outline | dangerSoft | success
const getVariantStyles = (variant, palette) => {
  switch (variant) {
    case 'primary':
      return {
        container: { backgroundColor: palette.primary },
        iconColor: '#FFFFFF',
      };
    case 'soft':
      return {
        container: {
          backgroundColor: palette.inputBackground,
          borderWidth: 1,
          borderColor: palette.cardBorder,
        },
        iconColor: palette.textPrimary,
      };
    case 'outline':
      return {
        container: {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: palette.cardBorder,
        },
        iconColor: palette.textPrimary,
      };
    case 'dangerSoft':
      return {
        container: { backgroundColor: '#FEE2E2' },
        iconColor: '#DC2626',
      };
    case 'success':
      return {
        container: { backgroundColor: '#16A34A' },
        iconColor: '#FFFFFF',
      };
    case 'plain':
    default:
      return {
        container: { backgroundColor: 'transparent' },
        iconColor: palette.textPrimary,
      };
  }
};

const IconButton = ({
  icon,
  onPress,
  size = 20,
  buttonSize = 40,
  borderRadius,
  variant = 'plain',
  color,
  style,
  disabled = false,
  activeOpacity = 0.7,
  accessibilityLabel,
  hitSlop,
  palette: paletteOverride,
  ...rest
}) => {
  const { currentUser } = useAuth();
  const { getRolePalette } = useTheme();
  const palette = paletteOverride || getRolePalette(currentUser?.role || 'EMPLOYEE');
  const variantStyles = getVariantStyles(variant, palette);
  const iconColor = color || variantStyles.iconColor;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        {
          width: buttonSize,
          height: buttonSize,
          borderRadius: borderRadius !== undefined ? borderRadius : buttonSize / 2,
        },
        variantStyles.container,
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={activeOpacity}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      hitSlop={hitSlop}
      {...rest}
    >
      <Icon name={icon} size={size} color={iconColor} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});

export default IconButton;
