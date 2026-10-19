import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { approveLeave, rejectLeave, loadLeaves } from '../../services/leaveService';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import storageService, { STORAGE_KEYS } from '../../services/storageService';
import HeaderBar from '../../components/common/HeaderBar';
import Icon from '../../components/common/Icon';

export const TeamLeaveRequestsScreen = ({ navigation }) => {
  const { currentUser } = useAuth();
  const { getRolePalette } = useTheme();
  const palette = getRolePalette('MANAGER');

  const [selectedTab, setSelectedTab] = useState('PENDING');

  // Leaves are NOT in Redux anymore — read them from AsyncStorage on mount and
  // refresh on focus so newly submitted team requests appear here.
  // isDataLoaded waits for that first read so no empty tabs flash meanwhile.
  const [leaves, setLeaves] = useState([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  useEffect(() => {
    const load = async () => {
      setLeaves(await loadLeaves());
      setIsDataLoaded(true);
    };
    load();
    const unsubscribe = navigation.addListener('focus', load);
    return () => unsubscribe();
  }, [navigation]);

  // The team = employees whose reporting line points to this manager.
  const [users, setUsers] = useState([]);
  useEffect(() => {
    (async () => {
      const storedUsers = await storageService.getItem(STORAGE_KEYS.USERS, []);
      setUsers(storedUsers);
    })();
  }, []);

  const teamIds = useMemo(
    () => users.filter((u) => u.managerId === currentUser?.id).map((u) => u.id),
    [users, currentUser]
  );

  // Only leave requests raised by this manager's team are shown here.
  const teamLeaves = useMemo(
    () => leaves.filter((l) => teamIds.includes(l.userId)),
    [leaves, teamIds]
  );

  const countByStatus = (status) => teamLeaves.filter((l) => l.status === status).length;

  const STATUS_TABS = [
    { id: 'PENDING', label: 'Pending Review', count: countByStatus('PENDING') },
    { id: 'APPROVED', label: 'Approved', count: countByStatus('APPROVED') },
    { id: 'REJECTED', label: 'Rejected', count: countByStatus('REJECTED') },
  ];

  // Comment state mapped per leave request
  const [comments, setComments] = useState({});
  const [attemptedSubmitId, setAttemptedSubmitId] = useState(null);

  const filteredLeaves = teamLeaves.filter((l) => l.status === selectedTab);

  const handleApprove = async (leave) => {
    const comment = comments[leave.id] || '';
    if (!comment.trim()) {
      setAttemptedSubmitId(leave.id);
      return;
    }
    const next = await approveLeave({ leaveId: leave.id, comment: comment.trim() });
    setLeaves(next);
    setAttemptedSubmitId(null);
    Alert.alert(
      'Leave Approved',
      `Leave for ${leave.userName} approved. HR salary calculation updated automatically.`
    );
  };

  const handleReject = async (leave) => {
    const comment = comments[leave.id] || '';
    if (!comment.trim()) {
      setAttemptedSubmitId(leave.id);
      return;
    }
    const next = await rejectLeave({ leaveId: leave.id, comment: comment.trim() });
    setLeaves(next);
    setAttemptedSubmitId(null);
    Alert.alert('Leave Rejected', `Leave request for ${leave.userName} rejected.`);
  };

  // Wait for the first AsyncStorage read so the tab counts don't flash as 0.
  if (!isDataLoaded) {
    return <View style={[styles.container, { backgroundColor: palette.background }]} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <HeaderBar
        title="Team Leave Requests & Review"
        subtitle="Engineering Management"
        showBack
        navigation={navigation}
      />

      {/* Status Tabs */}
      <View style={styles.tabsRow}>
        {STATUS_TABS.map((tab) => {
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
                {tab.label} ({tab.count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {filteredLeaves.map((leave) => {
          const comment = comments[leave.id] || '';
          const hasCommentError = attemptedSubmitId === leave.id && !comment.trim();

          return (
            <View
              key={leave.id}
              style={[styles.leaveCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}
            >
              <View style={styles.cardHeaderRow}>
                <View>
                  <Text style={[styles.userName, { color: palette.textPrimary }]}>{leave.userName}</Text>
                  <Text style={[styles.leaveType, { color: palette.primary }]}>{leave.type}</Text>
                </View>
                <View style={[styles.overlapPill, { backgroundColor: '#DCFCE7' }]}>
                  <Icon name="checkmark-circle" size={12} color="#16A34A" />
                  <Text style={styles.overlapText}>
                    {leave.teamOverlapStatus || 'TEAM OVERLAP CHECK: Clear'}
                  </Text>
                </View>
              </View>

              <View style={styles.datesRow}>
                <View style={styles.dateItem}>
                  <Icon name="calendar" size={14} color="#64748B" />
                  <Text style={[styles.dateText, { color: palette.textPrimary }]}>
                    {leave.startDate} → {leave.endDate} ({leave.daysCount} Working Days)
                  </Text>
                </View>
              </View>

              <View style={[styles.reasonBox, { backgroundColor: palette.inputBackground }]}>
                <Text style={[styles.reasonLabel, { color: palette.textSecondary }]}>Employee Reason:</Text>
                <Text style={[styles.reasonText, { color: palette.textPrimary }]}>{leave.reason}</Text>
              </View>

              {leave.status === 'PENDING' ? (
                <View style={styles.reviewSection}>
                  <Text style={[styles.reviewLabel, { color: palette.textPrimary }]}>
                    MANAGER REVIEW COMMENT *
                  </Text>
                  <TextInput
                    value={comment}
                    onChangeText={(txt) => {
                      setComments({ ...comments, [leave.id]: txt });
                      if (attemptedSubmitId === leave.id) setAttemptedSubmitId(null);
                    }}
                    placeholder="e.g. Approved. Sprint backlog covered."
                    placeholderTextColor="#94A3B8"
                    style={[
                      styles.commentInput,
                      { backgroundColor: palette.inputBackground, borderColor: palette.inputBorder, color: palette.textPrimary },
                      hasCommentError && styles.commentInputError,
                    ]}
                  />

                  {/* Syllabus Requirement: Inline validation error alert */}
                  {hasCommentError && (
                    <Text style={styles.errorText}>
                      ! Review comment is required before approving or rejecting
                    </Text>
                  )}

                  <View style={styles.actionButtonsRow}>
                    <TouchableOpacity
                      style={[styles.approveBtn, { backgroundColor: '#16A34A' }]}
                      onPress={() => handleApprove(leave)}
                      activeOpacity={0.85}
                    >
                      <Icon name="checkmark" size={15} color="#FFFFFF" />
                      <Text style={styles.btnText}>✓ Approve Leave</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() => handleReject(leave)}
                      activeOpacity={0.85}
                    >
                      <Icon name="close" size={15} color="#DC2626" />
                      <Text style={styles.rejectBtnText}>✕ Reject Leave</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.decisionNoteBox}>
                  <Text style={styles.decisionNoteLabel}>
                    Decision Recorded ({leave.status}):
                  </Text>
                  <Text style={styles.decisionNoteVal}>
                    {leave.managerReviewComment || 'No comment recorded.'}
                  </Text>
                </View>
              )}
            </View>
          );
        })}

        {filteredLeaves.length === 0 && (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
              {teamIds.length === 0
                ? 'No team members are assigned to you yet.'
                : 'No leave requests in this tab.'}
            </Text>
          </View>
        )}
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
    paddingBottom: 36,
  },
  leaveCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
  },
  leaveType: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  overlapPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  overlapText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16A34A',
  },
  datesRow: {
    marginBottom: 10,
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
  },
  reasonBox: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  reasonLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  reasonText: {
    fontSize: 12,
    lineHeight: 16,
  },
  reviewSection: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  reviewLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  commentInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
  },
  commentInputError: {
    borderColor: '#DC2626',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  rejectBtnText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
  decisionNoteBox: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  decisionNoteLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  decisionNoteVal: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 13,
  },
});

export default TeamLeaveRequestsScreen;
