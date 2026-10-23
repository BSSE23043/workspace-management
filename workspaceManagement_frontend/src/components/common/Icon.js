import React from 'react';
import { Text, View, StyleSheet } from 'react-native';

// Clean unicode and symbol glyphs for 100% offline and cross-platform compatibility
// No dependency on native fonts or expo-font
const GLYPH_MAP = {
  // Navigation & Actions
  'menu': '☰',
  'arrow-back': '←',
  'chevron-forward': '›',
  'chevron-down': '▼',
  'chevron-up': '▲',
  'close': '✕',
  'close-circle': '⊗',
  'checkmark': '✓',
  'checkmark-circle': '✓',
  'checkmark-done': '✓✓',
  'add': '+',
  'add-circle': '⊕',
  'trash': '🗑',
  'search': '🔍',
  'refresh': '↻',

  // Work & Dashboard
  'grid': '⊞',
  'briefcase': '💼',
  'business': '🏢',
  'location': '📍',
  'map': '🗺',
  'calendar': '📅',
  'time': '🕒',

  // Security & Users
  'shield-checkmark': '🛡',
  'lock-closed': '🔒',
  'eye': '👁',
  'eye-off': '👁‍🗨',
  'person': '👤',
  'people': '👥',

  // Money & Payroll
  'cash': '💵',
  'wallet': '👛',

  // Tickets, Tasks & Alerts
  'ticket': '🎫',
  'chatbubble-ellipses': '💬',
  'alert-triangle': '⚠️',
  'alert-circle': '⚠️',
  'flag': '🚩',
  'camera': '📷',
  'log-out': '⎋',
  'settings': '⚙',
  'document-text': '📄',
};

export const Icon = ({ name, size = 18, color = '#1E293B', style }) => {
  const glyph = GLYPH_MAP[name] || '•';

  return (
    <View style={[styles.container, { width: size + 4, height: size + 4 }, style]}>
      <Text
        style={[
          styles.glyph,
          {
            fontSize: size * 0.9,
            color,
      
          },
        ]}
      >
        {glyph}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  glyph: {
    textAlign: 'center',
  },
});

export default Icon;
