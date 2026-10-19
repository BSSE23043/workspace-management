import React, { useState, useMemo } from 'react';
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

const MONTH_CYCLES = [
  {
    id: 'OCT_2026',
    label: 'October 2026',
    subtitle: 'Ongoing Cycle',
    isCurrent: true,
    presentDays: 19,
    paidLeaveDays: 1,
    unpaidLeaveDays: 1,
    absentDays: 1,
    statusText: 'Audited by HR • Projected Bank Transfer on Oct 31, 2026',
  },
  {
    id: 'SEP_2026',
    label: 'September 2026',
    subtitle: 'Paid & Disbursed',
    isCurrent: false,
    presentDays: 22,
    paidLeaveDays: 0,
    unpaidLeaveDays: 0,
    absentDays: 0,
    statusText: 'Disbursed Sep 30, 2026 • Habib Bank Ref: HBL-982103',
  },
  {
    id: 'AUG_2026',
    label: 'August 2026',
    subtitle: 'Paid & Disbursed',
    isCurrent: false,
    presentDays: 21,
    paidLeaveDays: 1,
    unpaidLeaveDays: 0,
    absentDays: 0,
    statusText: 'Disbursed Aug 31, 2026 • Habib Bank Ref: HBL-881290',
  },
  {
    id: 'JUL_2026',
    label: 'July 2026',
    subtitle: 'Paid & Disbursed',
    isCurrent: false,
    presentDays: 20,
    paidLeaveDays: 1,
    unpaidLeaveDays: 1,
    absentDays: 0,
    statusText: 'Disbursed Jul 31, 2026 • Habib Bank Ref: HBL-771802',
  },
];

export const MySalaryEstimateScreen = ({ navigation }) => {
  const { currentUser } = useAuth();
  const { getRolePalette } = useTheme();
  const palette = getRolePalette('EMPLOYEE');

  const [selectedCycleId, setSelectedCycleId] = useState('OCT_2026');
  const activeCycle = MONTH_CYCLES.find((c) => c.id === selectedCycleId) || MONTH_CYCLES[0];

  const estimate = useMemo(() => {
    return calculateSalaryEstimate({
      baseSalary: 150000,
      workingDaysPerPeriod: 22,
      presentDays: activeCycle.presentDays,
      paidLeaveDays: activeCycle.paidLeaveDays,
      unpaidLeaveDays: activeCycle.unpaidLeaveDays,
      absentDays: activeCycle.absentDays,
      deductionPerAbsentDay: 5000,
      deductionPerUnpaidLeaveDay: 3500,
    });
  }, [activeCycle]);

  const handleDownloadPDF = () => {
    Alert.alert(
      'Download Payslip PDF',
      `Official digital payslip statement for ${activeCycle.label} downloaded to your device.`,
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
        {/* Month Cycle Selector Strip */}
        <View style={styles.cycleStripWrap}>
          <Text style={[styles.cycleStripLabel, { color: palette.textSecondary }]}>
            Select Working Cycle / Past Payslip:
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cyclesScroll}>
            {MONTH_CYCLES.map((cycle) => {
              const isSelected = cycle.id === selectedCycleId;
              return (
                <TouchableOpacity
                  key={cycle.id}
                  style={[
                    styles.cycleChip,
                    { borderColor: palette.cardBorder, backgroundColor: palette.card },
                    isSelected && { borderColor: palette.primary, backgroundColor: palette.badge },
                  ]}
                  onPress={() => setSelectedCycleId(cycle.id)}
                >
                  <Text style={[styles.cycleChipText, { color: isSelected ? palette.primary : palette.textPrimary }]}>
                    {cycle.label}
                  </Text>
                  <Text style={[styles.cycleChipSub, { color: isSelected ? palette.primary : palette.textSecondary }]}>
                    {cycle.subtitle}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Hero Net Payout Card */}
        <View style={[styles.heroCard, { backgroundColor: palette.primary }]}>
          <Text style={styles.heroSub}>
            CYCLE: {activeCycle.label.toUpperCase()} • {activeCycle.isCurrent ? 'ESTIMATED NET PAYOUT' : 'FINAL DISBURSED NET'}
          </Text>
          <Text style={styles.heroAmount}>{formatCurrency(estimate.netSalary)}</Text>
          <Text style={styles.heroStatus}>Status: {activeCycle.statusText}</Text>

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

        {/* Unexcused Absence Notice */}
        <View style={styles.absenceAlert}>
          <Icon name="alert-triangle" size={16} color="#DC2626" />
          <Text style={styles.absenceAlertText}>
            Unexcused Absent: {estimate.unexcusedAbsentDays} Day (-{formatCurrency(estimate.absentDeductionTotal)}) • Out of Bounds GPS
          </Text>
        </View>

        {/* Itemized Policy Deductions */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>
              Itemized Policy Deductions
            </Text>
            <Text style={[styles.totalDeductText, { color: '#DC2626' }]}>
              -{formatCurrency(estimate.totalDeductions)}
            </Text>
          </View>

          <View style={styles.itemRow}>
            <Text style={[styles.itemLabel, { color: palette.textSecondary }]}>
              Unexcused Absence (1 Day @ 5,000 PKR / d):
            </Text>
            <Text style={[styles.itemVal, { color: '#DC2626' }]}>
              -{formatCurrency(estimate.absentDeductionTotal)}
            </Text>
          </View>

          <View style={styles.itemRow}>
            <Text style={[styles.itemLabel, { color: palette.textSecondary }]}>
              Unpaid Leave (1 Day @ 3,500 PKR / d):
            </Text>
            <Text style={[styles.itemVal, { color: '#DC2626' }]}>
              -{formatCurrency(estimate.unpaidLeaveDeductionTotal)}
            </Text>
          </View>
        </View>

        {/* Transparent Salary Calculation Rule & HR Ticket Link */}
        <View style={[styles.formulaCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
          <View style={styles.formulaHeaderRow}>
            <Icon name="shield-checkmark" size={16} color={palette.primary} />
            <Text style={[styles.formulaTitle, { color: palette.textPrimary }]}>
              Transparent Salary Calculation Rule
            </Text>
          </View>
          <Text style={[styles.formulaText, { color: palette.textSecondary }]}>
            {`Net = Base (${estimate.baseSalary.toLocaleString()}) - Total Deductions (${estimate.totalDeductions.toLocaleString()}) = ${estimate.netSalary.toLocaleString()} PKR`}
          </Text>

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
  cycleStripWrap: {
    marginBottom: 14,
  },
  cycleStripLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  cyclesScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  cycleChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 105,
    alignItems: 'center',
  },
  cycleChipText: {
    fontSize: 12,
    fontWeight: '800',
  },
  cycleChipSub: {
    fontSize: 10,
    marginTop: 1,
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
    marginBottom: 4,
  },
  heroStatus: {
    color: '#A5B4FC',
    fontSize: 11,
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
  absenceAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    padding: 10,
    gap: 8,
    marginBottom: 14,
  },
  absenceAlertText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
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
  formulaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  formulaTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  formulaText: {
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 10,
  },
  openTicketLink: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  openTicketLinkText: {
    fontSize: 12,
    fontWeight: '700',
  },
});

export default MySalaryEstimateScreen;
