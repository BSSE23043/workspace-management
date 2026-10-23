import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../context/AuthContext';
import storageService, { STORAGE_KEYS } from '../../services/storageService';
import { loadCompanyProfile } from '../../services/companyService';
import HeaderBar from '../../components/common/HeaderBar';
import Icon from '../../components/common/Icon';

const { width } = Dimensions.get('window');

export const AdminDashboardScreen = ({ navigation }) => {
  const { getRolePalette, isDark } = useTheme();
  const { currentUser } = useAuth();
  const palette = getRolePalette('ADMIN');

  // Company profile lives in AsyncStorage now (it was removed from Redux) —
  // it is loaded below on mount + focus, exactly like the user list.
  const [company, setCompany] = useState({});

  // The real user list lives in AsyncStorage (users this admin has added +
  // company admins created by the Super Admin).
  // If the logged-in admin has a companyId (created by the Super Admin),
  // we only count users of that company — so a freshly created admin
  // starts with zero demo users from other companies.
  const [users, setUsers] = useState([]);

  const loadUsersFromStorage = async () => {
    const storedUsers = await storageService.getItem(STORAGE_KEYS.USERS, []);
    const scopedUsers = currentUser?.companyId
      ? storedUsers.filter((u) => u.companyId === currentUser.companyId)
      : storedUsers;
    setUsers(scopedUsers);
  };

  const loadCompanyFromStorage = async () => {
    setCompany(await loadCompanyProfile());
  };

  // Load once when the screen mounts, and reload every time this screen
  // gains focus again (e.g. after coming back from the Employee Form
  // screen where a new user was added, or from Company Profile after a save).
  useEffect(() => {
    const loadDashboardData = () => {
      loadUsersFromStorage();
      loadCompanyFromStorage();
    };
    loadDashboardData();
    const unsubscribe = navigation.addListener('focus', loadDashboardData);
    // Clean up the focus listener when the screen unmounts
    return unsubscribe;
  }, []);

  // Compute live workforce snapshot counts with useMemo
  const snapshot = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.isActive !== false).length;
    const deactivated = total - active;
    return { total, active, deactivated };
  }, [users]);

  const shortcuts = [
    {
      id: 'co_prof',
      title: 'Company Profile & Geofence Policy',
      subtitle: 'Perimeter coordinates, 200m radius & shift rules',
      icon: 'business',
      color: '#1E293B',
      target: 'CompanyProfile',
    },
    {
      id: 'emp_dir',
      title: 'Employee Directory & Role Filter',
      subtitle: 'SectionList • Role filters, active toggles & edit user',
      icon: 'people',
      color: '#1D4ED8',
      target: 'EmployeeDirectory',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <HeaderBar
        title="Admin Executive Dashboard"
        navigation={navigation}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Organization Card — shown only after the admin has set up their
            company profile. Until then, a setup prompt is displayed instead
            (conditional rendering with && / ternary). */}
        {company.name ? (
          <View style={[styles.orgCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
            <View style={styles.orgHeaderRow}>
              <View style={styles.flexOne}>
                <Text style={[styles.orgName, { color: palette.textPrimary }]}>{company.name}</Text>
                {Boolean(company.enterpriseId) && (
                  <Text style={[styles.orgId, { color: palette.textSecondary }]}>
                    Enterprise ID: {company.enterpriseId}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.orgDetailsRow}>
              {Boolean(company.mainCampus) && (
                <View style={styles.orgDetailItem}>
                  <Icon name="location" size={15} color="#1E293B" />
                  <Text style={[styles.orgDetailText, { color: palette.textPrimary }]}>
                    {company.mainCampus}
                  </Text>
                </View>
              )}
              <View style={styles.orgDetailItem}>
                <Icon name="calendar" size={15} color="#6366F1" />
                <Text style={[styles.orgDetailText, { color: palette.textPrimary }]}>
                  Shift Days: {company.workingDays.join('-')}
                </Text>
              </View>
            </View>

            <View style={[styles.telemetryFooter, { borderTopColor: palette.divider }]}>
              <Icon name="refresh" size={13} color="#64748B" />
              <Text style={styles.telemetryFooterText}>
                Geofence Center: Lat {company.latitude}, Lon {company.longitude}
              </Text>
            </View>
          </View>
        ) : (
          /* Setup prompt shown to a fresh Company Admin who hasn't
             configured their company yet */
          <View style={[styles.orgCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
            <View style={styles.setupIconBox}>
              <Icon name="business" size={26} color="#1E293B" />
            </View>
            <Text style={[styles.setupTitle, { color: palette.textPrimary }]}>
              Set Up Your Company Profile
            </Text>
            <Text style={[styles.setupDesc, { color: palette.textSecondary }]}>
              Your company details are not configured yet. Open the Company
              Profile module to enter your company name, campus location,
              geofence perimeter and payroll policy.
            </Text>
            <TouchableOpacity
              style={styles.setupBtn}
              onPress={() => navigation.navigate('CompanyProfile')}
              activeOpacity={0.85}
            >
              <Icon name="business" size={16} color="#FFFFFF" />
              <Text style={styles.setupBtnText}>Configure Company Profile</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Workforce Snapshot 2x2 Grid (Dimensions API) */}
        <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>
          Workforce Snapshot
        </Text>
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
            <View style={styles.kpiIconWrap}>
              <Icon name="people" size={18} color="#1E293B" />
            </View>
            <Text style={[styles.kpiValue, { color: palette.textPrimary }]}>{snapshot.total}</Text>
            <Text style={[styles.kpiLabel, { color: palette.textSecondary }]}>Total Headcount</Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
            <View style={[styles.kpiIconWrap, { backgroundColor: '#DCFCE7' }]}>
              <Icon name="checkmark-circle" size={18} color="#16A34A" />
            </View>
            <Text style={[styles.kpiValue, { color: '#16A34A' }]}>{snapshot.active}</Text>
            <Text style={[styles.kpiLabel, { color: palette.textSecondary }]}>Active Users</Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
            <View style={[styles.kpiIconWrap, { backgroundColor: '#FEE2E2' }]}>
              <Icon name="close-circle" size={18} color="#DC2626" />
            </View>
            <Text style={[styles.kpiValue, { color: '#DC2626' }]}>{snapshot.deactivated}</Text>
            <Text style={[styles.kpiLabel, { color: palette.textSecondary }]}>Deactivated</Text>
          </View>
        </View>

        {/* Administrative Modules & Shortcuts */}
        <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>
          Administrative Modules & Shortcuts
        </Text>
        <View style={styles.shortcutsList}>
          {shortcuts.map((sc) => (
            <TouchableOpacity
              key={sc.id}
              style={[styles.shortcutCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}
              onPress={() => navigation.navigate(sc.target)}
              activeOpacity={0.75}
            >
              <View style={[styles.shortcutIconBox, { backgroundColor: sc.color }]}>
                <Icon name={sc.icon} size={20} color="#FFFFFF" />
              </View>
              <View style={styles.shortcutContent}>
                <Text style={[styles.shortcutTitle, { color: palette.textPrimary }]}>
                  {sc.title}
                </Text>
                <Text style={[styles.shortcutSubtitle, { color: palette.textSecondary }]}>
                  {sc.subtitle}
                </Text>
              </View>
              <Icon name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>
          ))}
        </View>
        {/* NOTE: The "Recent Administrative Activity" section was removed on
            purpose — it showed hardcoded demo activity entries and is not
            needed for real company usage. */}
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
  orgCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  orgHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orgName: {
    fontSize: 18,
    fontWeight: '800',
  },
  orgId: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  orgDetailsRow: {
    gap: 8,
    marginBottom: 12,
  },
  orgDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orgDetailText: {
    fontSize: 13,
    fontWeight: '500',
  },
  telemetryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 10,
    gap: 6,
  },
  telemetryFooterText: {
    fontSize: 11,
    color: '#64748B',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    marginBottom: 22,
  },
  kpiCard: {
    width: '48%',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    elevation: 1,
  },
  kpiIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  shortcutsList: {
    gap: 10,
    marginBottom: 22,
  },
  shortcutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    elevation: 1,
  },
  shortcutIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  shortcutContent: {
    flex: 1,
  },
  shortcutTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  shortcutSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  flexOne: {
    flex: 1,
  },
  /* Styles for the "Set Up Your Company Profile" prompt card */
  setupIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  setupTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  setupDesc: {
    fontSize: 12.5,
    lineHeight: 19,
    marginTop: 6,
    marginBottom: 14,
  },
  setupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E293B',
    borderRadius: 10,
    paddingVertical: 12,
  },
  setupBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
});

export default AdminDashboardScreen;
