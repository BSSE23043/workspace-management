import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import HeaderBar from '../../components/common/HeaderBar';
import Icon from '../../components/common/Icon';
import storageService, { STORAGE_KEYS } from '../../services/storageService';
import { PUNCH_DUTY_ROLES, isWeekday } from '../../utils/attendanceStats';

export const HRDashboardScreen = ({ navigation }) => {
  const { getRolePalette } = useTheme();
  const palette = getRolePalette('HR');
  const { currentUser } = useAuth();

  const { tickets } = useSelector((state) => state.tickets);
  const { logs } = useSelector((state) => state.attendance);
  const { leaves } = useSelector((state) => state.leaves);
  const salaryConfig = useSelector((state) => state.salary.companyWide);

  // User roster for today's expected headcount (absence derivation)
  const [users, setUsers] = useState([]);
  useEffect(() => {
    (async () => {
      const storedUsers = await storageService.getItem(STORAGE_KEYS.USERS, []);
      setUsers(storedUsers);
    })();
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];
  const monthLabel = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  // Staff-only KPIs — the logged-in HR's own punches/leaves are never counted
  const todaysLogs = logs.filter((l) => l.date === todayStr && l.userId !== currentUser?.id);
  const presentUserIds = new Set(
    todaysLogs
      .filter((l) => l.status === 'PRESENT' || l.status === 'CORRECTED_PRESENT')
      .map((l) => l.userId)
  );
  const checkedInCount = presentUserIds.size;
  const approvedLeaveCount = leaves.filter(
    (l) =>
      l.userId !== currentUser?.id &&
      l.status === 'APPROVED' &&
      l.startDate &&
      l.endDate &&
      l.startDate <= todayStr &&
      l.endDate >= todayStr
  ).length;
  // Unexcused = on punch duty today, no check-in, not on approved leave
  const unexcusedCount = isWeekday(todayStr)
    ? users.filter(
        (u) =>
          u.isActive !== false &&
          PUNCH_DUTY_ROLES.includes(u.role) &&
          u.id !== currentUser?.id &&
          !presentUserIds.has(u.id) &&
          !leaves.some(
            (l) =>
              l.userId === u.id &&
              l.status === 'APPROVED' &&
              l.startDate <= todayStr &&
              l.endDate >= todayStr
          )
      ).length
    : 0;
  const openTickets = tickets.filter((t) => t.status === 'OPEN').length;
  const pendingOverrides = tickets.filter(
    (t) =>
      t.category === 'Attendance Correction' &&
      (t.status === 'OPEN' || t.status === 'IN_PROGRESS')
  ).length;
  const recentTickets = tickets.slice(0, 4);

  const pad = (n) => String(n).padStart(2, '0');

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <HeaderBar
        title="HR Operations & Payroll Dashboard"
        subtitle="Human Resources"
        navigation={navigation}
        statusText="CYCLE ACTIVE"
        statusColor="#0F766E"
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View style={[styles.cycleBanner, { backgroundColor: palette.primary }]}>
          <View style={styles.bannerRow}>
            <Icon name="calendar" size={16} color="#FFFFFF" />
            <Text style={styles.bannerTitle}>PAYROLL CYCLE: {monthLabel}</Text>
          </View>
          <Text style={styles.bannerSub}>
            {salaryConfig.workingDaysPerPeriod} working days this month
          </Text>
        </View>

        {/* Today's Attendance 2x2 KPI Grid */}
        <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>
          Today&apos;s Attendance Overview
        </Text>
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
            <Text style={[styles.kpiValue, { color: '#0F766E' }]}>{pad(checkedInCount)}</Text>
            <Text style={[styles.kpiLabel, { color: palette.textSecondary }]}>Checked-In</Text>
          </View>
          <View style={[styles.kpiCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
            <Text style={[styles.kpiValue, { color: '#DC2626' }]}>{pad(unexcusedCount)}</Text>
            <Text style={[styles.kpiLabel, { color: palette.textSecondary }]}>Absents</Text>
          </View>
          <View style={[styles.kpiCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
            <Text style={[styles.kpiValue, { color: '#2563EB' }]}>{pad(approvedLeaveCount)}</Text>
            <Text style={[styles.kpiLabel, { color: palette.textSecondary }]}>Approved Leave</Text>
          </View>
          <View style={[styles.kpiCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
            <Text style={[styles.kpiValue, { color: '#D97706' }]}>{pad(pendingOverrides)}</Text>
            <Text style={[styles.kpiLabel, { color: palette.textSecondary }]}>Corrections</Text>
          </View>
        </View>

        {/* HR Support Tickets Card */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <Icon name="ticket" size={18} color={palette.primary} />
              <Text style={[styles.cardHeading, { color: palette.textPrimary }]}>HR Support Tickets</Text>
            </View>
            <View style={[styles.badgePill, { backgroundColor: palette.badge }]}>
              <Text style={[styles.badgePillText, { color: palette.text }]}>{openTickets} Open</Text>
            </View>
          </View>

          <Text style={[styles.cardBodyText, { color: palette.textSecondary }]}>
            {openTickets} Active Inquiries • {pendingOverrides} Attendance Overrides Pending
          </Text>

          <TouchableOpacity
            style={[styles.actionBtnOutline, { borderColor: palette.primary }]}
            onPress={() => navigation.navigate('Tickets')}
          >
            <Text style={[styles.actionBtnOutlineText, { color: palette.primary }]}>
              Review Ticket Queue →
            </Text>
          </TouchableOpacity>
        </View>

        {/* Cycle Deductions Card */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <Icon name="cash" size={18} color={palette.primary} />
              <Text style={[styles.cardHeading, { color: palette.textPrimary }]}>Cycle Deductions Policy</Text>
            </View>
            <View style={[styles.badgePill, { backgroundColor: '#DCFCE7' }]}>
              <Text style={[styles.badgePillText, { color: '#16A34A' }]}>Active Rule</Text>
            </View>
          </View>

          <View style={styles.policyRow}>
            <Text style={[styles.policyLabel, { color: palette.textSecondary }]}>Billable Work Days:</Text>
            <Text style={[styles.policyVal, { color: palette.textPrimary }]}>
              {salaryConfig.workingDaysPerPeriod} Days / Mo
            </Text>
          </View>
          <View style={styles.policyRow}>
            <Text style={[styles.policyLabel, { color: palette.textSecondary }]}>Absent Deduction:</Text>
            <Text style={[styles.policyVal, { color: palette.textPrimary }]}>
              {Number(salaryConfig.deductionPerAbsentDay).toLocaleString()} PKR / d
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.primaryActionBtn, { backgroundColor: palette.primary }]}
            onPress={() => navigation.navigate('SalaryConfig')}
          >
            <Text style={styles.primaryActionBtnText}>Configure Deduction Policies &gt;</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Ticket Activity */}
        <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>
          Recent Ticket Activity
        </Text>
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
          {recentTickets.length === 0 ? (
            <Text style={[styles.feedSub, { color: palette.textSecondary }]}>
              No ticket activity yet — new employee tickets will appear here.
            </Text>
          ) : (
            recentTickets.map((t, idx) => (
              <React.Fragment key={t.id}>
                {idx > 0 && <View style={styles.feedDivider} />}
                <View style={styles.feedItem}>
                  <View
                    style={[
                      styles.feedDot,
                      {
                        backgroundColor:
                          t.status === 'RESOLVED'
                            ? '#10B981'
                            : t.status === 'IN_PROGRESS'
                            ? '#2563EB'
                            : '#D97706',
                      },
                    ]}
                  />
                  <View style={styles.feedContent}>
                    <Text style={[styles.feedTitle, { color: palette.textPrimary }]} numberOfLines={1}>
                      #{t.id} • {t.subject}
                    </Text>
                    <Text style={styles.feedSub}>
                      {t.userName} • {t.status}
                    </Text>
                  </View>
                </View>
              </React.Fragment>
            ))
          )}
        </View>
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
    paddingBottom: 36,
  },
  cycleBanner: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  bannerSub: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    marginLeft: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    marginBottom: 18,
  },
  kpiCard: {
    width: '48%',
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  kpiLabel: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardHeading: {
    fontSize: 15,
    fontWeight: '700',
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardBodyText: {
    fontSize: 13,
    marginBottom: 14,
  },
  actionBtnOutline: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionBtnOutlineText: {
    fontSize: 13,
    fontWeight: '700',
  },
  policyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  policyLabel: {
    fontSize: 12,
  },
  policyVal: {
    fontSize: 12,
    fontWeight: '700',
  },
  primaryActionBtn: {
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 10,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  feedItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  feedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  feedContent: {
    flex: 1,
  },
  feedTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  feedSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  feedDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 10,
    marginLeft: 18,
  },
});

export default HRDashboardScreen;
