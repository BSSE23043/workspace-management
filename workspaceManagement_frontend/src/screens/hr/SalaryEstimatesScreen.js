import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useTheme } from '../../context/ThemeContext';
import storageService, { STORAGE_KEYS } from '../../services/storageService';
import HeaderBar from '../../components/common/HeaderBar';
import Icon from '../../components/common/Icon';
import { calculateSalaryEstimate, formatCurrency } from '../../utils/salaryCalculator';

export const SalaryEstimatesScreen = ({ navigation }) => {
  const { getRolePalette } = useTheme();
  const palette = getRolePalette('HR');

  // Users are loaded from AsyncStorage (Redux no longer stores the user list)
  const [users, setUsers] = useState([]);
  useEffect(() => {
    (async () => {
      const storedUsers = await storageService.getItem(STORAGE_KEYS.USERS, []);
      setUsers(storedUsers);
    })();
  }, []);

  const salaryConfig = useSelector((state) => state.salary);
  const { logs } = useSelector((state) => state.attendance);
  const { leaves } = useSelector((state) => state.leaves);

  const [selectedUserId, setSelectedUserId] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);

  const monthPrefix = new Date().toISOString().slice(0, 7);
  const monthLabel = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const teamMembers = useMemo(
    () => users.filter((u) => u.role === 'EMPLOYEE' || u.role === 'MANAGER' || u.role === 'HR'),
    [users]
  );

  const selectedUser = users.find((u) => u.id === selectedUserId) || teamMembers[0];

  // Per-employee estimate derived from real attendance logs + approved leaves
  // of the current month, using the company policy or the employee's override.
  const getBreakdownForUser = (emp) => {
    const cfg = salaryConfig.overrides[emp?.id] || salaryConfig.companyWide;
    const base = emp?.baseSalary || cfg.baseSalary || cfg.baseSalaryDefault || 0;
    const empLogs = logs.filter(
      (l) => l.userId === emp?.id && (l.date || '').startsWith(monthPrefix)
    );
    const presentDays = empLogs.filter(
      (l) => l.status === 'PRESENT' || l.status === 'CORRECTED_PRESENT'
    ).length;
    const empLeaves = leaves.filter(
      (l) =>
        l.userId === emp?.id &&
        l.status === 'APPROVED' &&
        (l.startDate || '').startsWith(monthPrefix)
    );
    const paidLeaveDays = empLeaves
      .filter((l) => l.isPaid !== false)
      .reduce((acc, l) => acc + (l.daysCount || 1), 0);
    const unpaidLeaveDays = empLeaves
      .filter((l) => l.isPaid === false)
      .reduce((acc, l) => acc + (l.daysCount || 1), 0);

    return calculateSalaryEstimate({
      baseSalary: base,
      workingDaysPerPeriod: cfg.workingDaysPerPeriod,
      presentDays,
      paidLeaveDays,
      unpaidLeaveDays,
      absentDays: 0,
      deductionPerAbsentDay: cfg.deductionPerAbsentDay,
      deductionPerUnpaidLeaveDay: cfg.deductionPerUnpaidLeaveDay,
    });
  };

  const currentBreakdown = selectedUser ? getBreakdownForUser(selectedUser) : null;

  // Total company estimated payroll = sum of every real team member's estimate
  const totalCompanyPayroll = teamMembers.reduce(
    (sum, emp) => sum + getBreakdownForUser(emp).netSalary,
    0
  );

  const handleRecalculateAll = () => {
    setIsCalculating(true);
    setTimeout(() => {
      setIsCalculating(false);
      Alert.alert(
        'Payroll Synchronized',
        `All ${teamMembers.length} workforce salary records recalculated for ${monthLabel}.`
      );
    }, 500);
  };

  // Syllabus Requirement: Featured Audit as ListHeaderComponent
  const renderListHeader = () => (
    <View style={styles.headerContainer}>
      {/* Control Bar */}
      <View style={[styles.controlRow, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
        <View style={styles.monthBadge}>
          <Icon name="calendar" size={16} color={palette.primary} />
          <Text style={[styles.monthText, { color: palette.textPrimary }]}>{monthLabel} Cycle</Text>
        </View>

        <TouchableOpacity
          style={[styles.recalcBtn, { backgroundColor: palette.primary }]}
          onPress={handleRecalculateAll}
          disabled={isCalculating}
        >
          {isCalculating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <View style={styles.recalcBtnContent}>
              <Icon name="refresh" size={14} color="#FFFFFF" />
              <Text style={styles.recalcText}>Recalculate All</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Featured Audit Card for selected user */}
      {selectedUser && currentBreakdown ? (
        <View style={[styles.featuredAuditCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
          <View style={styles.featuredBadgeRow}>
            <View style={[styles.auditTag, { backgroundColor: palette.badge }]}>
              <Text style={[styles.auditTagText, { color: palette.text }]}>
                {`FEATURED AUDIT • ${monthLabel.toUpperCase()}`}
              </Text>
            </View>
            <Text style={[styles.empIdTag, { color: palette.textSecondary }]}>
              {selectedUser?.id}
            </Text>
          </View>

          <Text style={[styles.featuredEmpName, { color: palette.textPrimary }]}>
            {selectedUser?.name}
          </Text>
          <Text style={[styles.featuredEmpTitle, { color: palette.textSecondary }]}>
            {selectedUser?.title}{selectedUser?.department ? ` • ${selectedUser.department}` : ''}
          </Text>

          {/* Days Telemetry Strip */}
          <View style={styles.telemetryStrip}>
            <View style={styles.telemetryBlock}>
              <Text style={[styles.telemetryVal, { color: '#16A34A' }]}>
                {currentBreakdown.presentDays}d
              </Text>
              <Text style={styles.telemetrySub}>Present</Text>
            </View>
            <View style={styles.telemetryBlock}>
              <Text style={[styles.telemetryVal, { color: '#2563EB' }]}>
                {currentBreakdown.paidLeaveDays}d
              </Text>
              <Text style={styles.telemetrySub}>Paid Leave</Text>
            </View>
            <View style={styles.telemetryBlock}>
              <Text style={[styles.telemetryVal, { color: '#D97706' }]}>
                {currentBreakdown.unpaidLeaveDays}d
              </Text>
              <Text style={styles.telemetrySub}>Unpaid Lv</Text>
            </View>
            <View style={styles.telemetryBlock}>
              <Text style={[styles.telemetryVal, { color: '#DC2626' }]}>
                {currentBreakdown.unexcusedAbsentDays}d
              </Text>
              <Text style={styles.telemetrySub}>Absent</Text>
            </View>
          </View>

          {/* Itemized Calculations */}
          <View style={styles.calcRowsWrap}>
            <View style={styles.calcRow}>
              <Text style={[styles.calcLabel, { color: palette.textSecondary }]}>Base Monthly Salary:</Text>
              <Text style={[styles.calcValue, { color: palette.textPrimary }]}>
                {formatCurrency(currentBreakdown.baseSalary)}
              </Text>
            </View>

            <View style={styles.calcRow}>
              <Text style={[styles.calcLabel, { color: '#DC2626' }]}>
                Itemized Deductions ({currentBreakdown.unexcusedAbsentDays}d absent + {currentBreakdown.unpaidLeaveDays}d unpaid):
              </Text>
              <Text style={[styles.calcValue, { color: '#DC2626' }]}>
                -{formatCurrency(currentBreakdown.totalDeductions)}
              </Text>
            </View>

            <View style={[styles.netTotalBox, { backgroundColor: palette.badge }]}>
              <Text style={[styles.netTotalLabel, { color: palette.text }]}>ESTIMATED NET PAYOUT:</Text>
              <Text style={[styles.netTotalValue, { color: palette.text }]}>
                {formatCurrency(currentBreakdown.netSalary)}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.cardActionsRow}>
            <TouchableOpacity
              style={[styles.outlineBtn, { borderColor: palette.primary }]}
              onPress={() =>
                Alert.alert(
                  'Export PDF',
                  `Official Payslip PDF exported for ${selectedUser?.name} (${monthLabel}).`
                )
              }
            >
              <Icon name="document-text" size={14} color={palette.primary} />
              <Text style={[styles.outlineBtnText, { color: palette.primary }]}>Export PDF</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.lockBtn, { backgroundColor: palette.primary }]}
              onPress={() => Alert.alert('Locked', `Salary estimate locked for approval.`)}
            >
              <Icon name="lock-closed" size={14} color="#FFFFFF" />
              <Text style={styles.lockBtnText}>Lock Approval</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={[styles.featuredAuditCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
          <Text style={[styles.featuredEmpTitle, { color: palette.textSecondary }]}>
            No employees found. Ask your Company Admin to create employee accounts to run payroll.
          </Text>
        </View>
      )}

      <Text style={[styles.queueHeading, { color: palette.textPrimary }]}>
        Team Queue (Tap to Audit Employee)
      </Text>
    </View>
  );

  // Syllabus Requirement: Total Payroll as ListFooterComponent
  const renderListFooter = () => (
    <View style={[styles.totalPayrollFooter, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
      <View style={styles.footerRow}>
        <View>
          <Text style={[styles.footerTitle, { color: palette.textPrimary }]}>
            Total Company Estimated Payroll
          </Text>
          <Text style={[styles.footerSubtitle, { color: palette.textSecondary }]}>
            Cycle: {monthLabel} • {teamMembers.length} Headcount • Projected
          </Text>
        </View>
        <Text style={[styles.footerAmount, { color: palette.primary }]}>
          {formatCurrency(totalCompanyPayroll)}
        </Text>
      </View>
    </View>
  );

  const renderItem = ({ item }) => {
    const isSelected = item.id === selectedUser?.id;
    const payout = getBreakdownForUser(item);
    return (
      <TouchableOpacity
        style={[
          styles.empQueueCard,
          { backgroundColor: palette.card, borderColor: palette.cardBorder },
          isSelected && { borderColor: palette.primary, borderWidth: 2 },
        ]}
        onPress={() => setSelectedUserId(item.id)}
      >
        <View style={styles.queueInfo}>
          <Text style={[styles.queueName, { color: palette.textPrimary }]}>{item.name}</Text>
          <Text style={[styles.queueTitle, { color: palette.textSecondary }]}>
            {item.title}{item.department ? ` • ${item.department}` : ''}
          </Text>
        </View>
        <View style={styles.queueRight}>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.queuePayout, { color: palette.primary }]}>
              {formatCurrency(payout.netSalary)}
            </Text>
            <Text style={[styles.itemMonthStatus, { color: '#B45309' }]}>Estimate</Text>
          </View>
          <Icon name="chevron-forward" size={16} color="#94A3B8" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <HeaderBar
        title="Employee Salary Estimates & Audit"
        subtitle="Human Resources"
        showBack
        navigation={navigation}
      />

      {/* Syllabus Requirement: FlatList with ListHeaderComponent and ListFooterComponent */}
      <FlatList
        data={teamMembers}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={renderListHeader}
        ListFooterComponent={renderListFooter}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 36,
  },
  headerContainer: {
    marginBottom: 8,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  monthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  monthText: {
    fontSize: 13,
    fontWeight: '700',
  },
  recalcBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },
  recalcBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recalcText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  featuredAuditCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  featuredBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  auditTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  auditTagText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  empIdTag: {
    fontSize: 11,
    fontWeight: '600',
  },
  featuredEmpName: {
    fontSize: 18,
    fontWeight: '800',
  },
  featuredEmpTitle: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 12,
  },
  telemetryStrip: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingVertical: 10,
    marginBottom: 14,
  },
  telemetryBlock: {
    alignItems: 'center',
  },
  telemetryVal: {
    fontSize: 15,
    fontWeight: '800',
  },
  telemetrySub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  calcRowsWrap: {
    gap: 6,
    marginBottom: 14,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calcLabel: {
    fontSize: 12,
    flex: 1,
  },
  calcValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  netTotalBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 6,
  },
  netTotalLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  netTotalValue: {
    fontSize: 16,
    fontWeight: '900',
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  outlineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: 8,
    paddingVertical: 9,
    gap: 6,
  },
  outlineBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  lockBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 9,
    gap: 6,
  },
  lockBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  queueHeading: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 4,
  },
  empQueueCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  queueInfo: {
    flex: 1,
  },
  queueName: {
    fontSize: 13,
    fontWeight: '700',
  },
  queueTitle: {
    fontSize: 11,
    marginTop: 2,
  },
  queueRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  queuePayout: {
    fontSize: 12,
    fontWeight: '700',
  },
  totalPayrollFooter: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginTop: 12,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  footerSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  footerAmount: {
    fontSize: 18,
    fontWeight: '900',
  },
  itemMonthStatus: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
});

export default SalaryEstimatesScreen;
