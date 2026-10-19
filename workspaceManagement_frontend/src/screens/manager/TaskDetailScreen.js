import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import storageService, { STORAGE_KEYS } from '../../services/storageService';
import {
  loadTasks,
  addTaskLog,
  updateTaskStatus,
  editTask,
  toggleMilestoneSync,
} from '../../services/taskService';
import HeaderBar from '../../components/common/HeaderBar';
import AppInput from '../../components/common/AppInput';
import Icon from '../../components/common/Icon';
import DatePickerModal from '../../components/common/DatePickerModal';

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export const TaskDetailScreen = ({ navigation, route }) => {
  const { currentUser } = useAuth();
  const { getRolePalette } = useTheme();
  const palette = getRolePalette('MANAGER');

  const taskId = route?.params?.taskId;

  // Tasks are NOT in Redux anymore — read them from AsyncStorage on mount and
  // refresh on focus so edits made here always show the latest saved data.
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

  const task = tasks.find((t) => t.id === taskId) || tasks[0];

  // Users are loaded from AsyncStorage (Redux no longer stores the user list)
  const [users, setUsers] = useState([]);
  useEffect(() => {
    (async () => {
      const storedUsers = await storageService.getItem(STORAGE_KEYS.USERS, []);
      setUsers(storedUsers);
    })();
  }, []);

  // Engineers assignable by this manager = their own direct reports.
  const engineers = users.filter((u) => u.managerId === currentUser?.id);

  const [managerNote, setManagerNote] = useState('');

  // Default edit dates use the current date instead of hardcoded demo dates.
  const todayStr = new Date().toISOString().split('T')[0];

  // Edit Task Modal State
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editTitle, setEditTitle] = useState(task?.title || '');
  const [editDesc, setEditDesc] = useState(task?.description || '');
  const [editPriority, setEditPriority] = useState(task?.priority || 'MEDIUM');
  const [editInternalDeadline, setEditInternalDeadline] = useState(task?.internalDeadline || todayStr);
  const [editClientDeadline, setEditClientDeadline] = useState(task?.clientDeadline || todayStr);
  const [editAssignedIds, setEditAssignedIds] = useState(
    task?.assignedToIds || (task?.assignedToId ? [task.assignedToId] : [])
  );
  const [calendarField, setCalendarField] = useState(null);

  const intDate = new Date(task?.internalDeadline || todayStr);
  const cliDate = new Date(task?.clientDeadline || todayStr);
  const diffDays = Math.round((cliDate.getTime() - intDate.getTime()) / (1000 * 60 * 60 * 24));
  const hasConflict = diffDays < 0;

  const handlePostNote = async () => {
    if (!managerNote.trim()) return;
    const nextTasks = await addTaskLog({
      taskId: task.id,
      note: `Manager Note: ${managerNote.trim()}`,
    });
    setTasks(nextTasks);
    setManagerNote('');
    Alert.alert('Note Posted', 'Manager progress note attached to task timeline.');
  };

  const handleToggleSyncMilestone = async () => {
    const nextState = !task?.isMilestoneSynced;
    // Both writes are sequential on purpose: each service call re-reads the
    // saved list, so the second one must run after the first one has finished.
    let nextTasks = await toggleMilestoneSync({ taskId: task.id, isSynced: nextState });
    if (nextState) {
      nextTasks = await updateTaskStatus({
        taskId: task.id,
        status: 'COMPLETED',
        progressPercent: 100,
        note: 'Task marked ready for Client Milestone Sync by Engineering Manager.',
      });
      Alert.alert(
        'Milestone Synced',
        `Task ${task.code} marked ready and synchronized with Client Deliverables.`
      );
    } else {
      nextTasks = await updateTaskStatus({
        taskId: task.id,
        status: 'IN_PROGRESS',
        progressPercent: 75,
        note: 'Client Milestone Sync reverted by Engineering Manager.',
      });
      Alert.alert(
        'Milestone Sync Reverted',
        `Task ${task.code} sync status has been un-marked and returned to In Progress.`
      );
    }
    setTasks(nextTasks);
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) {
      Alert.alert('Validation Error', 'Task title cannot be empty.');
      return;
    }
    const selectedEngs = engineers.filter((e) => editAssignedIds.includes(e.id));
    const names = selectedEngs.map((e) => e.name);

    const nextTasks = await editTask({
      taskId: task.id,
      title: editTitle.trim(),
      description: editDesc.trim(),
      priority: editPriority,
      internalDeadline: editInternalDeadline,
      clientDeadline: editClientDeadline,
      assignedToIds: editAssignedIds,
      assignedToNames: names,
    });
    setTasks(nextTasks);
    setIsEditModalVisible(false);
    Alert.alert('Task Updated', `Task ${task.code} details saved successfully.`);
  };

  // Wait for the first AsyncStorage read before rendering anything.
  if (!isDataLoaded) {
    return <View style={[styles.container, { backgroundColor: palette.background }]} />;
  }

  // Tasks list can be empty now (fresh install, nothing created yet) — show a
  // friendly message instead of crashing on a missing task.
  if (!task) {
    return (
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        <HeaderBar
          title="Task Detail"
          subtitle="Task Detail & Audit"
          showBack
          navigation={navigation}
        />
        <View style={styles.notFoundBox}>
          <Text style={{ color: palette.textSecondary, textAlign: 'center' }}>
            This task no longer exists or has not been assigned yet.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <HeaderBar
        title={task?.code || 'Task Detail'}
        subtitle="Task Detail & Audit"
        showBack
        navigation={navigation}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Main Task Card */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
          <View style={styles.codeRow}>
            <Text style={[styles.taskCode, { color: palette.primary }]}>{task?.code}</Text>
            <View style={styles.codeRowRight}>
              <View style={[styles.statusBadge, { backgroundColor: palette.badge }]}>
                <Text style={[styles.statusBadgeText, { color: palette.primary }]}>{task?.status}</Text>
              </View>
              <TouchableOpacity
                style={[styles.editTaskHeaderBtn, { borderColor: palette.primary }]}
                onPress={() => {
                  setEditTitle(task?.title || '');
                  setEditDesc(task?.description || '');
                  setEditPriority(task?.priority || 'MEDIUM');
                  setEditInternalDeadline(task?.internalDeadline || todayStr);
                  setEditClientDeadline(task?.clientDeadline || todayStr);
                  setEditAssignedIds(
                    task?.assignedToIds || (task?.assignedToId ? [task.assignedToId] : [])
                  );
                  setIsEditModalVisible(true);
                }}
                activeOpacity={0.8}
              >
                <Icon name="create" size={13} color={palette.primary} />
                <Text style={[styles.editTaskHeaderBtnText, { color: palette.primary }]}>Edit Task</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={[styles.title, { color: palette.textPrimary }]}>{task?.title}</Text>
          <Text style={[styles.desc, { color: palette.textSecondary }]}>{task?.description}</Text>

          <View style={styles.assigneeRow}>
            <Icon name="person" size={14} color="#64748B" />
            <Text style={[styles.assigneeText, { color: palette.textPrimary }]}>
              Assigned: {task?.assignedToNames ? task.assignedToNames.join(', ') : (task?.assignedToName || 'Unassigned')}
            </Text>
          </View>
        </View>

        {/* 50% / 50% Schedule Risk Analysis */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>
            50% / 50% Dual-Deadline Schedule Risk Analysis
          </Text>

          <View style={styles.riskGrid}>
            <View style={[styles.riskBox, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
              <Text style={styles.riskBoxLabel}>INTERNAL EMPLOYEE DUE</Text>
              <Text style={[styles.riskBoxDate, { color: '#1D4ED8' }]}>{task?.internalDeadline}</Text>
              <Text style={styles.riskBoxSub}>Engineering Target</Text>
            </View>

            <View style={[styles.riskBox, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
              <Text style={[styles.riskBoxLabel, { color: '#92400E' }]}>EXTERNAL CLIENT DUE</Text>
              <Text style={[styles.riskBoxDate, { color: '#B45309' }]}>{task?.clientDeadline}</Text>
              <Text style={styles.riskBoxSub}>Client Contract SLA</Text>
            </View>
          </View>

          <View style={[styles.bufferResultBox, hasConflict ? styles.bufferConflict : styles.bufferSafe]}>
            <Icon
              name={hasConflict ? 'alert-triangle' : 'checkmark-circle'}
              size={18}
              color={hasConflict ? '#DC2626' : '#16A34A'}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.bufferTitle, { color: hasConflict ? '#DC2626' : '#16A34A' }]}>
                {hasConflict ? 'CRITICAL SLACK DEFICIT' : 'SAFETY BUFFER VERIFIED'}
              </Text>
              <Text style={styles.bufferSub}>
                {hasConflict
                  ? `Task will finish ${Math.abs(diffDays)} days AFTER client contractual deadline!`
                  : `Engineering delivery has a ${diffDays}-day safety margin before external client delivery.`}
              </Text>
            </View>
          </View>
        </View>

        {/* Chronological Progress Log */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>
            Chronological Progress Log
          </Text>

          <View style={styles.logList}>
            {(task?.logs || []).map((log, idx) => (
              <View key={idx} style={[styles.logItem, { borderColor: palette.divider }]}>
                <View style={styles.logHeader}>
                  <Text style={[styles.logTime, { color: palette.textSecondary }]}>{log.time}</Text>
                </View>
                <Text style={[styles.logNote, { color: palette.textPrimary }]}>{log.note}</Text>
              </View>
            ))}
          </View>

          {/* Post Manager Note Input */}
          <Text style={[styles.noteInputLabel, { color: palette.textPrimary }]}>Post Manager Note</Text>
          <View style={styles.noteInputRow}>
            <TextInput
              value={managerNote}
              onChangeText={setManagerNote}
              placeholder="Add review feedback or instruction..."
              placeholderTextColor="#94A3B8"
              style={[
                styles.noteInput,
                { backgroundColor: palette.inputBackground, borderColor: palette.inputBorder, color: palette.textPrimary },
              ]}
            />
            <TouchableOpacity
              style={[styles.postBtn, { backgroundColor: palette.primary }]}
              onPress={handlePostNote}
            >
              <Text style={styles.postBtnText}>Post</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Milestone Sync Actions */}
        {task?.isMilestoneSynced ? (
          <View style={styles.syncedContainer}>
            <View style={[styles.syncedBanner, { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }]}>
              <Icon name="checkmark-done" size={20} color="#16A34A" />
              <View style={{ flex: 1 }}>
                <Text style={styles.syncedBannerTitle}>✓ Synced with Client Milestone</Text>
                <Text style={styles.syncedBannerSub}>
                  Task is synchronized with external client deliverable stream.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.revertSyncBtn, { borderColor: '#DC2626', backgroundColor: palette.card }]}
              onPress={handleToggleSyncMilestone}
              activeOpacity={0.85}
            >
              <Icon name="refresh" size={16} color="#DC2626" />
              <Text style={styles.revertSyncBtnText}>Revert Milestone Sync (Unmark)</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.syncBtn, { backgroundColor: palette.primary }]}
            onPress={handleToggleSyncMilestone}
            activeOpacity={0.85}
          >
            <Icon name="checkmark-done" size={18} color="#FFFFFF" />
            <Text style={styles.syncBtnText}>Mark Ready for Client Milestone Sync</Text>
          </TouchableOpacity>
        )}

        {/* Edit Task Modal */}
        <Modal
          visible={isEditModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setIsEditModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: palette.surface, borderColor: palette.cardBorder }]}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={[styles.modalTitle, { color: palette.textPrimary }]}>Edit Task Parameters</Text>
                  <Text style={[styles.modalSubtitle, { color: palette.textSecondary }]}>
                    {task.code} • Update title, deadlines, assignees
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                  <Icon name="close" size={22} color={palette.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                <AppInput
                  label="Task Title *"
                  value={editTitle}
                  onChangeText={setEditTitle}
                />

                <AppInput
                  label="Task Description"
                  value={editDesc}
                  onChangeText={setEditDesc}
                  multiline
                  numberOfLines={2}
                />

                {/* Priority Selection */}
                <Text style={[styles.formLabel, { color: palette.textPrimary, marginTop: 8 }]}>Priority</Text>
                <View style={styles.chipsWrap}>
                  {PRIORITIES.map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.selectChip,
                        { borderColor: palette.cardBorder },
                        editPriority === p && { backgroundColor: palette.primary, borderColor: palette.primary },
                      ]}
                      onPress={() => setEditPriority(p)}
                    >
                      <Text
                        style={[
                          styles.selectChipText,
                          editPriority === p ? { color: '#FFFFFF' } : { color: palette.textPrimary },
                        ]}
                      >
                        {p}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Assignees Selection */}
                <Text style={[styles.formLabel, { color: palette.textPrimary, marginTop: 10 }]}>
                  Assign To Engineers ({editAssignedIds.length} selected)
                </Text>
                <View style={styles.chipsWrap}>
                  {engineers.map((eng) => {
                    const isSelected = editAssignedIds.includes(eng.id);
                    return (
                      <TouchableOpacity
                        key={eng.id}
                        style={[
                          styles.selectChip,
                          { borderColor: palette.cardBorder },
                          isSelected && { backgroundColor: palette.primary, borderColor: palette.primary },
                        ]}
                        onPress={() => {
                          if (isSelected) {
                            if (editAssignedIds.length > 1) {
                              setEditAssignedIds(editAssignedIds.filter((id) => id !== eng.id));
                            }
                          } else {
                            setEditAssignedIds([...editAssignedIds, eng.id]);
                          }
                        }}
                      >
                        {isSelected && <Icon name="checkmark" size={13} color="#FFFFFF" />}
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

                {/* Deadlines with Calendar Picker */}
                <View style={styles.modalDatesRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>Internal Due</Text>
                    <TouchableOpacity
                      style={[styles.dateBtn, { backgroundColor: palette.background, borderColor: palette.inputBorder }]}
                      onPress={() => setCalendarField('internal')}
                    >
                      <Icon name="calendar" size={15} color={palette.primary} />
                      <Text style={[styles.dateBtnText, { color: palette.textPrimary }]}>{editInternalDeadline}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>Client Due</Text>
                    <TouchableOpacity
                      style={[styles.dateBtn, { backgroundColor: palette.background, borderColor: palette.inputBorder }]}
                      onPress={() => setCalendarField('client')}
                    >
                      <Icon name="calendar" size={15} color={palette.primary} />
                      <Text style={[styles.dateBtnText, { color: palette.textPrimary }]}>{editClientDeadline}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  style={[styles.modalCancelBtn, { borderColor: palette.cardBorder }]}
                  onPress={() => setIsEditModalVisible(false)}
                >
                  <Text style={[styles.modalCancelBtnText, { color: palette.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalSaveBtn, { backgroundColor: palette.primary }]}
                  onPress={handleSaveEdit}
                >
                  <Text style={styles.modalSaveBtnText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* DatePickerModal for Task Deadlines */}
        <DatePickerModal
          visible={calendarField !== null}
          onClose={() => setCalendarField(null)}
          initialDate={calendarField === 'internal' ? editInternalDeadline : editClientDeadline}
          title={calendarField === 'internal' ? 'Select Internal Due Date' : 'Select Client Due Date'}
          onSelectDate={(newDate) => {
            if (calendarField === 'internal') {
              setEditInternalDeadline(newDate);
            } else {
              setEditClientDeadline(newDate);
            }
          }}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  notFoundBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  taskCode: {
    fontSize: 13,
    fontWeight: '800',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  desc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  assigneeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  assigneeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  riskGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  riskBox: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  riskBoxLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1D4ED8',
    marginBottom: 4,
  },
  riskBoxDate: {
    fontSize: 14,
    fontWeight: '800',
  },
  riskBoxSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  bufferResultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 10,
  },
  bufferConflict: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#F87171',
  },
  bufferSafe: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  bufferTitle: {
    fontSize: 11,
    fontWeight: '800',
  },
  bufferSub: {
    fontSize: 11,
    color: '#334155',
    marginTop: 1,
  },
  logList: {
    gap: 10,
    marginBottom: 14,
  },
  logItem: {
    borderLeftWidth: 2,
    paddingLeft: 10,
    paddingVertical: 4,
  },
  logHeader: {
    marginBottom: 2,
  },
  logTime: {
    fontSize: 10,
    fontWeight: '600',
  },
  logNote: {
    fontSize: 12,
    lineHeight: 16,
  },
  noteInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  noteInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  noteInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
  },
  postBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
  },
  postBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 14,
    gap: 6,
    marginBottom: 10,
  },
  syncBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  codeRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editTaskHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  editTaskHeaderBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  syncedContainer: {
    gap: 10,
    marginBottom: 10,
  },
  syncedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
  },
  syncedBannerTitle: {
    color: '#16A34A',
    fontSize: 13,
    fontWeight: '800',
  },
  syncedBannerSub: {
    color: '#15803D',
    fontSize: 11,
    marginTop: 2,
  },
  revertSyncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    gap: 6,
  },
  revertSyncBtnText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  selectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  selectChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  modalDatesRow: {
    flexDirection: 'row',
    marginTop: 6,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  dateBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});

export default TaskDetailScreen;
