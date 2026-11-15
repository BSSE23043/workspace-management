// ============================================================================
// Super Admin Dashboard Screen
// ----------------------------------------------------------------------------
// Landing screen of the Super Admin portal. Shows a platform overview and
// simple statistics (number of Company Admin accounts, number of registered
// companies) fetched from the backend. Company Admin accounts live in MySQL
// (users + companies) and can be managed on the "Company Admins" tab next to
// this screen.
// ============================================================================
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { fetchPlatformStats } from '../../services/api';
import HeaderBar from '../../components/common/HeaderBar';
import Icon from '../../components/common/Icon';
import CardButton from '../../components/common/CardButton';

// Syllabus requirement: Dimensions API for responsive layouts
const SCREEN_WIDTH = Dimensions.get('window').width;

export const SuperAdminDashboardScreen = ({ navigation }) => {
  const { currentUser } = useAuth();
  const { getRolePalette } = useTheme();
  const palette = getRolePalette('SUPER_ADMIN');

  // Local state: platform statistics loaded from the MySQL backend
  const [adminCount, setAdminCount] = useState(0);
  const [companyCount, setCompanyCount] = useState(0);

  // Load statistics from the backend database on mount and whenever focused
  useEffect(() => {
    let isMounted = true;

    const loadStats = async () => {
      try {
        const stats = await fetchPlatformStats();
        if (isMounted) {
          setAdminCount(Number(stats.adminCount || 0));
          setCompanyCount(Number(stats.companyCount || 0));
        }
      } catch (err) {
        console.warn('[SuperAdminDashboard] Failed loading stats:', err);
      }
    };

    loadStats();
    const unsubscribe = navigation.addListener('focus', loadStats);
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [navigation]);

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <HeaderBar
        title="Platform Overview"
        subtitle="Super Admin Portal"
        navigation={navigation}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Card */}
        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.cardBorder }]}>
          <View style={[styles.welcomeIconBox, { backgroundColor: palette.primary }]}>
            <Icon name="shield-checkmark" size={26} color="#FFFFFF" />
          </View>
          <Text style={[styles.welcomeTitle, { color: palette.textPrimary }]}>
            Welcome, {currentUser?.name}
          </Text>
          <Text style={[styles.welcomeDesc, { color: palette.textSecondary }]}>
            You manage the WMS platform itself. Companies register with us,
            and you provision a Company Admin account for each of them. Company
            Admins then manage their own HR, Managers, Employees and Clients
            inside their own portal.
          </Text>
        </View>

        {/* Statistics Grid (2x2 responsive layout, same style as other dashboards) */}
        <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>
          Platform Snapshot
        </Text>
        <View style={styles.statsRow}>
          <View
            style={[
              styles.statCard,
              { width: (SCREEN_WIDTH - 52) / 2, backgroundColor: palette.surface, borderColor: palette.cardBorder },
            ]}
          >
            <Text style={[styles.statValue, { color: palette.primary }]}>{adminCount}</Text>
            <Text style={[styles.statLabel, { color: palette.textSecondary }]}>
              Company Admins
            </Text>
          </View>
          <View
            style={[
              styles.statCard,
              { width: (SCREEN_WIDTH - 52) / 2, backgroundColor: palette.surface, borderColor: palette.cardBorder },
            ]}
          >
            <Text style={[styles.statValue, { color: palette.primary }]}>{companyCount}</Text>
            <Text style={[styles.statLabel, { color: palette.textSecondary }]}>
              Registered Companies
            </Text>
          </View>
        </View>

        {/* How Onboarding Works — simple step-by-step card */}
        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>
            How Company Onboarding Works
          </Text>

          <View style={styles.stepRow}>
            <View style={[styles.stepBadge, { backgroundColor: palette.primary }]}>
              <Text style={styles.stepBadgeText}>1</Text>
            </View>
            <Text style={[styles.stepText, { color: palette.textSecondary }]}>
              A company contacts us to subscribe to WMS.
            </Text>
          </View>

          <View style={styles.stepRow}>
            <View style={[styles.stepBadge, { backgroundColor: palette.primary }]}>
              <Text style={styles.stepBadgeText}>2</Text>
            </View>
            <Text style={[styles.stepText, { color: palette.textSecondary }]}>
              You create a Company Admin account (email + password) from the
              "Company Admins" tab.
            </Text>
          </View>

          <View style={styles.stepRow}>
            <View style={[styles.stepBadge, { backgroundColor: palette.primary }]}>
              <Text style={styles.stepBadgeText}>3</Text>
            </View>
            <Text style={[styles.stepText, { color: palette.textSecondary }]}>
              That Admin logs in and manages their own employees, attendance,
              payroll, tasks and clients.
            </Text>
          </View>
        </View>

        {/* Quick Action Card — jumps to the Company Admins tab */}
        <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>
          Administrative Modules
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <CardButton
            style={[styles.moduleCard, { backgroundColor: palette.surface, borderColor: palette.cardBorder }]}
            onPress={() => navigation.navigate('Company Admins')}
            activeOpacity={0.8}
          >
            <View style={[styles.moduleIconBox, { backgroundColor: palette.light }]}>
              <Icon name="people" size={22} color={palette.primary} />
            </View>
            <Text style={[styles.moduleTitle, { color: palette.textPrimary }]}>
              Company Admins
            </Text>
            <Text style={[styles.moduleDesc, { color: palette.textSecondary }]}>
              Add or remove Company Admin accounts
            </Text>
          </CardButton>
        </ScrollView>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  welcomeIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  welcomeDesc: {
    fontSize: 12.5,
    lineHeight: 19,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 12,
  },
  statCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  stepBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  stepText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
  },
  moduleCard: {
    width: 200,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    elevation: 2,
  },
  moduleIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  moduleTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  moduleDesc: {
    fontSize: 11.5,
    marginTop: 4,
    lineHeight: 16,
  },
});

export default SuperAdminDashboardScreen;
