import React, { useState, useRef, useEffect } from 'react';
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
import { useTheme } from '../../context/ThemeContext';
import { loadTasks, updateTaskStatus } from '../../services/taskService';
import HeaderBar from '../../components/common/HeaderBar';
import Icon from '../../components/common/Icon';

const TASK_TABS = [
  { id: 'ALL', label: 'All' },
  { id: 'TO_DO', label: 'To Do' },
  { id: 'IN_PROGRESS', label: 'In Progress' },
  { id: 'COMPLETED', label: 'Completed' },
];

const TASK_STATES = ['TO_DO', 'IN_PROGRESS', 'COMPLETED'];
const QUICK_PERCENTS = [25, 50, 75, 100];

export const MyTasksScreen = ({ navigation, isEmbedded = false }) => {
  const { currentUser } = useAuth();
  const { getRolePalette } = useTheme();
  const palette = getRolePalette('EMPLOYEE');
  const scrollViewRef = useRef(null);

  // Tasks are NOT in Redux anymore — read them from AsyncStorage on mount and
  // refresh on focus, so a status change saved here (or by the manager in
  // another screen) shows the latest data next time the employee looks.
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

  const [selectedTab, setSelectedTab] = useState('ALL');

  // Filter tasks to this employee (supports both assignedToId and multi-assignees assignedToIds)
  const currentUserId = currentUser?.id || '';
  const myTasks = tasks.filter(
    (t) =>
      t.assignedToId === currentUserId ||
      (Array.isArray(t.assignedToIds) && t.assignedToIds.includes(currentUserId))
  );

  const [selectedTaskId, setSelectedTaskId] = useState(myTasks[0]?.id || '');
  const activeTask = myTasks.find((t) => t.id === selectedTaskId) || myTasks[0];

  // State updates for active task
  const [taskState, setTaskState] = useState(activeTask?.status || 'IN_PROGRESS');
  const [progressNote, setProgressNote] = useState('');
  const [progressPercent, setProgressPercent] = useState(String(activeTask?.progressPercent || 65));

  // Sync state when activeTask changes
  useEffect(() => {
    if (activeTask) {
      setTaskState(activeTask.status || 'IN_PROGRESS');
      setProgressPercent(String(activeTask.progressPercent || 0));
      setProgressNote(activeTask.notes || '');
    }
  }, [activeTask?.id]);

  const handleSelectTaskFromBacklog = (task) => {
    setSelectedTaskId(task.id);
    setTaskState(task.status || 'IN_PROGRESS');
    setProgressPercent(String(task.progressPercent || 0));
    setProgressNote(task.notes || '');
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
  };

  const filteredTasks = myTasks.filter(
    (t) => selectedTab === 'ALL' || t.status === selectedTab
  );

  const handleAdjustPercent = (delta) => {
    const current = parseInt(progressPercent, 10) || 0;
    const next = Math.min(100, Math.max(0, current + delta));
    setProgressPercent(String(next));
  };

  const handleSaveProgress = async (task) => {
    const pct = parseInt(progressPercent, 10);
    const validPct = isNaN(pct) ? task.progressPercent || 0 : Math.min(100, Math.max(0, pct));

    // Writes the new status/progress to AsyncStorage and refreshes local state
    // with the saved list (taskService hands it straight back).
    const nextTasks = await updateTaskStatus({
      taskId: task.id,
      status: taskState,
      progressPercent: validPct,
      note: progressNote.trim() || `Progress recorded at ${validPct}%`,
    });
    setTasks(nextTasks);

    Alert.alert(
      'Progress Saved',
      `Task ${task.code} updated to ${taskState.replace('_', ' ')} (${validPct}%). Manager notified.`
    );
  };

  // Wait for the first AsyncStorage read so the list doesn't flash its empty
  // state while real tasks are still loading.
  if (!isDataLoaded) {
    return <View style={[styles.container, { backgroundColor: palette.background }]} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <HeaderBar
        title="My Sprint Tasks & Deliverables"
        subtitle="Software Engineering"
        showBack
        navigation={navigation}
        isEmbedded={isEmbedded}
      />

      {/* Tabs Row */}
      <View style={styles.tabsRow}>
        {TASK_TABS.map((tab) => {
          const isSelected = selectedTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tabBtn,
                isSelected
                  ? { backgroundColor: palette.primary, borderColor: palette.primary }
                  : { backgroundColor: palette.card, borderColor: palette.cardBorder },
              ]}
              onPress={() => setSelectedTab(tab.id)}
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

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Active Task Workspace Card */}
        {activeTask && (
          <View style={[styles.featuredCard, { backgroundColor: palette.card, borderColor: palette.primary, borderWidth: 1.5 }]}>
            <View style={[styles.activeEditingPill, { backgroundColor: palette.badge }]}>
              <Icon name="flash" size={13} color={palette.primary} />
              <Text style={[styles.activeEditingPillText, { color: palette.primary }]}>
                ACTIVE TASK WORKSPACE • {activeTask.code}
              </Text>
            </View>

            <View style={styles.featuredHeader}>
              <View style={styles.codeRow}>
                <Text style={[styles.codeText, { color: palette.primary }]}>{activeTask.code}</Text>
                <View style={[styles.prioTag, { backgroundColor: '#FEF3C7' }]}>
                  <Text style={styles.prioTagText}>{activeTask.priority} PRIORITY</Text>
                </View>
              </View>

              <View style={[styles.stateTag, { backgroundColor: palette.badge }]}>
                <Text style={[styles.stateTagText, { color: palette.primary }]}>{activeTask.status}</Text>
              </View>
            </View>

            <Text style={[styles.taskTitle, { color: palette.textPrimary }]}>{activeTask.title}</Text>
            <Text style={[styles.taskDesc, { color: palette.textSecondary }]}>{activeTask.description}</Text>

            {/* Note: ONLY Internal Employee Deadline is displayed! External client deadline is strictly hidden */}
            <View style={styles.deadlineBadge}>
              <Icon name="calendar" size={14} color="#4338CA" />
              <Text style={styles.deadlineBadgeText}>
                Internal Employee Deadline: {activeTask.internalDeadline}
              </Text>
            </View>

            {/* Progress Bar & Percentage Controller */}
            <View style={styles.progressRow}>
              <View style={styles.progressLabelRow}>
                <Text style={[styles.progressLabel, { color: palette.textSecondary }]}>
                  Completion Progress: {progressPercent}%
                </Text>
                <View style={styles.stepperWrap}>
                  <TouchableOpacity
                    style={[styles.stepperBtn, { backgroundColor: palette.inputBackground }]}
                    onPress={() => handleAdjustPercent(-10)}
                  >
                    <Text style={[styles.stepperBtnText, { color: palette.textPrimary }]}>-10%</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.stepperBtn, { backgroundColor: palette.inputBackground }]}
                    onPress={() => handleAdjustPercent(10)}
                  >
                    <Text style={[styles.stepperBtnText, { color: palette.textPrimary }]}>+10%</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(100, Math.max(0, parseInt(progressPercent, 10) || 0))}%`,
                      backgroundColor: palette.primary,
                    },
                  ]}
                />
              </View>

              {/* Quick Preset Buttons */}
              <View style={styles.quickPercentRow}>
                {QUICK_PERCENTS.map((pct) => (
                  <TouchableOpacity
                    key={pct}
                    style={[
                      styles.quickPctBtn,
                      progressPercent === String(pct)
                        ? { backgroundColor: palette.primary }
                        : { backgroundColor: palette.inputBackground },
                    ]}
                    onPress={() => setProgressPercent(String(pct))}
                  >
                    <Text
                      style={[
                        styles.quickPctText,
                        progressPercent === String(pct)
                          ? { color: '#FFFFFF' }
                          : { color: palette.textSecondary },
                      ]}
                    >
                      {pct}%
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Update State & Note Form */}
            <View style={[styles.updateFormBox, { backgroundColor: palette.inputBackground, borderColor: palette.cardBorder }]}>
              <Text style={[styles.updateFormTitle, { color: palette.textPrimary }]}>
                Update Sprint Progress & Deliverables
              </Text>

              {/* State Selector */}
              <View style={styles.stateSelectorRow}>
                {TASK_STATES.map((st) => {
                  const isSelected = taskState === st;
                  return (
                    <TouchableOpacity
                      key={st}
                      style={[
                        styles.stateBtn,
                        isSelected && { backgroundColor: palette.primary },
                      ]}
                      onPress={() => setTaskState(st)}
                    >
                      <Text
                        style={[
                          styles.stateBtnText,
                          isSelected ? { color: '#FFFFFF' } : { color: palette.textSecondary },
                        ]}
                      >
                        {st.replace('_', ' ')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TextInput
                value={progressNote}
                onChangeText={setProgressNote}
                placeholder="Log engineer progress notes for sprint review..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={2}
                style={[styles.noteInput, { backgroundColor: palette.surface, borderColor: palette.inputBorder, color: palette.textPrimary }]}
              />

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: palette.primary }]}
                onPress={() => handleSaveProgress(activeTask)}
                activeOpacity={0.85}
              >
                <Icon name="checkmark" size={15} color="#FFFFFF" />
                <Text style={styles.saveBtnText}>✓ Save Progress Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Interactive Sprint Task Backlog */}
        <View style={styles.backlogHeaderRow}>
          <Text style={[styles.sectionHeading, { color: palette.textPrimary }]}>
            Sprint Task Backlog ({filteredTasks.length})
          </Text>
          <Text style={[styles.backlogSubtext, { color: palette.textSecondary }]}>
            Tap any task card to inspect &amp; edit
          </Text>
        </View>

        {filteredTasks.map((t) => {
          const isSelected = t.id === activeTask?.id;
          return (
            <TouchableOpacity
              key={t.id}
              style={[
                styles.taskItemCard,
                { backgroundColor: palette.card, borderColor: isSelected ? palette.primary : palette.cardBorder },
                isSelected && { borderWidth: 2, backgroundColor: palette.badge },
              ]}
              onPress={() => handleSelectTaskFromBacklog(t)}
              activeOpacity={0.8}
            >
              <View style={styles.itemHeader}>
                <View style={styles.itemHeaderLeft}>
                  <Text style={[styles.itemCode, { color: palette.primary }]}>{t.code}</Text>
                  <View style={[styles.prioTagSmall, { backgroundColor: '#FEF3C7' }]}>
                    <Text style={styles.prioTagTextSmall}>{t.priority}</Text>
                  </View>
                </View>
                <View style={[styles.itemStatusPill, { backgroundColor: isSelected ? palette.primary : '#E2E8F0' }]}>
                  <Text style={[styles.itemStatus, { color: isSelected ? '#FFFFFF' : '#475569' }]}>
                    {t.status.replace('_', ' ')}
                  </Text>
                </View>
              </View>

              <Text style={[styles.itemTitle, { color: palette.textPrimary }]}>{t.title}</Text>
              <Text style={[styles.itemDesc, { color: palette.textSecondary }]} numberOfLines={2}>
                {t.description}
              </Text>

              <View style={styles.itemMetaRow}>
                <Text style={[styles.itemDeadline, { color: palette.textSecondary }]}>
                  Target: {t.internalDeadline} • {t.progressPercent}%
                </Text>
                <View style={[styles.editActionBadge, { backgroundColor: isSelected ? palette.primary : palette.inputBackground }]}>
                  <Icon name={isSelected ? 'checkmark' : 'create'} size={12} color={isSelected ? '#FFFFFF' : palette.primary} />
                  <Text style={[styles.editActionText, { color: isSelected ? '#FFFFFF' : palette.primary }]}>
                    {isSelected ? 'Active in Workspace' : 'Inspect & Edit'}
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
    padding: 16,
    paddingBottom: 40,
  },
  featuredCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 18,
    elevation: 2,
  },
  featuredHeader: {
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
  codeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  prioTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  prioTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#B45309',
  },
  stateTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  stateTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  taskDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
  },
  deadlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 6,
    padding: 8,
    gap: 6,
    marginBottom: 10,
  },
  deadlineBadgeText: {
    fontSize: 11,
    color: '#4338CA',
    fontWeight: '700',
  },
  progressRow: {
    marginBottom: 14,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  updateFormBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  updateFormTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  stateSelectorRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  stateBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 6,
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  stateBtnText: {
    fontSize: 10,
    fontWeight: '700',
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    fontSize: 12,
    minHeight: 50,
    marginBottom: 10,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 10,
  },
  taskItemCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  itemCode: {
    fontSize: 11,
    fontWeight: '800',
  },
  itemStatus: {
    fontSize: 10,
    fontWeight: '700',
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  itemDeadline: {
    fontSize: 11,
    marginTop: 2,
  },
  activeEditingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  activeEditingPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepperWrap: {
    flexDirection: 'row',
    gap: 6,
  },
  stepperBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  stepperBtnText: {
    fontSize: 10,
    fontWeight: '700',
  },
  quickPercentRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  quickPctBtn: {
    flex: 1,
    paddingVertical: 4,
    borderRadius: 4,
    alignItems: 'center',
  },
  quickPctText: {
    fontSize: 10,
    fontWeight: '700',
  },
  backlogHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  backlogSubtext: {
    fontSize: 11,
  },
  itemHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  prioTagSmall: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  prioTagTextSmall: {
    fontSize: 9,
    fontWeight: '700',
    color: '#B45309',
  },
  itemStatusPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  itemDesc: {
    fontSize: 11,
    lineHeight: 15,
    marginVertical: 4,
  },
  itemMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  editActionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  editActionText: {
    fontSize: 10,
    fontWeight: '700',
  },
});

export default MyTasksScreen;
