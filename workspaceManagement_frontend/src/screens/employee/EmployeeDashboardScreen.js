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
import { loadTasks } from '../../services/taskService';
import HeaderBar from '../../components/common/HeaderBar';
import Icon from '../../components/common/Icon';
import { formatCurrency } from '../../utils/salaryCalculator';

export const EmployeeDashboardScreen = ({ navigation }) => {
  const { currentUser } = useAuth();
  const { getRolePalette } = useTheme();
  const palette = getRolePalette('EMPLOYEE');

  const { logs } = useSelector((state) => state.attendance);

  // Tasks are NOT in Redux anymore — read them from AsyncStorage on mount and
  // refresh on focus so the "today's task" card always shows the latest state.
  const [tasks, setTasks] = useState([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  useEffect(() => {
    const load = async () => {
      setTasks(await loadTasks());
      setIsDataLoaded(true);
    };
    load();
    const unsubscribe = navigation.addListener('focus', load);
    return () => unsubscribe();
  }, [navigation]);

  const activeTask = tasks.find((t) => t.assignedToId === currentUser?.id || t.id === 'TSK-408') || tasks[0];
  const todayLog = logs.find((l) => l.userId === currentUser?.id || l.userId === 'EMP-089');

  // Wait for the first AsyncStorage read so the task card doesn't flash while
  // real data is still loading.
  if (!isDataLoaded) {
    return <View style={[styles.container, { backgroundColor: palette.background }]} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <HeaderBar
        title="Employee Daily Workspace"
        subtitle="Engineering Division"
        navigation={navigation}
        statusText="ON-PREMISE"
        statusColor="#16A34A"
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Welcome Header */}
        <View style={styles.welcomeBanner}>
          <Text style={[styles.welcomeGreeting, { color: palette.textPrimary }]}>
            Welcome back, {currentUser?.name || 'Team Member'} 👋
          </Text>
          <Text style={[styles.welcomeSub, { color: palette.textSecondary }]}>
            Software Engineer II
          </Text>
        </View>

        {/* ON-PREMISE ACTIVE Attendance Card */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
          <View style={styles.presenceHeader}>
            <View style={styles.activePill}>
              <View style={styles.greenDot} />
              <Text style={styles.activePillText}>ON-PREMISE ACTIVE • 09:02 AM</Text>
            </View>
            <Text style={[styles.terminalText, { color: palette.textSecondary }]}>Terminal 04-A</Text>
          </View>

          <Text style={[styles.presenceDesc, { color: palette.textPrimary }]}>
            Validated within Lahore Campus 200m perimeter (14.2m radius)
          </Text>

          <TouchableOpacity
            style={[styles.checkoutBtn, { backgroundColor: palette.primary }]}
            onPress={() => navigation.navigate('Attendance')}
            activeOpacity={0.85}
          >
            <Icon name="location" size={16} color="#FFFFFF" />
            <Text style={styles.checkoutBtnText}>Open GPS Map &amp; Check Out</Text>
          </TouchableOpacity>
        </View>

        {/* Salary Summary Card */}
        <TouchableOpacity
          style={[styles.card, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}
          onPress={() => navigation.navigate('Salary')}
          activeOpacity={0.8}
        >
          <View style={styles.cardHeaderRow}>
            <View style={styles.iconHeadingRow}>
              <Icon name="cash" size={18} color={palette.primary} />
              <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>
                October 2026 Salary Estimate
              </Text>
            </View>
            <Icon name="chevron-forward" size={16} color="#94A3B8" />
          </View>

          <Text style={[styles.salaryAmount, { color: palette.primary }]}>
            {formatCurrency(161500)}
          </Text>
          <Text style={[styles.salaryBreakdownSummary, { color: palette.textSecondary }]}>
            Base 150k • Deductions -8.5k (1 absent, 1 unpaid) • Allowances +20k
          </Text>
        </TouchableOpacity>

        {/* Active Task Deliverable Card */}
        <TouchableOpacity
          style={[styles.card, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}
          onPress={() => navigation.navigate('Work & Requests')}
          activeOpacity={0.8}
        >
          <View style={styles.cardHeaderRow}>
            <View style={styles.iconHeadingRow}>
              <Icon name="time" size={18} color="#D97706" />
              <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>
                Active Task Deliverable
              </Text>
            </View>
            <View style={styles.taskProgressPill}>
              <Text style={styles.taskProgressText}>{activeTask?.progressPercent || 65}% Done</Text>
            </View>
          </View>

          <Text style={[styles.taskTitle, { color: palette.textPrimary }]}>
            {activeTask?.code}: {activeTask?.title}
          </Text>
          <Text style={[styles.taskDueDate, { color: palette.textSecondary }]}>
            Internal Target Due: {activeTask?.internalDeadline || 'Oct 22, 2026'}
          </Text>

          <View style={styles.taskBarBg}>
            <View style={[styles.taskBarFill, { width: `${activeTask?.progressPercent || 65}%`, backgroundColor: palette.primary }]} />
          </View>
        </TouchableOpacity>

        {/* 3 SELF-SERVICE ACTIONS Tiles */}
        <Text style={[styles.sectionHeading, { color: palette.textPrimary }]}>
          SELF-SERVICE ACTIONS
        </Text>
        <View style={styles.actionTilesRow}>
          <TouchableOpacity
            style={[styles.actionTile, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}
            onPress={() => navigation.navigate('Work & Requests')}
          >
            <View style={[styles.tileIconBox, { backgroundColor: '#EEF2FF' }]}>
              <Icon name="calendar" size={18} color={palette.primary} />
            </View>
            <Text style={[styles.tileText, { color: palette.textPrimary }]}>Request Leave</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionTile, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}
            onPress={() => navigation.navigate('Work & Requests')}
          >
            <View style={[styles.tileIconBox, { backgroundColor: '#FEF3C7' }]}>
              <Icon name="ticket" size={18} color="#D97706" />
            </View>
            <Text style={[styles.tileText, { color: palette.textPrimary }]}>HR Support</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionTile, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}
            onPress={() => navigation.navigate('Salary')}
          >
            <View style={[styles.tileIconBox, { backgroundColor: '#DCFCE7' }]}>
              <Icon name="wallet" size={18} color="#16A34A" />
            </View>
            <Text style={[styles.tileText, { color: palette.textPrimary }]}>Payslip Slip</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Attendance Logs */}
        <Text style={[styles.sectionHeading, { color: palette.textPrimary }]}>
          Recent Attendance Logs
        </Text>
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
          <View style={styles.recentLogRow}>
            <View style={styles.recentDot} />
            <View style={styles.recentInfo}>
              <Text style={[styles.recentTitle, { color: palette.textPrimary }]}>
                Today, Oct 15 • Check-In at 09:02 AM
              </Text>
              <Text style={styles.recentSub}>14.2m radius • Geofence verified • Terminal 04-A</Text>
            </View>
            <Text style={styles.statusOkText}>PRESENT</Text>
          </View>

          <View style={styles.recentDivider} />

          <View style={styles.recentLogRow}>
            <View style={[styles.recentDot, { backgroundColor: '#D97706' }]} />
            <View style={styles.recentInfo}>
              <Text style={[styles.recentTitle, { color: palette.textPrimary }]}>
                Oct 12 • Physical Sign-Out Override
              </Text>
              <Text style={styles.recentSub}>HR Approved via Ticket #TKT-101</Text>
            </View>
            <Text style={[styles.statusOkText, { color: '#D97706' }]}>CORRECTED</Text>
          </View>
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
  welcomeBanner: {
    marginBottom: 16,
  },
  welcomeGreeting: {
    fontSize: 18,
    fontWeight: '800',
  },
  welcomeSub: {
    fontSize: 12,
    marginTop: 2,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
    elevation: 1,
  },
  presenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 6,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  activePillText: {
    color: '#16A34A',
    fontSize: 10,
    fontWeight: '800',
  },
  terminalText: {
    fontSize: 11,
    fontWeight: '500',
  },
  presenceDesc: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 14,
  },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 8,
    gap: 6,
  },
  checkoutBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  salaryAmount: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 4,
  },
  salaryBreakdownSummary: {
    fontSize: 11,
  },
  taskProgressPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  taskProgressText: {
    color: '#B45309',
    fontSize: 10,
    fontWeight: '800',
  },
  taskTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  taskDueDate: {
    fontSize: 11,
    marginTop: 2,
    marginBottom: 10,
  },
  taskBarBg: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  taskBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 4,
    marginBottom: 10,
  },
  actionTilesRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  actionTile: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
  },
  tileIconBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  tileText: {
    fontSize: 11,
    fontWeight: '700',
  },
  recentLogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  recentInfo: {
    flex: 1,
  },
  recentTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  recentSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  statusOkText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16A34A',
  },
  recentDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 10,
    marginLeft: 16,
  },
});

export default EmployeeDashboardScreen;
