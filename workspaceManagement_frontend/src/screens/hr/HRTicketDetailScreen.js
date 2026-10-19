import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import {
  resolveTicket,
  rejectTicket,
  addTicketMessage,
  markInProgress,
  reopenTicket,
} from '../../store/slices/ticketsSlice';
import { overrideAttendance } from '../../store/slices/attendanceSlice';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import HeaderBar from '../../components/common/HeaderBar';
import Icon from '../../components/common/Icon';
import { IMAGES } from '../../assets/images';

export const HRTicketDetailScreen = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const { currentUser } = useAuth();
  const { getRolePalette } = useTheme();
  const palette = getRolePalette('HR');

  const ticketId = route?.params?.ticketId;
  const { tickets } = useSelector((state) => state.tickets);
  const ticket = tickets.find((t) => t.id === ticketId);

  const [replyText, setReplyText] = useState('');

  const isOverrideType = ticket?.category === 'Attendance Correction';

  const handleCloseTicket = () => {
    Alert.alert(
      'Resolve & Close Ticket',
      `Close ticket #${ticket.id} (${ticket.subject})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: '✓ Resolve & Close',
          onPress: () => {
            dispatch(
              resolveTicket({
                ticketId: ticket.id,
                replyMessage: 'Ticket reviewed, resolved and officially closed by HR Operations.',
              })
            );
            Alert.alert('Ticket Closed', `Ticket #${ticket.id} is now closed and marked RESOLVED.`);
          },
        },
      ]
    );
  };

  const handleSetInProgress = () => {
    dispatch(
      markInProgress({
        ticketId: ticket.id,
        note: 'HR Operations has picked up this ticket. Active investigation with IT/Payroll underway.',
      })
    );
    Alert.alert('Status Updated', `Ticket #${ticket.id} moved to IN_PROGRESS.`);
  };

  const handleReopen = () => {
    dispatch(
      reopenTicket({
        ticketId: ticket.id,
        note: 'Ticket reopened by HR Operations for follow-up review.',
      })
    );
    Alert.alert('Ticket Reopened', `Ticket #${ticket.id} has been reopened.`);
  };

  const handleApproveOverride = () => {
    Alert.alert(
      'Confirm Attendance Override',
      `Approve physical sign-out adjustment for ${ticket.userName}? This will automatically recalculate salary and mark attendance as CORRECTED_PRESENT.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: '✓ Approve & Override',
          onPress: () => {
            // 1. Resolve ticket
            dispatch(
              resolveTicket({
                ticketId: ticket.id,
                replyMessage: 'Attendance override approved by HR Operations based on attached security sign-out proof.',
              })
            );
            // 2. Dispatch attendanceSlice override
            dispatch(
              overrideAttendance({
                userId: ticket.userId,
                userName: ticket.userName,
                date: ticket.date,
                checkInTime: ticket.requestedIn || '09:00 AM',
                checkOutTime: ticket.requestedOut || '05:00 PM',
                note: `HR Corrected via #${ticket.id} (Physical sign-in override)`,
              })
            );

            Alert.alert(
              'Override Approved',
              `Attendance log for ${ticket.userName} updated to CORRECTED_PRESENT. Salary deductions recalculated to 0.`,
              [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
          },
        },
      ]
    );
  };

  const handleRejectOverride = () => {
    Alert.alert('Reject Ticket', `Reject override request #${ticket.id}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject Request',
        style: 'destructive',
        onPress: () => {
          dispatch(
            rejectTicket({
              ticketId: ticket.id,
              replyMessage: 'Override request rejected by HR Operations due to insufficient documentation.',
            })
          );
          Alert.alert('Ticket Rejected', 'Ticket status updated to REJECTED.', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
        },
      },
    ]);
  };

  const handleSendReply = () => {
    if (!replyText.trim()) return;
    dispatch(
      addTicketMessage({
        ticketId: ticket.id,
        sender: `${currentUser?.name || 'HR'} (HR)`,
        message: replyText.trim(),
      })
    );
    setReplyText('');
  };

  if (!ticket) {
    return (
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        <HeaderBar
          title="HR Ticket"
          subtitle="Human Resources"
          showBack
          navigation={navigation}
        />
        <View style={styles.emptyStateWrap}>
          <Icon name="ticket" size={28} color="#94A3B8" />
          <Text style={[styles.emptyStateText, { color: palette.textSecondary }]}>
            Ticket not found. It may have been removed — go back to the ticket queue.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: palette.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <HeaderBar
        title={`Ticket #${ticket?.id}`}
        subtitle={ticket?.category || 'HR Ticket'}
        showBack
        navigation={navigation}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Ticket Header Card */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
          <View style={styles.topRow}>
            <View>
              <Text style={[styles.subject, { color: palette.textPrimary }]}>{ticket?.subject}</Text>
              <Text style={[styles.employeeSub, { color: palette.textSecondary }]}>
                Submitted by {ticket?.userName} ({ticket?.userId}) • {ticket?.date}
              </Text>
            </View>
            <View style={[styles.statusTag, ticket?.status === 'OPEN' ? styles.tagOpen : styles.tagResolved]}>
              <Text style={[styles.statusTagText, ticket?.status === 'OPEN' ? styles.textOpen : styles.textResolved]}>
                {ticket?.status}
              </Text>
            </View>
          </View>

          <View style={[styles.explanationBox, { backgroundColor: palette.inputBackground }]}>
            <Text style={[styles.explanationLabel, { color: palette.textSecondary }]}>Employee Explanation:</Text>
            <Text style={[styles.explanationText, { color: palette.textPrimary }]}>{ticket?.explanation}</Text>
          </View>
        </View>

        {/* Linked Attendance Override Comparison Card */}
        {isOverrideType && (
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
            <View style={styles.cardHeaderRow}>
              <Icon name="time" size={16} color={palette.primary} />
              <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>
                Linked Attendance Override Comparison
              </Text>
            </View>

            <View style={styles.comparisonGrid}>
              <View style={[styles.comparisonBox, styles.currentBox]}>
                <Text style={styles.comparisonLabel}>Current System Log</Text>
                <Text style={styles.comparisonValue}>{ticket?.currentSystemLog || '—'}</Text>
              </View>

              <View style={[styles.comparisonBox, styles.proposedBox]}>
                <Text style={[styles.comparisonLabel, { color: '#0F766E' }]}>Proposed Adjustment</Text>
                <Text style={[styles.comparisonValue, { color: '#0F766E' }]}>
                  {ticket?.proposedAdjustment || '—'}
                </Text>
              </View>
            </View>

            {/* Attached Evidence Preview */}
            {Boolean(ticket?.evidenceName) && (
              <View>
                <Text style={[styles.evidenceLabel, { color: palette.textPrimary }]}>
                  Attached Evidence — {ticket.evidenceName}
                </Text>
                {Boolean(ticket?.evidenceImageKey) && IMAGES[ticket.evidenceImageKey] ? (
                  <View style={styles.evidenceContainer}>
                    <Image
                      source={IMAGES[ticket.evidenceImageKey]}
                      style={styles.evidenceImage}
                      resizeMode="cover"
                    />
                    <View style={styles.evidenceOverlay}>
                      <Icon name="document-text" size={14} color="#FFFFFF" />
                      <Text style={styles.evidenceFilename}>{ticket.evidenceName}</Text>
                    </View>
                  </View>
                ) : null}
              </View>
            )}

            {/* Override Action Buttons */}
            {ticket?.status === 'OPEN' && (
              <View style={styles.overrideActionsRow}>
                <TouchableOpacity
                  style={[styles.approveBtn, { backgroundColor: palette.primary }]}
                  onPress={handleApproveOverride}
                  activeOpacity={0.85}
                >
                  <Icon name="checkmark-circle" size={16} color="#FFFFFF" />
                  <Text style={styles.approveBtnText}>✓ Approve & Override Attendance</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.rejectBtn}
                  onPress={handleRejectOverride}
                  activeOpacity={0.85}
                >
                  <Icon name="close-circle" size={16} color="#DC2626" />
                  <Text style={styles.rejectBtnText}>Reject Override Request</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* HR Ticket Lifecycle & Close Controls (Available for all ticket categories) */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>
            HR Ticket Lifecycle & Resolution Controls
          </Text>
          <Text style={[styles.lifecycleSub, { color: palette.textSecondary }]}>
            Current State: {ticket?.status === 'OPEN' ? 'OPEN (Pending HR Action)' : ticket?.status === 'IN_PROGRESS' ? 'IN PROGRESS (Under Active Investigation)' : 'RESOLVED (Ticket Closed)'}
          </Text>

          {ticket?.status === 'OPEN' && (
            <View style={styles.lifecycleBtnRow}>
              <TouchableOpacity
                style={[styles.inProgressBtn, { borderColor: palette.primary, backgroundColor: palette.background }]}
                onPress={handleSetInProgress}
                activeOpacity={0.8}
              >
                <Icon name="time" size={15} color={palette.primary} />
                <Text style={[styles.inProgressBtnText, { color: palette.primary }]}>Move to In-Progress</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.closeTicketBtn, { backgroundColor: '#16A34A' }]}
                onPress={handleCloseTicket}
                activeOpacity={0.85}
              >
                <Icon name="checkmark-circle" size={15} color="#FFFFFF" />
                <Text style={styles.closeTicketBtnText}>Resolve & Close Ticket</Text>
              </TouchableOpacity>
            </View>
          )}

          {ticket?.status === 'IN_PROGRESS' && (
            <View style={styles.lifecycleBtnRow}>
              <TouchableOpacity
                style={[styles.closeTicketBtn, { backgroundColor: '#16A34A', flex: 1 }]}
                onPress={handleCloseTicket}
                activeOpacity={0.85}
              >
                <Icon name="checkmark-circle" size={15} color="#FFFFFF" />
                <Text style={styles.closeTicketBtnText}>Resolve & Close Ticket</Text>
              </TouchableOpacity>
            </View>
          )}

          {ticket?.status === 'RESOLVED' && (
            <View style={styles.resolvedInfoBox}>
              <View style={styles.resolvedBadgeRow}>
                <Icon name="checkmark-circle" size={18} color="#16A34A" />
                <Text style={styles.resolvedBadgeText}>Ticket is Resolved & Closed</Text>
              </View>
              <TouchableOpacity
                style={[styles.reopenBtn, { borderColor: palette.primary, backgroundColor: palette.background }]}
                onPress={handleReopen}
                activeOpacity={0.8}
              >
                <Icon name="refresh" size={14} color={palette.primary} />
                <Text style={[styles.reopenBtnText, { color: palette.primary }]}>Reopen Ticket</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Audit & Discussion Timeline (Syllabus topic 3: flex column-reverse/timeline) */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>
            Audit & Discussion Timeline
          </Text>

          <View style={styles.timelineList}>
            {(ticket?.timeline || []).map((msg, idx) => (
              <View key={idx} style={[styles.timelineItem, { borderColor: palette.divider }]}>
                <View style={styles.timelineHeader}>
                  <Text style={[styles.timelineSender, { color: palette.textPrimary }]}>{msg.sender}</Text>
                  <Text style={styles.timelineTime}>{msg.time}</Text>
                </View>
                <Text style={[styles.timelineMessage, { color: palette.textSecondary }]}>{msg.message}</Text>
              </View>
            ))}
          </View>

          {/* Reply input */}
          <View style={styles.replyRow}>
            <TextInput
              value={replyText}
              onChangeText={setReplyText}
              placeholder="Post an official note or reply..."
              placeholderTextColor="#94A3B8"
              style={[styles.replyInput, { backgroundColor: palette.inputBackground, borderColor: palette.inputBorder, color: palette.textPrimary }]}
            />
            <TouchableOpacity
              style={[styles.sendReplyBtn, { backgroundColor: palette.primary }]}
              onPress={handleSendReply}
            >
              <Text style={styles.sendReplyText}>Reply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyStateWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 10,
  },
  emptyStateText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
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
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  subject: {
    fontSize: 16,
    fontWeight: '700',
  },
  employeeSub: {
    fontSize: 11,
    marginTop: 2,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  tagOpen: { backgroundColor: '#FEF3C7' },
  tagResolved: { backgroundColor: '#DCFCE7' },
  statusTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  textOpen: { color: '#B45309' },
  textResolved: { color: '#16A34A' },
  explanationBox: {
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
  },
  explanationLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  explanationText: {
    fontSize: 13,
    lineHeight: 18,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  comparisonGrid: {
    gap: 8,
    marginBottom: 14,
  },
  comparisonBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  currentBox: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  proposedBox: {
    backgroundColor: '#F0FDFA',
    borderColor: '#99F6E4',
  },
  comparisonLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
    textTransform: 'uppercase',
  },
  comparisonValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#DC2626',
    marginTop: 2,
  },
  evidenceLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  evidenceContainer: {
    height: 160,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 14,
    backgroundColor: '#E2E8F0',
  },
  evidenceImage: {
    width: '100%',
    height: '100%',
  },
  evidenceOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  evidenceFilename: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  overrideActionsRow: {
    gap: 10,
  },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 12,
    gap: 6,
  },
  approveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  rejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 10,
    gap: 6,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  rejectBtnText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
  timelineList: {
    gap: 10,
    marginTop: 10,
    marginBottom: 14,
  },
  timelineItem: {
    borderLeftWidth: 2,
    paddingLeft: 10,
    paddingVertical: 4,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  timelineSender: {
    fontSize: 12,
    fontWeight: '700',
  },
  timelineTime: {
    fontSize: 10,
    color: '#94A3B8',
  },
  timelineMessage: {
    fontSize: 12,
    lineHeight: 16,
  },
  replyRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  replyInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  sendReplyBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  sendReplyText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  lifecycleSub: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 12,
  },
  lifecycleBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inProgressBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  inProgressBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  closeTicketBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 8,
    gap: 6,
  },
  closeTicketBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  resolvedInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: '#DCFCE7',
    borderRadius: 8,
  },
  resolvedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resolvedBadgeText: {
    color: '#16A34A',
    fontSize: 12,
    fontWeight: '700',
  },
  reopenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  reopenBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
});

export default HRTicketDetailScreen;
