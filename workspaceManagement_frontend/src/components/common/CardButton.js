import React from 'react';
import { TouchableOpacity } from 'react-native';

// Reusable tappable card / list-row wrapper.
// It keeps the screen's own card styling but centralizes the button behaviour
// (pressed opacity, accessibility role, disabled state).
const CardButton = ({
  children,
  onPress,
  style,
  activeOpacity = 0.8,
  disabled = false,
  accessibilityLabel,
  ...rest
}) => (
  <TouchableOpacity
    style={style}
    onPress={onPress}
    activeOpacity={activeOpacity}
    disabled={disabled}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    accessibilityState={{ disabled }}
    {...rest}
  >
    {children}
  </TouchableOpacity>
);

export default CardButton;
