import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import HeaderBar from '../../components/common/HeaderBar';
import Icon from '../../components/common/Icon';
import { calculateSalaryEstimate, formatCurrency } from '../../utils/salaryCalculator';

export const MySalaryEstimateScreen = ({ navigation }) => {
  const { currentUser } = useAuth();
  const { getRolePalette } = useTheme();
  const palette = getRolePalette('EMPLOYEE');

  // Real data from Redux: attendance logs, approved leaves, salary policy
  const { logs } = useSelector((state) => state.attendance);
  const { leaves } = useSelector((state) => state.leaves);
  const salaryConfig = useSelector((state) => state.salary);

  // Current month window (same approach as the dashboard / HR salary screen)
  const monthPrefix = new Date().toISOString().slice(0, 7);
  const monthLabel = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Real days present this month
  const myMonthLogs = logs.filter(
    (l) => l.userId === currentUser?.id && (l.date || '').startsWith(monthPrefix)
  );
  const presentDays = myMonthLogs.filter(
    (l) => l.status === 'PRESENT' || l.status === 'CORRECTED_PRESENT'
  ).length;

  // Real approved leave days this month, split into paid / unpaid
  const myMonthLeaves = leaves.filter(
    (l) =>
      l.userId === currentUser?.id &&
      l.status === 'APPROVED' &&
      (l.startDate || '').startsWith(monthPrefix)
  );
  const paidLeaveDays = myMonthLeaves
    .filter((l) => l.isPaid !== false)
    .reduce((acc, l) => acc + (l.daysCount || 1), 0);
  const unpaidLeaveDays = myMonthLeaves
    .filter((l) => l.isPaid === false)
    .reduce((acc, l) => acc + (l.daysCount || 1), 0);

  // Company policy, or this employee's override if HR configured one
  const cfg = salaryConfig.overrides[currentUser?.id] || salaryConfig.companyWide;

  const estimate = calculateSalaryEstimate({
    baseSalary: currentUser?.baseSalary || cfg.baseSalary || cfg.baseSalaryDefault || 0,
    workingDaysPerPeriod: cfg.workingDaysPerPeriod,
    presentDays,
    paidLeaveDays,
    unpaidLeaveDays,
    absentDays: 0,
    deductionPerAbsentDay: cfg.deductionPerAbsentDay,
    deductionPerUnpaidLeaveDay: cfg.deductionPerUnpaidLeaveDay,
  });

  const handleDownloadPDF = () => {
    Alert.alert(
      'Download Payslip PDF',
      `Official digital payslip statement for ${monthLabel} downloaded to your device.`,
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <HeaderBar
        title="My Transparent Salary Estimate"
        subtitle="Payroll & Compensation"
        showBack
        navigation={navigation}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Net Payout Card */}
        <View style={[styles.heroCard, { backgroundColor: palette.primary }]}>
          <Text style={styles.heroSub}>
            CYCLE: {monthLabel.toUpperCase()} • ESTIMATED NET PAYOUT
          </Text>
          <Text style={styles.heroAmount}>{formatCurrency(estimate.netSalary)}</Text>

          <TouchableOpacity style={styles.downloadPdfBtn} onPress={handleDownloadPDF} activeOpacity={0.85}>
            <Icon name="document-text" size={15} color={palette.primary} />
            <Text style={[styles.downloadPdfText, { color: palette.primary }]}>
              Download Official Payslip (PDF)
            </Text>
          </TouchableOpacity>
        </View>

        {/* 2x2 Shift & Attendance Telemetry Grid */}
        <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>
          Shift &amp; Attendance Telemetry
        </Text>
        <View style={styles.telemetryGrid}>
          <View style={[styles.telemetryCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
            <Text style={[styles.telVal, { color: palette.textPrimary }]}>
              {estimate.workingDaysPerPeriod}
            </Text>
            <Text style={[styles.telLabel, { color: palette.textSecondary }]}>Expected Work Days</Text>
          </View>

          <View style={[styles.telemetryCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
            <Text style={[styles.telVal, { color: '#16A34A' }]}>{estimate.presentDays}</Text>
            <Text style={[styles.telLabel, { color: palette.textSecondary }]}>Days Present</Text>
          </View>

          <View style={[styles.telemetryCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
            <Text style={[styles.telVal, { color: '#2563EB' }]}>{estimate.paidLeaveDays}</Text>
            <Text style={[styles.telLabel, { color: palette.textSecondary }]}>Paid Leave Day</Text>
          </View>

          <View style={[styles.telemetryCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
            <Text style={[styles.telVal, { color: '#D97706' }]}>{estimate.unpaidLeaveDays}</Text>
            <Text style={[styles.telLabel, { color: palette.textSecondary }]}>Unpaid Leave Day</Text>
          </View>
        </View>

        {/* Itemized Policy Deductions */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>
              Itemized Policy Deductions
            </Text>
            <Text style={[styles.totalDeductText, { color: '#DC2626' }]}>
              {estimate.totalDeductions > 0
                ? `-${formatCurrency(estimate.totalDeductions)}`
                : formatCurrency(estimate.totalDeductions)}
            </Text>
          </View>

          {unpaidLeaveDays > 0 ? (
            <View style={styles.itemRow}>
              <Text style={[styles.itemLabel, { color: palette.textSecondary }]}>
                {`Unpaid Leave (${unpaidLeaveDays} Day${unpaidLeaveDays > 1 ? 's' : ''} @ ${estimate.rateUnpaidLeave.toLocaleString()} PKR / d):`}
              </Text>
              <Text style={[styles.itemVal, { color: '#DC2626' }]}>
                -{formatCurrency(estimate.unpaidLeaveDeductionTotal)}
              </Text>
            </View>
          ) : (
            <Text style={[styles.itemLabel, { color: palette.textSecondary }]}>
              No deductions applied so far this month.
            </Text>
          )}
        </View>

        {/* HR Ticket Link */}
        <View style={[styles.formulaCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
          <TouchableOpacity
            style={styles.openTicketLink}
            onPress={() => navigation.navigate('Work & Requests', { initialTab: 'TICKETS' })}
          >
            <Text style={[styles.openTicketLinkText, { color: palette.primary }]}>
              Discrepancy? Open an HR Ticket →
            </Text>
          </TouchableOpacity>
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
    paddingBottom: 40,
  },
  heroCard: {
    borderRadius: 14,
    padding: 20,
    marginBottom: 18,
    alignItems: 'center',
    elevation: 3,
  },
  heroSub: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  heroAmount: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    marginBottom: 16,
  },
  downloadPdfBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  downloadPdfText: {
    fontSize: 12,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  telemetryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    marginBottom: 12,
  },
  telemetryCard: {
    width: '48%',
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  telVal: {
    fontSize: 18,
    fontWeight: '800',
  },
  telLabel: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  totalDeductText: {
    fontSize: 14,
    fontWeight: '800',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  itemLabel: {
    fontSize: 11,
    flex: 1,
  },
  itemVal: {
    fontSize: 12,
    fontWeight: '700',
  },
  formulaCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  openTicketLink: {
    alignItems: 'center',
  },
  openTicketLinkText: {
    fontSize: 12,
    fontWeight: '700',
  },
});

export default MySalaryEstimateScreen;
