import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import {
  loadTickets,
  resolveTicket,
  addTicketMessage,
  markInProgress,
  reopenTicket,
} from '../../services/ticketService';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import HeaderBar from '../../components/common/HeaderBar';
import Icon from '../../components/common/Icon';
// Shared "time ago" label — same one the requirement broadcasts use.
import { timeAgo } from '../../utils/timeAgo';

export const HRTicketDetailScreen = ({ navigation, route }) => {
  const { currentUser } = useAuth();
  const { getRolePalette } = useTheme();
  const palette = getRolePalette('HR');

  const ticketId = route?.params?.ticketId;

  // Tickets live in AsyncStorage — load on demand (mount + focus). Every
  // handler below saves the mutated list and refreshes local state, so the
  // status, timeline and closed/open UI update immediately.
  const [tickets, setTickets] = useState([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  useEffect(() => {
    const load = async () => {
      setTickets(await loadTickets());
      setIsDataLoaded(true);
    };
    load();
    const unsubscribe = navigation.addListener('focus', load);
    return () => unsubscribe();
  }, [navigation]);

  const ticket = tickets.find((t) => t.id === ticketId);

  const [replyText, setReplyText] = useState('');

  // Closed / terminal tickets are read-only: HR can read the thread but not
  // post new messages until the ticket is reopened.
  const isClosed = ticket?.status === 'RESOLVED' || ticket?.status === 'REJECTED';

  const handleCloseTicket = () => {
    Alert.alert(
      'Resolve & Close Ticket',
      `Close ticket #${ticket.id} (${ticket.subject})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: '✓ Resolve & Close',
          onPress: async () => {
            const next = await resolveTicket({
              ticketId: ticket.id,
              replyMessage: 'Ticket reviewed, resolved and officially closed by HR Operations.',
            });
            setTickets(next);
            Alert.alert('Ticket Closed', `Ticket #${ticket.id} is now closed and marked RESOLVED.`);
          },
        },
      ]
    );
  };

  const handleSetInProgress = async () => {
    const next = await markInProgress({
      ticketId: ticket.id,
      note: 'HR Operations has picked up this ticket. Active investigation with IT/Payroll underway.',
    });
    setTickets(next);
    Alert.alert('Status Updated', `Ticket #${ticket.id} moved to IN_PROGRESS.`);
  };

  const handleReopen = async () => {
    const next = await reopenTicket({
      ticketId: ticket.id,
      note: 'Ticket reopened by HR Operations for follow-up review.',
    });
    setTickets(next);
    Alert.alert('Ticket Reopened', `Ticket #${ticket.id} has been reopened.`);
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !ticket) return;
    const next = await addTicketMessage({
      ticketId: ticket.id,
      sender: `${currentUser?.name || 'HR'} (HR)`,
      message: replyText.trim(),
    });
    setTickets(next);
    setReplyText('');
  };

  if (!isDataLoaded) {
    return <View style={[styles.container, { backgroundColor: palette.background }]} />;
  }

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
        subtitle="HR Ticket"
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

        {/* HR Ticket Lifecycle & Close Controls (Available for every ticket) */}
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
                  <Text style={styles.timelineTime}>{timeAgo(msg.createdAt) || msg.time}</Text>
                </View>
                <Text style={[styles.timelineMessage, { color: palette.textSecondary }]}>{msg.message}</Text>
              </View>
            ))}
          </View>

          {/* Reply input — hidden once the ticket is closed */}
          {isClosed ? (
            <Text style={[styles.closedNote, { color: palette.textSecondary }]}>
              This ticket is closed — the discussion is read-only. Reopen it to post a reply.
            </Text>
          ) : (
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
          )}
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
  // Shown in place of the reply box once the ticket is closed.
  closedNote: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
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
