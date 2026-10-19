import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { loadTickets, createTicket } from '../../services/ticketService';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import HeaderBar from '../../components/common/HeaderBar';
import AppInput from '../../components/common/AppInput';
import Icon from '../../components/common/Icon';
import DatePickerModal from '../../components/common/DatePickerModal';

export const MyHRTicketsScreen = ({ navigation, isEmbedded = false }) => {
  const { currentUser } = useAuth();
  const { getRolePalette } = useTheme();
  const palette = getRolePalette('EMPLOYEE');

  // Tickets live in AsyncStorage — load on demand (mount + every focus) and
  // refresh local state after each create so the history stays current.
  const [tickets, setTickets] = useState([]);
  useEffect(() => {
    const load = async () => {
      setTickets(await loadTickets());
    };
    load();
    const unsubscribe = navigation.addListener('focus', load);
    return () => unsubscribe();
  }, [navigation]);

  const myTickets = tickets.filter((t) => t.userId === currentUser?.id);

  // Simple ticket form: Subject, Body and the date of the event being reported
  const [subject, setSubject] = useState('');
  const [explanation, setExplanation] = useState('');
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleSubmitTicket = async () => {
    if (!subject.trim() || !explanation.trim()) {
      Alert.alert('Validation Error', 'Subject and body are required.');
      return;
    }

    // createTicket writes the new ticket to AsyncStorage and returns the list.
    const next = await createTicket({
      userId: currentUser?.id || '',
      userName: currentUser?.name || '',
      subject: subject.trim(),
      explanation: explanation.trim(),
      date: targetDate,
    });
    setTickets(next);

    Alert.alert(
      'HR Ticket Submitted',
      'Your ticket has been placed into the HR Operations Queue.'
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <HeaderBar
        title="HR Support"
        subtitle="Employee Inquiries"
        showBack
        navigation={navigation}
        isEmbedded={isEmbedded}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* New Ticket Form Card */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>Open Support Ticket</Text>

          <AppInput
            label="Ticket Subject"
            value={subject}
            onChangeText={setSubject}
            placeholder="e.g. Forgot to check out"
          />

          <AppInput
            label="Ticket Body"
            value={explanation}
            onChangeText={setExplanation}
            multiline
            numberOfLines={3}
            placeholder="Describe the event you want to report..."
          />

          {/* Date of the event being reported */}
          <Text style={[styles.fieldLabel, { color: palette.textPrimary }]}>
            Event Date
          </Text>
          <TouchableOpacity
            style={[
              styles.datePickerBtn,
              { backgroundColor: palette.surface, borderColor: palette.inputBorder },
            ]}
            onPress={() => setShowDatePicker(true)}
          >
            <Icon name="calendar" size={16} color={palette.primary} />
            <Text style={[styles.datePickerBtnText, { color: palette.textPrimary }]}>
              {targetDate || 'Select Date from Calendar'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: palette.primary }]}
            onPress={handleSubmitTicket}
            activeOpacity={0.85}
          >
            <Text style={styles.submitBtnText}>Submit HR Ticket</Text>
          </TouchableOpacity>
        </View>

        {/* Ticket History & Logs */}
        <Text style={[styles.sectionHeading, { color: palette.textPrimary }]}>
          Ticket History &amp; Logs
        </Text>
        {myTickets.length === 0 ? (
          <Text style={[styles.emptyHistoryText, { color: palette.textSecondary }]}>
            No tickets submitted yet — new tickets will appear here.
          </Text>
        ) : null}
        {myTickets.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.ticketCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('MyHRTicketDetail', { ticketId: t.id })}
          >
            <View style={styles.ticketTopRow}>
              <Text style={[styles.ticketId, { color: palette.primary }]}>#{t.id}</Text>
              <View
                style={[
                  styles.statusTag,
                  t.status === 'RESOLVED' ? styles.tagResolved : styles.tagOpen,
                ]}
              >
                <Text
                  style={[
                    styles.statusTagText,
                    t.status === 'RESOLVED' ? styles.textResolved : styles.textOpen,
                  ]}
                >
                  {t.status}
                </Text>
              </View>
            </View>

            <Text style={[styles.ticketSubject, { color: palette.textPrimary }]}>{t.subject}</Text>
            <Text style={[styles.ticketDate, { color: palette.textSecondary }]}>{t.date}</Text>
            <Text style={[styles.ticketExpl, { color: palette.textSecondary }]}>{t.explanation}</Text>
            <Text style={[styles.ticketOpenHint, { color: palette.primary }]}>
              View discussion →
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <DatePickerModal
        visible={showDatePicker}
        initialDate={targetDate}
        onSelectDate={(date) => setTargetDate(date)}
        onClose={() => setShowDatePicker(false)}
        title="Select Target Work Date"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 18,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  submitBtn: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  emptyHistoryText: {
    fontSize: 12,
    marginBottom: 10,
  },
  ticketCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  ticketTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  ticketId: {
    fontSize: 12,
    fontWeight: '800',
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
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
  ticketSubject: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  ticketDate: {
    fontSize: 11,
    marginBottom: 2,
  },
  ticketExpl: {
    fontSize: 11,
    lineHeight: 15,
  },
  // Hint that the card opens the full HR discussion thread.
  ticketOpenHint: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  datePickerBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export default MyHRTicketsScreen;
