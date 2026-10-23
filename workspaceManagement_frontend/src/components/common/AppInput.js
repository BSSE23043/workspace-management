import React, { useState, forwardRef } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import Icon from './Icon';

export const AppInput = forwardRef(
  (
    {
      label,
      value,
      onChangeText,
      placeholder,
      secureTextEntry = false,
      editable = true,
      error,
      keyboardType = 'default',
      multiline = false,
      numberOfLines = 1,
      helperText,
      ...props
    },
    ref
  ) => {
    const { isDark } = useTheme();
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    const isSecure = secureTextEntry && !isPasswordVisible;

    return (
      <View style={styles.container}>
        {Boolean(label) && (
          <View style={styles.labelRow}>
            <Text style={[styles.label, isDark && styles.labelDark]}>{label}</Text>
            {!editable && (
              <View style={styles.lockedBadge}>
                <Icon name="lock-closed" size={13} color="#64748B" />
                <Text style={styles.lockedText}>Locked (Admin Managed)</Text>
              </View>
            )}
          </View>
        )}

        <View
          style={[
            styles.inputWrapper,
            isDark ? styles.inputWrapperDark : styles.inputWrapperLight,
            !editable && (isDark ? styles.disabledDark : styles.disabledLight),
            Boolean(error) && styles.inputErrorBorder,
          ]}
        >
          <TextInput
            ref={ref}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
            secureTextEntry={isSecure}
            editable={editable}
            keyboardType={keyboardType}
            multiline={multiline}
            numberOfLines={numberOfLines}
            style={[
              styles.textInput,
              isDark ? styles.textInputDark : styles.textInputLight,
              !editable && styles.disabledText,
              multiline && styles.multilineInput,
            ]}
            {...props}
          />

          {!editable ? (
            <View style={styles.iconContainer}>
              <Icon name="lock-closed" size={16} color="#94A3B8" />
            </View>
          ) : secureTextEntry ? (
            <TouchableOpacity
              onPress={() => setIsPasswordVisible(!isPasswordVisible)}
              style={styles.iconButton}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Toggle Password Visibility"
            >
              <Icon
                name={isPasswordVisible ? 'eye-off' : 'eye'}
                size={18}
                color={isDark ? '#94A3B8' : '#64748B'}
              />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Syllabus Requirement: Pure validation inline && error banner */}
        {Boolean(error) && (
          <Text style={styles.errorText}>
            ! {error.startsWith('! ') ? error.slice(2) : error}
          </Text>
        )}

        {Boolean(helperText && !error) && (
          <Text style={[styles.helperText, isDark && styles.helperTextDark]}>
            {helperText}
          </Text>
        )}
      </View>
    );
  }
);

AppInput.displayName = 'AppInput';

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  labelDark: {
    color: '#E2E8F0',
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lockedText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  inputWrapperLight: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
  },
  inputWrapperDark: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
  },
  disabledLight: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  disabledDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  inputErrorBorder: {
    borderColor: '#EF4444',
  },
  textInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
  },
  textInputLight: {
    color: '#0F172A',
  },
  textInputDark: {
    color: '#F8FAFC',
  },
  disabledText: {
    color: '#64748B',
  },
  multilineInput: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  iconButton: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    padding: 6,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    marginLeft: 2,
  },
  helperText: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 3,
    marginLeft: 2,
  },
  helperTextDark: {
    color: '#94A3B8',
  },
});

export default AppInput;
