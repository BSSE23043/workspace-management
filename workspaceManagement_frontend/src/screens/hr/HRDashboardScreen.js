import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import HeaderBar from '../../components/common/HeaderBar';
import Icon from '../../components/common/Icon';
import storageService, { STORAGE_KEYS } from '../../services/storageService';
import { loadTickets } from '../../services/ticketService';
import { loadLeaves, approveLeave, rejectLeave } from '../../services/leaveService';
import { loadAttendance } from '../../services/attendanceService';
import { loadSalaryConfig } from '../../services/salaryService';
import { PUNCH_DUTY_ROLES, isWeekday } from '../../utils/attendanceStats';

export const HRDashboardScreen = ({ navigation }) => {
  const { getRolePalette } = useTheme();
  const palette = getRolePalette('HR');
  const { currentUser } = useAuth();

  // Tickets, leaves, punch logs & the salary policy live in AsyncStorage —
  // load on demand (mount + focus) so the KPIs, leave requests card, policy
  // card and recent activity always match the stored state.
  const [tickets, setTickets] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [logs, setLogs] = useState([]);
  const [salaryConfig, setSalaryConfig] = useState({});
  useEffect(() => {
    const load = async () => {
      setTickets(await loadTickets());
      setLeaves(await loadLeaves());
      setLogs(await loadAttendance());
      const storedSalary = await loadSalaryConfig();
      setSalaryConfig(storedSalary.companyWide);
    };
    load();
    const unsubscribe = navigation.addListener('focus', load);
    return () => unsubscribe();
  }, [navigation]);

  // User roster for today's expected headcount (absence derivation)
  const [users, setUsers] = useState([]);
  useEffect(() => {
    (async () => {
      const storedUsers = await storageService.getItem(STORAGE_KEYS.USERS, []);
      setUsers(storedUsers);
    })();
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];

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
  // Employee leave requests raised from the Employee app (HR's own excluded).
  // Pending first so HR can action them, then already-decided ones below.
  const employeeLeaves = leaves.filter((l) => l.userId !== currentUser?.id);
  const sortedEmployeeLeaves = [
    ...employeeLeaves.filter((l) => l.status === 'PENDING'),
    ...employeeLeaves.filter((l) => l.status !== 'PENDING'),
  ];
  const pendingLeaveCount = employeeLeaves.filter((l) => l.status === 'PENDING').length;
  // Attendance corrections actually applied today (HR-corrected punch records)
  const correctionsToday = todaysLogs.filter(
    (l) => l.status === 'CORRECTED_PRESENT' || l.statusCategory === 'HR CORRECTED RECORDS'
  ).length;
  const recentTickets = tickets.slice(0, 4);

  // HR decides on an employee leave request — same approve/reject logic the
  // old Redux actions had, now saved to AsyncStorage and reflected locally.
  const handleHrApprove = async (leave) => {
    const next = await approveLeave({ leaveId: leave.id, comment: 'Approved by HR' });
    setLeaves(next);
    Alert.alert('Leave Approved', `${leave.userName}'s leave request approved.`);
  };

  const handleHrReject = async (leave) => {
    const next = await rejectLeave({ leaveId: leave.id, comment: 'Rejected by HR' });
    setLeaves(next);
    Alert.alert('Leave Rejected', `${leave.userName}'s leave request rejected.`);
  };

  const pad = (n) => String(n).padStart(2, '0');

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <HeaderBar
        title="HR Dashboard"
        subtitle="Human Resources"
        navigation={navigation}
        showStatus={false}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
            <Text style={[styles.kpiValue, { color: '#D97706' }]}>{pad(correctionsToday)}</Text>
            <Text style={[styles.kpiLabel, { color: palette.textSecondary }]}>Corrections</Text>
          </View>
        </View>

        {/* Employee Leave Requests Card */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <Icon name="calendar" size={18} color={palette.primary} />
              <Text style={[styles.cardHeading, { color: palette.textPrimary }]}>
                Employee Leave Requests
              </Text>
            </View>
            <View
              style={[
                styles.badgePill,
                { backgroundColor: pendingLeaveCount > 0 ? '#FEF3C7' : palette.badge },
              ]}
            >
              <Text
                style={[
                  styles.badgePillText,
                  { color: pendingLeaveCount > 0 ? '#B45309' : palette.text },
                ]}
              >
                {pendingLeaveCount} Pending
              </Text>
            </View>
          </View>

          {sortedEmployeeLeaves.length === 0 ? (
            <Text style={[styles.cardBodyText, { color: palette.textSecondary }]}>
              No leave requests received from employees yet.
            </Text>
          ) : (
            sortedEmployeeLeaves.map((leave, idx) => (
              <React.Fragment key={leave.id}>
                {idx > 0 && <View style={[styles.feedDivider, { backgroundColor: palette.divider }]} />}
                <View style={styles.leaveRow}>
                  <View style={styles.leaveInfo}>
                    <Text style={[styles.leaveName, { color: palette.textPrimary }]}>
                      {leave.userName}
                    </Text>
                    <Text style={[styles.leaveMeta, { color: palette.textSecondary }]}>
                      {leave.type} • {leave.startDate} → {leave.endDate} ({leave.daysCount}d)
                    </Text>
                  </View>

                  {leave.status === 'PENDING' ? (
                    <View style={styles.leaveActions}>
                      <TouchableOpacity
                        style={[styles.leaveApproveBtn, { backgroundColor: '#16A34A' }]}
                        onPress={() => handleHrApprove(leave)}
                      >
                        <Text style={styles.leaveBtnText}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.leaveRejectBtn}
                        onPress={() => handleHrReject(leave)}
                      >
                        <Text style={styles.leaveRejectText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View
                      style={[
                        styles.leaveStatusPill,
                        { backgroundColor: leave.status === 'APPROVED' ? '#DCFCE7' : '#FEE2E2' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.leaveStatusText,
                          { color: leave.status === 'APPROVED' ? '#16A34A' : '#DC2626' },
                        ]}
                      >
                        {leave.status}
                      </Text>
                    </View>
                  )}
                </View>
              </React.Fragment>
            ))
          )}
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
            {openTickets} Active Inquiries • {correctionsToday} Attendance Corrections Today
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
  leaveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  leaveInfo: {
    flex: 1,
  },
  leaveName: {
    fontSize: 13,
    fontWeight: '700',
  },
  leaveMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  leaveActions: {
    flexDirection: 'row',
    gap: 6,
  },
  leaveApproveBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  leaveBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  leaveRejectBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  leaveRejectText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '700',
  },
  leaveStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  leaveStatusText: {
    fontSize: 10,
    fontWeight: '800',
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
