import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';

// Reusable inline text / link button (forgot password, open ticket, ...).
const TextButton = ({
  title,
  children,
  onPress,
  color,
  style,
  textStyle,
  disabled = false,
  activeOpacity = 0.7,
  accessibilityLabel,
  palette: paletteOverride,
  ...rest
}) => {
  const { currentUser } = useAuth();
  const { getRolePalette } = useTheme();
  const palette = paletteOverride || getRolePalette(currentUser?.role || 'EMPLOYEE');

  return (
    <TouchableOpacity
      style={[styles.base, disabled && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={activeOpacity}
      accessibilityRole="button"
      accessibilityLabel={
        accessibilityLabel || (typeof title === 'string' ? title : undefined)
      }
      accessibilityState={{ disabled }}
      {...rest}
    >
      {children || (
        <Text style={[styles.text, { color: color || palette.primary }, textStyle]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
});

export default TextButton;
