import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import storageService, { STORAGE_KEYS } from '../../services/storageService';
import { loadTasks } from '../../services/taskService';
import { loadRequirements } from '../../services/requirementService';
import { loadAttendance } from '../../services/attendanceService';
import HeaderBar from '../../components/common/HeaderBar';
import Icon from '../../components/common/Icon';

export const ManagerDashboardScreen = ({ navigation }) => {
  const { currentUser } = useAuth();
  const { getRolePalette } = useTheme();
  const palette = getRolePalette('MANAGER');

  // Tasks, requirements & punch logs are NOT in Redux anymore — they are read
  // from AsyncStorage when this screen mounts, and again every time it regains
  // focus (tab screens stay mounted, so focus is what keeps data fresh).
  const [tasks, setTasks] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  useEffect(() => {
    const loadData = async () => {
      const storedTasks = await loadTasks();
      const storedRequirements = await loadRequirements();
      const storedLogs = await loadAttendance();
      setTasks(storedTasks);
      setRequirements(storedRequirements);
      setLogs(storedLogs);
      setIsDataLoaded(true);
    };
    loadData();
    const unsubscribe = navigation.addListener('focus', loadData);
    return () => unsubscribe();
  }, [navigation]);

  // The manager's team = employee users whose reporting line points to this
  // manager (managerId). Users live in AsyncStorage (single source of truth).
  const [users, setUsers] = useState([]);
  useEffect(() => {
    (async () => {
      const storedUsers = await storageService.getItem(STORAGE_KEYS.USERS, []);
      setUsers(storedUsers);
    })();
  }, []);

  const myTeam = useMemo(
    () => users.filter((u) => u.managerId === currentUser?.id),
    [users, currentUser]
  );
  const teamIds = useMemo(() => myTeam.map((u) => u.id), [myTeam]);

  // Only tasks assigned to this manager's team count toward the team KPIs.
  const teamTasks = useMemo(
    () =>
      tasks.filter(
        (t) =>
          teamIds.includes(t.assignedToId) ||
          (Array.isArray(t.assignedToIds) && t.assignedToIds.some((id) => teamIds.includes(id)))
      ),
    [tasks, teamIds]
  );

  // Compute dual-deadline conflicts using useMemo
  const conflictingTasks = useMemo(() => {
    return teamTasks.filter((t) => t.hasConflict || t.bufferDays < 0);
  }, [teamTasks]);

  // Team presence for today comes from real check-in logs (no demo numbers).
  const todayStr = new Date().toISOString().split('T')[0];
  const presentCount = useMemo(() => {
    return logs.filter(
      (l) =>
        l.date === todayStr &&
        teamIds.includes(l.userId) &&
        (l.status === 'PRESENT' || l.status === 'CORRECTED_PRESENT')
    ).length;
  }, [logs, teamIds, todayStr]);

  // Wait for the first AsyncStorage read so the KPIs don't flash "0" while
  // the real numbers are still loading.
  if (!isDataLoaded) {
    return <View style={[styles.container, { backgroundColor: palette.background }]} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <HeaderBar
        title="Manager Operational Dashboard"
        subtitle="Engineering Management"
        navigation={navigation}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Conditional Dual-Deadline Conflict Alert Card */}
        {conflictingTasks.length > 0 && (
          <View style={styles.conflictAlertCard}>
            <View style={styles.alertHeaderRow}>
              <View style={styles.alertTitleRow}>
                <Icon name="alert-triangle" size={18} color="#DC2626" />
                <Text style={styles.alertTitle}>DUAL-DEADLINE SCHEDULE RISK DETECTED</Text>
              </View>
              <View style={styles.conflictBadge}>
                <Text style={styles.conflictBadgeText}>
                  {conflictingTasks.length} CRITICAL
                </Text>
              </View>
            </View>

            <Text style={styles.conflictDescription}>
              {conflictingTasks[0]?.conflictDetails || 'A team task is scheduled past its client deadline.'}
            </Text>

            <TouchableOpacity
              style={styles.reviewTaskBtn}
              onPress={() => navigation.navigate('Tasks')}
              activeOpacity={0.8}
            >
              <Text style={styles.reviewTaskBtnText}>Review &amp; Reschedule Task →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 2x2 KPI Grid */}
        <Text style={[styles.sectionHeading, { color: palette.textPrimary }]}>
          Team Report
        </Text>
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
            <Text style={[styles.kpiValue, { color: '#16A34A' }]}>
              {presentCount}/{myTeam.length}
            </Text>
            <Text style={[styles.kpiLabel, { color: palette.textSecondary }]}>Team Present</Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
            <Text style={[styles.kpiValue, { color: '#1D4ED8' }]}>
              {teamTasks.length} ({conflictingTasks.length} Conflict)
            </Text>
            <Text style={[styles.kpiLabel, { color: palette.textSecondary }]}>Active Tasks</Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
            <Text style={[styles.kpiValue, { color: '#4338CA' }]}>{requirements.length}</Text>
            <Text style={[styles.kpiLabel, { color: palette.textSecondary }]}>Requirements</Text>
          </View>
        </View>

        {/* Management Controls Navigation Rows */}
        <Text style={[styles.sectionHeading, { color: palette.textPrimary }]}>
          Management Controls
        </Text>
        <View style={styles.controlsList}>
          <TouchableOpacity
            style={[styles.controlRow, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}
            onPress={() => navigation.navigate('Team & Leave')}
          >
            <View style={[styles.controlIconBox, { backgroundColor: '#DBEAFE' }]}>
              <Icon name="people" size={18} color="#1D4ED8" />
            </View>
            <View style={styles.controlInfo}>
              <Text style={[styles.controlTitle, { color: palette.textPrimary }]}>Assigned Team Attendance</Text>
              <Text style={[styles.controlSub, { color: palette.textSecondary }]}>Filter direct reports & daily presence audit</Text>
            </View>
            <Icon name="chevron-forward" size={16} color="#94A3B8" />
          </TouchableOpacity>

          {/* "Leave Review & Approvals" row removed from the dashboard —
              the Team & Leave screen itself is still reachable from the
              Team Attendance row and the manager drawer. */}

          <TouchableOpacity
            style={[styles.controlRow, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}
            onPress={() => navigation.navigate('Tasks')}
          >
            <View style={[styles.controlIconBox, { backgroundColor: '#FEE2E2' }]}>
              <Icon name="time" size={18} color="#DC2626" />
            </View>
            <View style={styles.controlInfo}>
              <Text style={[styles.controlTitle, { color: palette.textPrimary }]}>Team Task Board & Dual Deadlines</Text>
              <Text style={[styles.controlSub, { color: palette.textSecondary }]}>Create tasks, resolve slack & audit progress</Text>
            </View>
            <Icon name="chevron-forward" size={16} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlRow, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}
            onPress={() => navigation.navigate('Requirements')}
          >
            <View style={[styles.controlIconBox, { backgroundColor: '#E0E7FF' }]}>
              <Icon name="flag" size={18} color="#4338CA" />
            </View>
            <View style={styles.controlInfo}>
              <Text style={[styles.controlTitle, { color: palette.textPrimary }]}>Client Requirement Sync</Text>
              <Text style={[styles.controlSub, { color: palette.textSecondary }]}>Create requirements, manage milestones & broadcasts</Text>
            </View>
            <Icon name="chevron-forward" size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Recent Team Tasks */}
        <Text style={[styles.sectionHeading, { color: palette.textPrimary }]}>
          Recent Team Tasks
        </Text>
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
          {teamTasks.length > 0 ? (
            teamTasks.slice(0, 3).map((task) => (
              <View key={task.id} style={styles.milestoneItem}>
                <View style={[styles.mDot, { backgroundColor: '#10B981' }]} />
                <View style={styles.mInfo}>
                  <Text style={[styles.mTitle, { color: palette.textPrimary }]}>
                    {task.title}
                  </Text>
                  <Text style={styles.mSub}>
                    {task.code} • {task.assignedToName || 'Unassigned'} •{' '}
                    {task.status.replace('_', ' ')}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={[styles.mSub, { color: palette.textSecondary }]}>
              No tasks assigned to your team yet. Create one from the Task Board.
            </Text>
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
  conflictAlertCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#F87171',
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
  },
  alertHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  alertTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  alertTitle: {
    color: '#991B1B',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  conflictBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  conflictBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  conflictDescription: {
    color: '#7F1D1D',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
    fontWeight: '600',
  },
  reviewTaskBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
  },
  reviewTaskBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHeading: {
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
    fontSize: 20,
    fontWeight: '800',
  },
  kpiLabel: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  controlsList: {
    gap: 8,
    marginBottom: 18,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  controlIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  controlInfo: {
    flex: 1,
  },
  controlTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  controlSub: {
    fontSize: 11,
    marginTop: 2,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  mDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  mInfo: {
    flex: 1,
  },
  mTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  mSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
});

export default ManagerDashboardScreen;
