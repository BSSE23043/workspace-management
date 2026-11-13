import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import Icon from './Icon';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';

// Reusable selectable chip / pill / tab / segment button.
// variant: chip | pill | tab | segment | day
const SHAPE_STYLES = {
  chip: {
    container: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
    },
    text: { fontSize: 12 },
  },
  pill: {
    container: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
      borderWidth: 1,
    },
    text: { fontSize: 12 },
  },
  tab: {
    container: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 14,
      borderWidth: 1,
    },
    text: { fontSize: 12 },
  },
  segment: {
    container: {
      flex: 1,
      paddingVertical: 9,
      borderRadius: 8,
      borderWidth: 0,
      alignItems: 'center',
    },
    text: { fontSize: 13 },
  },
  day: {
    container: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
    },
    text: { fontSize: 12 },
  },
};

const ChipButton = ({
  label,
  children,
  onPress,
  selected = false,
  variant = 'chip',
  icon,
  iconSize = 14,
  activeColor,
  selectedTextColor = '#FFFFFF',
  selectedStyle,
  unselectedStyle,
  style,
  textStyle,
  disabled = false,
  activeOpacity = 0.8,
  accessibilityLabel,
  palette: paletteOverride,
  ...rest
}) => {
  const { currentUser } = useAuth();
  const { getRolePalette } = useTheme();
  const palette = paletteOverride || getRolePalette(currentUser?.role || 'EMPLOYEE');
  const shape = SHAPE_STYLES[variant] || SHAPE_STYLES.chip;
  const accent = activeColor || palette.primary;
  const backgroundColor = selected
    ? accent
    : variant === 'segment'
      ? 'transparent'
      : palette.card;
  const borderColor = selected
    ? accent
    : variant === 'segment'
      ? 'transparent'
      : palette.cardBorder;
  const textColor = selected ? selectedTextColor : palette.textSecondary;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        shape.container,
        { backgroundColor, borderColor },
        selected ? selectedStyle : unselectedStyle,
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={activeOpacity}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={
        accessibilityLabel || (typeof label === 'string' ? label : undefined)
      }
      {...rest}
    >
      {icon ? <Icon name={icon} size={iconSize} color={textColor} /> : null}
      {children ||
        (label ? (
          <Text style={[styles.text, shape.text, { color: textColor }, textStyle]}>
            {label}
          </Text>
        ) : null)}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  text: {
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
});

export default ChipButton;
