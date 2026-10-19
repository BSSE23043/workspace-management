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
} from 'react-native';
import { loadTickets, addTicketMessage } from '../../services/ticketService';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import HeaderBar from '../../components/common/HeaderBar';
import Icon from '../../components/common/Icon';
// Shared "time ago" label — same one the requirement broadcasts use.
import { timeAgo } from '../../utils/timeAgo';

// Employee-side detail view for one HR ticket. The discussion thread is built
// exactly like the manager<->client requirement broadcasts: author + "time ago"
// + content per message, with a TextInput + Send row underneath.
export const MyHRTicketDetailScreen = ({ navigation, route }) => {
  const { currentUser } = useAuth();
  const { getRolePalette } = useTheme();
  const palette = getRolePalette('EMPLOYEE');

  const ticketId = route?.params?.ticketId;

  // Tickets are loaded from AsyncStorage on demand (mount + focus), so the
  // thread always shows what was last stored — including HR's replies.
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

  // Employee posts onto the same timeline the HR detail screen renders, so
  // both sides always see one shared discussion. addTicketMessage saves the
  // updated list straight to AsyncStorage.
  const handleSendReply = async () => {
    if (!replyText.trim() || !ticket) return;
    const next = await addTicketMessage({
      ticketId: ticket.id,
      sender: `${currentUser?.name || 'Employee'} (Employee)`,
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
          subtitle="HR Support"
          showBack
          navigation={navigation}
        />
        <View style={styles.emptyStateWrap}>
          <Icon name="ticket" size={28} color="#94A3B8" />
          <Text style={[styles.emptyStateText, { color: palette.textSecondary }]}>
            Ticket not found. It may have been resolved and removed — go back to your ticket log.
          </Text>
        </View>
      </View>
    );
  }

  const statusStyle = (status) => {
    if (status === 'OPEN') return { tag: styles.statusOpen, text: styles.textOpen };
    if (status === 'IN_PROGRESS') return { tag: styles.statusProgress, text: styles.textProgress };
    return { tag: styles.statusResolved, text: styles.textResolved };
  };
  const status = statusStyle(ticket.status);

  // Closed / terminal tickets are read-only: the discussion can still be read,
  // but neither side may add new messages.
  const isClosed = ticket.status === 'RESOLVED' || ticket.status === 'REJECTED';

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: palette.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <HeaderBar
        title={`Ticket #${ticket.id}`}
        subtitle="HR Support"
        showBack
        navigation={navigation}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Ticket Info Card */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
          <View style={styles.topRow}>
            <Text style={[styles.subject, { color: palette.textPrimary }]}>{ticket.subject}</Text>
            <View style={[styles.statusTag, status.tag]}>
              <Text style={[styles.statusTagText, status.text]}>{ticket.status}</Text>
            </View>
          </View>

          <View style={styles.eventDateRow}>
            <Icon name="calendar" size={13} color="#64748B" />
            <Text style={[styles.eventDateText, { color: palette.textSecondary }]}>
              Event Date: {ticket.date}
            </Text>
          </View>

          <View style={[styles.bodyBox, { backgroundColor: palette.inputBackground }]}>
            <Text style={[styles.bodyLabel, { color: palette.textSecondary }]}>Your Message:</Text>
            <Text style={[styles.bodyText, { color: palette.textPrimary }]}>{ticket.explanation}</Text>
          </View>
        </View>

        {/* Discussion With HR (broadcast-style thread) */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>
            Discussion With HR
          </Text>

          {(ticket.timeline || []).length === 0 ? (
            <Text style={[styles.threadEmpty, { color: palette.textSecondary }]}>
              No messages yet. HR replies and your follow-ups on this ticket will appear here.
            </Text>
          ) : (
            (ticket.timeline || []).map((msg, idx) => (
              <View key={idx} style={[styles.threadItem, { backgroundColor: palette.inputBackground }]}>
                <View style={styles.threadItemHeader}>
                  <Text style={[styles.threadAuthor, { color: palette.primary }]}>{msg.sender}</Text>
                  <Text style={styles.threadTime}>{timeAgo(msg.createdAt) || msg.time}</Text>
                </View>
                <Text style={[styles.threadContent, { color: palette.textPrimary }]}>{msg.message}</Text>
              </View>
            ))
          )}

          {/* Reply input — same layout as the requirement broadcast replies.
              Hidden once the ticket is closed. */}
          {isClosed ? (
            <Text style={[styles.closedNote, { color: palette.textSecondary }]}>
              This ticket is closed — the discussion is read-only.
            </Text>
          ) : (
            <View style={styles.replyInputRow}>
              <TextInput
                value={replyText}
                onChangeText={setReplyText}
                placeholder="Reply to HR on this ticket..."
                placeholderTextColor="#94A3B8"
                style={[styles.replyInput, { backgroundColor: palette.inputBackground, borderColor: palette.inputBorder, color: palette.textPrimary }]}
              />
              <TouchableOpacity
                style={[styles.sendReplyBtn, { backgroundColor: palette.primary }]}
                onPress={handleSendReply}
              >
                <Text style={styles.sendReplyText}>Send</Text>
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
    marginBottom: 6,
  },
  subject: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusOpen: { backgroundColor: '#FEF3C7' },
  statusProgress: { backgroundColor: '#DBEAFE' },
  statusResolved: { backgroundColor: '#DCFCE7' },
  statusTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  textOpen: { color: '#B45309' },
  textProgress: { color: '#1D4ED8' },
  textResolved: { color: '#16A34A' },
  eventDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  eventDateText: {
    fontSize: 11,
    fontWeight: '600',
  },
  bodyBox: {
    borderRadius: 8,
    padding: 10,
  },
  bodyLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 18,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  threadEmpty: {
    fontSize: 11,
    lineHeight: 17,
    marginBottom: 8,
  },
  threadItem: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  threadItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  threadAuthor: {
    fontSize: 11,
    fontWeight: '700',
  },
  threadTime: {
    fontSize: 10,
    color: '#94A3B8',
  },
  threadContent: {
    fontSize: 12,
    lineHeight: 16,
  },
  replyInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
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
  // Shown in place of the reply box once the ticket is closed.
  closedNote: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
});

export default MyHRTicketDetailScreen;
