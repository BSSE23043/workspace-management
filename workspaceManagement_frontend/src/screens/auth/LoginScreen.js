import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { IMAGES } from '../../assets/images';
import AppInput from '../../components/common/AppInput';
import Icon from '../../components/common/Icon';
import { isValidEmail, isValidPassword } from '../../utils/validation';

export const LoginScreen = () => {
  const { login } = useAuth();
  const { isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Syllabus requirement: useRef focus chaining
  const passwordInputRef = useRef(null);

  // Intro animation (runs once on first mount) — uses Animated.timing,
  // Animated.spring, Animated.parallel, Animated.sequence
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const brandOpacity = useRef(new Animated.Value(0)).current;
  const brandTranslateY = useRef(new Animated.Value(18)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(32)).current;
  const infoOpacity = useRef(new Animated.Value(0)).current;
  const infoTranslateY = useRef(new Animated.Value(24)).current;
  const introAnimRef = useRef(null);

  useEffect(() => {
    const logoAnim = Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 6,
        tension: 90,
        useNativeDriver: true,
      }),
    ]);

    const brandAnim = Animated.parallel([
      Animated.timing(brandOpacity, {
        toValue: 1,
        duration: 380,
        useNativeDriver: true,
      }),
      Animated.timing(brandTranslateY, {
        toValue: 0,
        duration: 380,
        useNativeDriver: true,
      }),
    ]);

    const formAnim = Animated.parallel([
      Animated.timing(formOpacity, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
      Animated.timing(formTranslateY, {
        toValue: 0,
        duration: 420,
        useNativeDriver: true,
      }),
    ]);

    const infoAnim = Animated.parallel([
      Animated.timing(infoOpacity, {
        toValue: 1,
        duration: 380,
        useNativeDriver: true,
      }),
      Animated.timing(infoTranslateY, {
        toValue: 0,
        duration: 380,
        useNativeDriver: true,
      }),
    ]);

    introAnimRef.current = Animated.sequence([
      logoAnim,
      brandAnim,
      formAnim,
      infoAnim,
    ]);
    introAnimRef.current.start();

    return () => {
      if (introAnimRef.current) {
        introAnimRef.current.stop();
      }
    };
  }, []);

  // Pure validation check for inline error banner
  const passwordHasError = password.length > 0 && !isValidPassword(password);

  const handleSignIn = async () => {
    setErrorMessage('');

    if (!isValidEmail(email)) {
      setErrorMessage('Please enter a valid work email address');
      return;
    }
    if (!isValidPassword(password)) {
      setErrorMessage('! Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (!res.success) {
      setErrorMessage(res.error);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Password Recovery',
      'For account password recovery, please contact your Company Administrator.',
      [{ text: 'OK' }]
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, isDark && styles.containerDark]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand Header */}
        <Animated.View
          style={[
            styles.brandHeader,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <View style={styles.logoBadge}>
            <Image source={IMAGES.appLogo} style={styles.logoImage} resizeMode="contain" />
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.brandTextBlock,
            {
              opacity: brandOpacity,
              transform: [{ translateY: brandTranslateY }],
            },
          ]}
        >
          <Text style={[styles.brandTitle, isDark && styles.textWhite]}>
            Workforce Management System
          </Text>
          <Text style={[styles.brandSubtitle, isDark && styles.textMuted]}>
            Multi-Company Workforce Administration Platform
          </Text>
          <View style={styles.telemetryPill}>
            <View style={styles.telemetryDot} />
            <Text style={styles.telemetryText}>Secure Enterprise Session</Text>
          </View>
        </Animated.View>

        {/* Login Form Card */}
        <Animated.View
          style={[
            styles.formCard,
            isDark && styles.formCardDark,
            {
              opacity: formOpacity,
              transform: [{ translateY: formTranslateY }],
            },
          ]}
        >
          <Text style={[styles.cardTitle, isDark && styles.textWhite]}>Sign In to Workspace</Text>
          <Text style={[styles.cardDesc, isDark && styles.textMuted]}>
            Enter your enterprise credentials to access your portal
          </Text>

          {Boolean(errorMessage) && (
            <View style={styles.globalErrorBanner}>
              <Icon name="alert-circle" size={16} color="#DC2626" />
              <Text style={styles.globalErrorText}>{errorMessage}</Text>
            </View>
          )}

          <AppInput
            label="Work Email Address"
            value={email}
            onChangeText={(txt) => {
              setEmail(txt);
              if (errorMessage) setErrorMessage('');
            }}
            placeholder="e.g. admin@yourcompany.com"
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="next"
            onSubmitEditing={() => passwordInputRef.current?.focus()}
          />

          <AppInput
            ref={passwordInputRef}
            label="Account Password"
            value={password}
            onChangeText={(txt) => {
              setPassword(txt);
              if (errorMessage) setErrorMessage('');
            }}
            placeholder="Enter your password"
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleSignIn}
            error={passwordHasError ? '! Password must be at least 6 characters' : null}
          />

          {/* Options Row */}
          <View style={styles.optionsRow}>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setRememberDevice(!rememberDevice)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, rememberDevice && styles.checkboxActive]}>
                {rememberDevice && <Icon name="checkmark" size={12} color="#FFFFFF" />}
              </View>
              <Text style={[styles.checkboxLabel, isDark && styles.textMuted]}>
                Remember this device
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          {/* Sign In Button */}
          <TouchableOpacity
            style={[styles.signInBtn, loading && styles.signInBtnDisabled]}
            onPress={handleSignIn}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <View style={styles.btnContent}>
                <Text style={styles.signInBtnText}>Sign In</Text>
                <Icon name="chevron-forward" size={18} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* No Self Sign-Up Card — Accounts are issued by the WMS platform team.
            (The old "Create Admin / User Account" registration flow was removed.
             The Super Admin now creates Company Admin accounts from the
             Super Admin portal.) */}
        <Animated.View
          style={[
            styles.registerCard,
            isDark && styles.registerCardDark,
            {
              opacity: infoOpacity,
              transform: [{ translateY: infoTranslateY }],
            },
          ]}
        >
          <View style={styles.infoIconBadge}>
            <Icon name="shield-checkmark" size={20} color="#1E293B" />
          </View>
          <Text style={[styles.registerCardTitle, isDark && styles.textWhite]}>
            Accounts Are Issued, Not Self-Registered
          </Text>
          <Text style={[styles.registerCardDesc, isDark && styles.textMuted]}>
            WMS accounts are created by your company{'\u2019'}s Administrator.{'\n'}
            New companies are onboarded by our Super Admin, who provisions the
            Company Admin login. Contact{' '}
            <Text style={styles.infoEmailText}>superadmin@wms.com</Text> to
            register your company.
          </Text>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  containerDark: {
    backgroundColor: '#0B0F17',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 36,
    paddingBottom: 40,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  brandTextBlock: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  logoImage: {
    width: 36,
    height: 36,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  telemetryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  telemetryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  telemetryText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  formCardDark: {
    backgroundColor: '#151D2A',
    borderColor: '#334155',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 18,
  },
  globalErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
    gap: 8,
  },
  globalErrorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 18,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#1E293B',
    borderColor: '#1E293B',
  },
  checkboxLabel: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  forgotPasswordText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '600',
  },
  signInBtn: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInBtnDisabled: {
    opacity: 0.7,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  signInBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 22,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerLineDark: {
    backgroundColor: '#334155',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  registerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 18,
    alignItems: 'center',
    elevation: 2,
  },
  registerCardDark: {
    backgroundColor: '#151D2A',
    borderColor: '#334155',
  },
  registerCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  registerCardDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 4,
    lineHeight: 18,
  },
  // Small circular badge with a shield icon above the info card title
  infoIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  // Highlighted email address inside the info card description
  infoEmailText: {
    color: '#2563EB',
    fontWeight: '700',
  },
  textWhite: {
    color: '#F8FAFC',
  },
  textMuted: {
    color: '#94A3B8',
  },
});

export default LoginScreen;
