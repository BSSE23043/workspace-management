import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import storageService, { STORAGE_KEYS } from '../../services/storageService';
import { loadTasks, createTask } from '../../services/taskService';
import HeaderBar from '../../components/common/HeaderBar';
import AppInput from '../../components/common/AppInput';
import Icon from '../../components/common/Icon';
import DatePickerModal from '../../components/common/DatePickerModal';

const STATUS_TABS = [
  { id: 'ALL', label: 'All' },
  { id: 'TO_DO', label: 'To Do' },
  { id: 'IN_PROGRESS', label: 'In Progress' },
  { id: 'COMPLETED', label: 'Completed' },
];

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export const TaskManagementScreen = ({ navigation }) => {
  const { currentUser } = useAuth();
  const { getRolePalette } = useTheme();
  const palette = getRolePalette('MANAGER');

  // Tasks are NOT in Redux anymore — read them from AsyncStorage on mount and
  // refresh on every focus so a task created here (or elsewhere) shows up.
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

  // Users are loaded from AsyncStorage (Redux no longer stores the user list)
  const [users, setUsers] = useState([]);
  useEffect(() => {
    (async () => {
      const storedUsers = await storageService.getItem(STORAGE_KEYS.USERS, []);
      setUsers(storedUsers);
    })();
  }, []);

  const [activeTab, setActiveTab] = useState('ALL');
  const [isCreateOpen, setIsCreateOpen] = useState(true);

  // Form default dates use the current date instead of hardcoded demo dates.
  const todayStr = new Date().toISOString().split('T')[0];
  const addDays = (dateStr, days) => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  // Form State for creating task (with multi-engineer support)
  const [taskTitle, setTaskTitle] = useState('');
  const [assignedToIds, setAssignedToIds] = useState([]);
  const [priority, setPriority] = useState('HIGH');
  const [internalDeadline, setInternalDeadline] = useState(todayStr);
  const [clientDeadline, setClientDeadline] = useState(addDays(todayStr, 7));
  const [calendarField, setCalendarField] = useState(null); // 'internal' | 'client' | null
  const [hasFormError, setHasFormError] = useState(false);

  // Engineers assignable by this manager = their own direct reports.
  const engineers = users.filter((u) => u.managerId === currentUser?.id);

  const toggleEngineer = (id) => {
    if (assignedToIds.includes(id)) {
      if (assignedToIds.length > 1) {
        setAssignedToIds(assignedToIds.filter((eId) => eId !== id));
      }
    } else {
      setAssignedToIds([...assignedToIds, id]);
    }
  };

  // Live conflict warning calculation
  const intDate = new Date(internalDeadline);
  const cliDate = new Date(clientDeadline);
  const diffDays = Math.round((cliDate.getTime() - intDate.getTime()) / (1000 * 60 * 60 * 24));
  const isConflict = diffDays < 0;

  const filteredTasks = tasks.filter((t) => activeTab === 'ALL' || t.status === activeTab);

  const handleCreateTask = async () => {
    if (!taskTitle.trim()) {
      setHasFormError(true);
      return;
    }

    if (engineers.length === 0) {
      Alert.alert('No Team Members', 'No employees report to you yet, so a task cannot be assigned.');
      return;
    }

    if (assignedToIds.length === 0) {
      Alert.alert('Select Engineer', 'Tap at least one engineer to assign this task.');
      return;
    }

    const assignedUsers = engineers.filter((e) => assignedToIds.includes(e.id));
    const assignedNames = assignedUsers.map((e) => e.name);

    // Write the new task to AsyncStorage and refresh local state with the
    // saved list (taskService saves it and hands the list straight back).
    const nextTasks = await createTask({
      title: taskTitle.trim(),
      assignedToIds,
      // The real variable above is called assignedNames — passing a shorthand
      // named assignedToNames here referenced an undeclared identifier and
      // crashed with "Property assignedToNames doesn't exist" on button press.
      assignedToNames: assignedNames,
      assignedToId: assignedToIds[0],
      assignedToName: assignedNames.join(', '),
      // The manager who creates the task, so the employee's task card can show
      // the real name instead of a generic role label.
      createdByName: currentUser?.name,
      priority,
      internalDeadline,
      clientDeadline,
    });
    setTasks(nextTasks);

    setTaskTitle('');
    setHasFormError(false);
    Alert.alert(
      'Task Created & Assigned',
      `Task "${taskTitle}" assigned to ${assignedNames.join(', ')}.`
    );
  };

  // Wait for the first AsyncStorage read so the board doesn't flash its
  // empty state while real tasks are still loading.
  if (!isDataLoaded) {
    return <View style={[styles.container, { backgroundColor: palette.background }]} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <HeaderBar
        title="Team Task Board & Dual Deadlines"
        subtitle="Engineering Management"
        showBack
        navigation={navigation}
      />

      {/* Status Tabs */}
      <View style={styles.tabsRow}>
        {STATUS_TABS.map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tabBtn,
                isSelected
                  ? { backgroundColor: palette.primary, borderColor: palette.primary }
                  : { backgroundColor: palette.card, borderColor: palette.cardBorder },
              ]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text
                style={[
                  styles.tabText,
                  isSelected ? { color: '#FFFFFF' } : { color: palette.textSecondary },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Quick Create & Assign Toggle Header */}
        <TouchableOpacity
          style={[styles.createToggleBtn, { backgroundColor: palette.card, borderColor: palette.primary }]}
          onPress={() => setIsCreateOpen(!isCreateOpen)}
          activeOpacity={0.8}
        >
          <View style={styles.createToggleLeft}>
            <View style={[styles.createIconBox, { backgroundColor: palette.primary }]}>
              <Icon name="add" size={18} color="#FFFFFF" />
            </View>
            <View>
              <Text style={[styles.createToggleTitle, { color: palette.textPrimary }]}>
                {isCreateOpen ? 'Hide Task Creation Form' : '+ Create & Assign New Task'}
              </Text>
              <Text style={[styles.createToggleSub, { color: palette.textSecondary }]}>
                Dual-Deadline Engine • Assign to multiple engineers
              </Text>
            </View>
          </View>
          <Icon name={isCreateOpen ? 'chevron-up' : 'chevron-down'} size={20} color={palette.primary} />
        </TouchableOpacity>

        {/* Collapsible Create & Assign New Task Form Card at the TOP */}
        {isCreateOpen && (
          <View style={[styles.createCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
            <Text style={[styles.createTitle, { color: palette.textPrimary }]}>
              Create &amp; Assign New Task (Dual-Deadline Engine)
            </Text>
            <Text style={[styles.createSubtitle, { color: palette.textSecondary }]}>
              System compares Internal vs External Client due dates to detect schedule risks
            </Text>

            <AppInput
              label="Task Title *"
              value={taskTitle}
              onChangeText={setTaskTitle}
              placeholder="e.g. Implement WebSocket Reconnection Strategy"
              error={hasFormError && !taskTitle.trim() ? '! Task title is required' : null}
            />

            {/* Multi-Engineer Assignment */}
            <View style={styles.engineerSectionHeader}>
              <Text style={[styles.formLabel, { color: palette.textPrimary }]}>
                Assign To Engineers ({assignedToIds.length} selected)
              </Text>
              <Text style={[styles.engineerSubtext, { color: palette.textSecondary }]}>
                Tap to toggle multiple assignees
              </Text>
            </View>
            <View style={styles.chipsWrap}>
              {engineers.map((eng) => {
                const isSelected = assignedToIds.includes(eng.id);
                return (
                  <TouchableOpacity
                    key={eng.id}
                    style={[
                      styles.selectChip,
                      { borderColor: palette.cardBorder },
                      isSelected && { backgroundColor: palette.primary, borderColor: palette.primary },
                    ]}
                    onPress={() => toggleEngineer(eng.id)}
                  >
                    {isSelected && <Icon name="checkmark" size={14} color="#FFFFFF" />}
                    <Text
                      style={[
                        styles.selectChipText,
                        isSelected ? { color: '#FFFFFF' } : { color: palette.textPrimary },
                      ]}
                    >
                      {eng.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Priority Selection */}
            <Text style={[styles.formLabel, { color: palette.textPrimary, marginTop: 10 }]}>Priority</Text>
            <View style={styles.chipsWrap}>
              {PRIORITIES.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.selectChip,
                    { borderColor: palette.cardBorder },
                    priority === p && { backgroundColor: palette.primary, borderColor: palette.primary },
                  ]}
                  onPress={() => setPriority(p)}
                >
                  <Text
                    style={[
                      styles.selectChipText,
                      priority === p ? { color: '#FFFFFF' } : { color: palette.textPrimary },
                    ]}
                  >
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Dates Row with Interactive Calendar Pickers */}
            <View style={styles.datesRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>Internal Due</Text>
                <TouchableOpacity
                  style={[styles.dateBtn, { backgroundColor: palette.background, borderColor: palette.inputBorder }]}
                  onPress={() => setCalendarField('internal')}
                  activeOpacity={0.7}
                >
                  <Icon name="calendar" size={16} color={palette.primary} />
                  <Text style={[styles.dateBtnText, { color: palette.textPrimary }]}>{internalDeadline}</Text>
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>Client Due</Text>
                <TouchableOpacity
                  style={[styles.dateBtn, { backgroundColor: palette.background, borderColor: palette.inputBorder }]}
                  onPress={() => setCalendarField('client')}
                  activeOpacity={0.7}
                >
                  <Icon name="calendar" size={16} color={palette.primary} />
                  <Text style={[styles.dateBtnText, { color: palette.textPrimary }]}>{clientDeadline}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Live Conflict Warning Box */}
            {isConflict ? (
              <View style={styles.liveWarningBox}>
                <Icon name="alert-triangle" size={16} color="#DC2626" />
                <Text style={styles.liveWarningText}>
                  ⚠️ DEADLINE CONFLICT: Internal date exceeds Client deadline by {Math.abs(diffDays)} days!
                </Text>
              </View>
            ) : (
              <View style={styles.liveSafeBox}>
                <Icon name="checkmark-circle" size={16} color="#16A34A" />
                <Text style={styles.liveSafeText}>
                  ✓ Schedule Safe: {diffDays} days buffer before client delivery.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.assignTaskBtn, { backgroundColor: palette.primary }]}
              onPress={handleCreateTask}
              activeOpacity={0.85}
            >
              <Text style={styles.assignTaskBtnText}>Assign Task to Selected Engineers</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Date Picker Modal */}
        <DatePickerModal
          visible={calendarField !== null}
          onClose={() => setCalendarField(null)}
          initialDate={calendarField === 'internal' ? internalDeadline : clientDeadline}
          title={calendarField === 'internal' ? 'Select Internal Engineer Due Date' : 'Select External Client Due Date'}
          onSelectDate={(newDate) => {
            if (calendarField === 'internal') {
              setInternalDeadline(newDate);
            } else {
              setClientDeadline(newDate);
            }
          }}
        />

        {/* Task Cards Section Title */}
        <View style={styles.taskListHeader}>
          <Text style={[styles.taskListTitle, { color: palette.textPrimary }]}>
            Active Team Tasks ({filteredTasks.length})
          </Text>
          <Text style={[styles.taskListSubtitle, { color: palette.textSecondary }]}>
            Tap any task to review timeline or sync with client milestone
          </Text>
        </View>

        {/* Task Cards List */}
        {filteredTasks.map((task) => {
          const hasConflict = task.hasConflict || task.bufferDays < 0;
          return (
            <TouchableOpacity
              key={task.id}
              style={[
                styles.taskCard,
                { backgroundColor: palette.card, borderColor: palette.cardBorder },
                hasConflict && styles.conflictBorder,
              ]}
              onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
              activeOpacity={0.8}
            >
              <View style={styles.taskCardHeader}>
                <View style={styles.codeRow}>
                  <Text style={[styles.taskCode, { color: palette.primary }]}>{task.code}</Text>
                  <View
                    style={[
                      styles.priorityBadge,
                      task.priority === 'CRITICAL'
                        ? styles.prioCrit
                        : task.priority === 'HIGH'
                        ? styles.prioHigh
                        : styles.prioMed,
                    ]}
                  >
                    <Text style={styles.prioText}>{task.priority}</Text>
                  </View>
                </View>

                {/* Conflict Banner vs Safety Buffer */}
                {hasConflict ? (
                  <View style={styles.conflictPill}>
                    <Icon name="alert-triangle" size={12} color="#DC2626" />
                    <Text style={styles.conflictPillText}>
                      ⚠️ DEADLINE CONFLICT (+{Math.abs(task.bufferDays)} Days Over Client Due)
                    </Text>
                  </View>
                ) : (
                  <View style={styles.safePill}>
                    <Icon name="checkmark-circle" size={12} color="#16A34A" />
                    <Text style={styles.safePillText}>
                      ✓ On Track ({task.bufferDays} Days Safety Buffer)
                    </Text>
                  </View>
                )}
              </View>

              <Text style={[styles.taskTitle, { color: palette.textPrimary }]}>{task.title}</Text>
              <Text style={[styles.taskDesc, { color: palette.textSecondary }]} numberOfLines={2}>
                {task.description}
              </Text>

              <View style={styles.deadlinesComparisonRow}>
                <View style={styles.deadlineBlock}>
                  <Text style={styles.dlLabel}>Internal Employee Due:</Text>
                  <Text style={[styles.dlVal, { color: hasConflict ? '#DC2626' : palette.textPrimary }]}>
                    {task.internalDeadline}
                  </Text>
                </View>

                <View style={styles.dlDivider} />

                <View style={styles.deadlineBlock}>
                  <Text style={styles.dlLabel}>External Client Due:</Text>
                  <Text style={[styles.dlVal, { color: palette.textPrimary }]}>
                    {task.clientDeadline}
                  </Text>
                </View>
              </View>

              <View style={[styles.cardFooter, { borderTopColor: palette.divider }]}>
                <Text style={[styles.assigneeText, { color: palette.textSecondary }]}>
                  👤 Assigned: {task.assignedToName || (task.assignedToNames ? task.assignedToNames.join(', ') : 'Unassigned')}
                </Text>
                <View style={styles.footerRight}>
                  {task.isMilestoneSynced && (
                    <View style={styles.syncedTag}>
                      <Icon name="checkmark" size={11} color="#16A34A" />
                      <Text style={styles.syncedTagText}>Synced</Text>
                    </View>
                  )}
                  <Text style={[styles.progressText, { color: palette.primary }]}>
                    {task.status.replace('_', ' ')} • {task.progressPercent}%
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  taskCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    elevation: 1,
  },
  conflictBorder: {
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  taskCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  taskCode: {
    fontSize: 12,
    fontWeight: '800',
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  prioCrit: { backgroundColor: '#FEE2E2' },
  prioHigh: { backgroundColor: '#FEF3C7' },
  prioMed: { backgroundColor: '#DBEAFE' },
  prioText: {
    fontSize: 9,
    fontWeight: '800',
  },
  conflictPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  conflictPillText: {
    color: '#DC2626',
    fontSize: 10,
    fontWeight: '800',
  },
  safePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  safePillText: {
    color: '#16A34A',
    fontSize: 10,
    fontWeight: '800',
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  taskDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
  },
  deadlinesComparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  deadlineBlock: {
    flex: 1,
  },
  dlLabel: {
    fontSize: 10,
    color: '#64748B',
  },
  dlVal: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  dlDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 8,
  },
  assigneeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  progressText: {
    fontSize: 11,
    fontWeight: '700',
  },
  createCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginTop: 10,
  },
  createTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  createSubtitle: {
    fontSize: 11,
    marginTop: 2,
    marginBottom: 14,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  selectChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  selectChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  datesRow: {
    flexDirection: 'row',
  },
  liveWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#F87171',
    borderRadius: 8,
    padding: 10,
    gap: 8,
    marginBottom: 14,
  },
  liveWarningText: {
    color: '#991B1B',
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  liveSafeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 8,
    padding: 10,
    gap: 8,
    marginBottom: 14,
  },
  liveSafeText: {
    color: '#16A34A',
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  assignTaskBtn: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  assignTaskBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  createToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  createToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  createIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createToggleTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  createToggleSub: {
    fontSize: 11,
    marginTop: 2,
  },
  engineerSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  engineerSubtext: {
    fontSize: 11,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    marginBottom: 12,
  },
  dateBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  taskListHeader: {
    marginTop: 10,
    marginBottom: 8,
  },
  taskListTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  taskListSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  syncedTagText: {
    color: '#16A34A',
    fontSize: 10,
    fontWeight: '700',
  },
});

export default TaskManagementScreen;
