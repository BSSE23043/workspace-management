import React, { useState, useEffect, useRef } from 'react';
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
import {
  loadRequirements,
  addClientClarificationReply,
} from '../../services/requirementService';
import HeaderBar from '../../components/common/HeaderBar';
import Icon from '../../components/common/Icon';
// Shared "time ago" label so broadcasts and replies show their real age.
import { timeAgo } from '../../utils/timeAgo';

const FILTER_TABS = ['All', 'In Progress', 'Completed'];

export const MyRequirementsScreen = ({ navigation }) => {
  const { currentUser } = useAuth();
  const { getRolePalette } = useTheme();
  const palette = getRolePalette('CLIENT');

  // Requirements are NOT in Redux anymore — read them from AsyncStorage on
  // mount and refresh on focus, so manager updates show up without a restart.
  const [requirements, setRequirements] = useState([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  useEffect(() => {
    const load = async () => {
      setRequirements(await loadRequirements());
      setIsDataLoaded(true);
    };
    load();
    const unsubscribe = navigation.addListener('focus', load);
    return () => unsubscribe();
  }, [navigation]);

  const [selectedTab, setSelectedTab] = useState('All');
  const scrollViewRef = useRef(null);

  // A requirement is created against one specific client (clientId), so this
  // client only sees the requirements that belong to its own account.
  const clientRequirements = requirements.filter((r) => r.clientId === currentUser?.id);

  // Which requirement is expanded in the big details card. Tapping a card in
  // "Other Requirements & Modules" sets this id; before any tap (or if the
  // selected one disappears) we fall back to the first requirement. This is
  // the same selectedReqId pattern the manager's coordination screen uses.
  const [selectedReqId, setSelectedReqId] = useState(null);
  const featuredReq =
    clientRequirements.find((r) => r.id === selectedReqId) || clientRequirements[0] || null;

  // The rest are listed underneath the featured card.
  const otherReqs = clientRequirements.filter((r) => r.id !== featuredReq?.id);

  // Tapping an "other" requirement makes it the featured one and scrolls back
  // to the top so the client immediately sees its milestones/broadcasts.
  const handleSelectRequirement = (reqId) => {
    setSelectedReqId(reqId);
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
  };

  const [clarificationReply, setClarificationReply] = useState('');

  const handleSendClarification = async () => {
    if (!clarificationReply.trim() || !featuredReq) return;
    // Saves the reply to AsyncStorage and refreshes local state with the
    // saved list (requirementService hands it straight back).
    const nextReqs = await addClientClarificationReply({
      reqId: featuredReq.id,
      author: currentUser?.name || 'Client',
      content: clarificationReply.trim(),
    });
    setRequirements(nextReqs);
    setClarificationReply('');
    Alert.alert('Clarification Sent', 'Your reply has been dispatched to the engineering manager.');
  };

  // Wait for the first AsyncStorage read so the list doesn't flash its empty
  // state while real requirements are still loading.
  if (!isDataLoaded) {
    return <View style={[styles.container, { backgroundColor: palette.background }]} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <HeaderBar
        title="Requirements & Milestones"
        subtitle={`${currentUser?.name || 'Client'} Deliverables`}
        showBack
        navigation={navigation}
      />

      {/* Filter Tabs */}
      <View style={styles.tabsRow}>
        {FILTER_TABS.map((tab) => {
          const isSelected = selectedTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tabBtn,
                isSelected
                  ? { backgroundColor: palette.primary, borderColor: palette.primary }
                  : { backgroundColor: palette.card, borderColor: palette.cardBorder },
              ]}
              onPress={() => setSelectedTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  isSelected ? { color: '#FFFFFF' } : { color: palette.textSecondary },
                ]}
              >
                {tab}
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
        {/* Featured Requirement Card (REQ-098: Mobile Portal Dark Mode & Role Accents) */}
        {featuredReq && (
          <View style={[styles.featuredCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
            <View style={styles.reqHeaderRow}>
              <View>
                <Text style={[styles.reqCode, { color: palette.primary }]}>{featuredReq.code}</Text>
                <Text style={[styles.reqTitle, { color: palette.textPrimary }]}>{featuredReq.title}</Text>
              </View>
              <View style={[styles.statusTag, { backgroundColor: '#FEF3C7' }]}>
                <Text style={styles.statusTagText}>IN PROGRESS</Text>
              </View>
            </View>

            <View style={styles.deadlineRow}>
              <Icon name="calendar" size={13} color="#64748B" />
              <Text style={[styles.deadlineText, { color: palette.textSecondary }]}>
                Contractual Delivery SLA: {featuredReq.contractDeadline}
              </Text>
            </View>

            {/* Milestone Progress Bar */}
            <View style={styles.progressSection}>
              <View style={styles.progressLabelRow}>
                <Text style={[styles.progressLabel, { color: palette.textPrimary }]}>
                  Milestone Progress: {featuredReq.progressPercent}% ({featuredReq.completedMilestones} of {featuredReq.totalMilestones} Completed)
                </Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${featuredReq.progressPercent}%`, backgroundColor: palette.primary }]} />
              </View>
            </View>

            {/* Verified Milestones List */}
            <Text style={[styles.milestonesHeading, { color: palette.textPrimary }]}>
              Verified Milestones Checklist
            </Text>
            <View style={styles.milestonesList}>
              {(featuredReq.milestones || []).map((m) => (
                <View key={m.id} style={[styles.milestoneItem, { borderColor: palette.divider }]}>
                  <View style={[styles.mCheckCircle, m.isCompleted && styles.mCheckCircleDone]}>
                    {m.isCompleted && <Icon name="checkmark" size={12} color="#FFFFFF" />}
                  </View>
                  <Text
                    style={[
                      styles.mTitle,
                      { color: palette.textPrimary },
                      m.isCompleted && styles.mTitleDone,
                    ]}
                  >
                    {m.title}
                  </Text>
                </View>
              ))}
            </View>

            {/* Official Broadcasts from Engineering Management */}
            <Text style={[styles.broadcastHeading, { color: palette.textPrimary }]}>
              Official Broadcasts From Engineering Management
            </Text>
            <View style={styles.broadcastsContainer}>
              {(featuredReq.broadcasts || []).length === 0 ? (
                <Text style={[styles.broadcastEmpty, { color: palette.textSecondary }]}>
                  No broadcasts yet. Updates Engineering Management publishes for this requirement
                  will appear here.
                </Text>
              ) : (
                (featuredReq.broadcasts || []).map((b) => (
                  <View key={b.id} style={[styles.broadcastItem, { backgroundColor: palette.inputBackground }]}>
                    <View style={styles.broadcastItemHeader}>
                      <Text style={[styles.broadcastAuthor, { color: palette.primary }]}>{b.author}</Text>
                      <Text style={styles.broadcastTime}>{timeAgo(b.createdAt)}</Text>
                    </View>
                    <Text style={[styles.broadcastContent, { color: palette.textPrimary }]}>{b.content}</Text>
                  </View>
                ))
              )}
            </View>

            {/* Client Clarification Replies & Reply Input */}
            <Text style={[styles.clarificationHeading, { color: palette.textPrimary }]}>
              Reply to Management Clarification
            </Text>
            {(featuredReq.clarificationReplies || []).map((cr) => (
              <View key={cr.id} style={styles.replyBubble}>
                <View style={styles.replyHeaderRow}>
                  <Text style={styles.replyAuthor}>{cr.author}</Text>
                  <Text style={styles.replyTime}>{timeAgo(cr.createdAt)}</Text>
                </View>
                <Text style={styles.replyContent}>{cr.content}</Text>
              </View>
            ))}

            <View style={styles.replyInputRow}>
              <TextInput
                value={clarificationReply}
                onChangeText={setClarificationReply}
                placeholder="Type your response to engineering..."
                placeholderTextColor="#94A3B8"
                style={[styles.replyInput, { backgroundColor: palette.inputBackground, borderColor: palette.inputBorder, color: palette.textPrimary }]}
              />
              <TouchableOpacity
                style={[styles.sendReplyBtn, { backgroundColor: palette.primary }]}
                onPress={handleSendClarification}
              >
                <Text style={styles.sendReplyText}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Other Requirements List (or empty state) */}
        {clientRequirements.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
            <Icon name="flag" size={16} color={palette.primary} />
            <Text style={[styles.emptyCardText, { color: palette.textSecondary }]}>
              No requirements have been scoped to your organization yet. Engineering Management
              will publish them here as soon as they are created.
            </Text>
          </View>
        ) : (
          <>
            <Text style={[styles.sectionHeading, { color: palette.textPrimary }]}>
              Other Requirements &amp; Modules
            </Text>
            {otherReqs.map((req) => (
              <TouchableOpacity
                key={req.id}
                style={[styles.otherReqCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}
                activeOpacity={0.85}
                onPress={() => handleSelectRequirement(req.id)}
              >
                <View style={styles.otherReqHeader}>
                  <Text style={[styles.otherReqCode, { color: palette.primary }]}>{req.code}</Text>
                  <Text style={[styles.otherReqDue, { color: palette.textSecondary }]}>
                    Due: {req.contractDeadline}
                  </Text>
                </View>
                <Text style={[styles.otherReqTitle, { color: palette.textPrimary }]}>{req.title}</Text>
                <Text style={[styles.otherReqProgress, { color: palette.textSecondary }]}>
                  {req.progressPercent}% Completed • {req.completedMilestones} of {req.totalMilestones} Milestones
                </Text>
                <Text style={[styles.otherReqOpen, { color: palette.primary }]}>
                  Tap to view details →
                </Text>
              </TouchableOpacity>
            ))}
          </>
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
    paddingHorizontal: 14,
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
  reqHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  reqCode: {
    fontSize: 12,
    fontWeight: '800',
  },
  reqTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusTagText: {
    color: '#92400E',
    fontSize: 10,
    fontWeight: '800',
  },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  deadlineText: {
    fontSize: 11,
    fontWeight: '600',
  },
  progressSection: {
    marginBottom: 14,
  },
  progressLabelRow: {
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '700',
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
  milestonesHeading: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  milestonesList: {
    gap: 6,
    marginBottom: 14,
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  mCheckCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mCheckCircleDone: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },
  mTitle: {
    fontSize: 12,
    flex: 1,
  },
  mTitleDone: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  broadcastHeading: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  broadcastsContainer: {
    gap: 8,
    marginBottom: 14,
  },
  broadcastItem: {
    padding: 10,
    borderRadius: 8,
  },
  broadcastItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  broadcastAuthor: {
    fontSize: 11,
    fontWeight: '700',
  },
  broadcastTime: {
    fontSize: 10,
    color: '#94A3B8',
  },
  broadcastContent: {
    fontSize: 12,
    lineHeight: 16,
  },
  // Shown when a requirement has no broadcasts yet (nothing is auto-posted on
  // creation anymore).
  broadcastEmpty: {
    fontSize: 11,
    lineHeight: 17,
  },
  clarificationHeading: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  replyBubble: {
    backgroundColor: '#FEF3C7',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  replyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  replyAuthor: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400E',
  },
  // Timestamp of the client's own reply (same "time ago" format as broadcasts).
  replyTime: {
    fontSize: 10,
    color: '#92400E',
  },
  replyContent: {
    fontSize: 11,
    color: '#78350F',
    marginTop: 1,
  },
  replyInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  replyInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12,
  },
  sendReplyBtn: {
    paddingHorizontal: 14,
    borderRadius: 8,
    justifyContent: 'center',
  },
  sendReplyText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  emptyCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  emptyCardText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  otherReqCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  otherReqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  otherReqCode: {
    fontSize: 11,
    fontWeight: '800',
  },
  otherReqDue: {
    fontSize: 11,
  },
  otherReqTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  otherReqProgress: {
    fontSize: 11,
  },
  // Hint shown on tappable "Other Requirements" cards.
  otherReqOpen: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 8,
  },
});

export default MyRequirementsScreen;
