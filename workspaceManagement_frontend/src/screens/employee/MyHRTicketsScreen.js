import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { fetchMyTickets, createHrTicket } from '../../services/ticketApi';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import HeaderBar from '../../components/common/HeaderBar';
import AppInput from '../../components/common/AppInput';
import AppButton from '../../components/common/AppButton';
import CardButton from '../../components/common/CardButton';
import DatePickerModal from '../../components/common/DatePickerModal';

export const MyHRTicketsScreen = ({ navigation, isEmbedded = false }) => {
  const { currentUser } = useAuth();
  const { getRolePalette } = useTheme();
  const palette = getRolePalette('EMPLOYEE');

  // Tickets are stored in the backend database now. The list is fetched for the
  // logged-in employee on mount and again on focus so it stays fresh.
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const loadMyTickets = useCallback(async () => {
    if (!currentUser?.email) {
      setTickets([]);
      setIsLoading(false);
      return;
    }
    try {
      setLoadError(null);
      const data = await fetchMyTickets(currentUser.email);
      setTickets(data);
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.email]);

  useEffect(() => {
    loadMyTickets();
    const unsubscribe = navigation.addListener('focus', loadMyTickets);
    return () => unsubscribe();
  }, [navigation, loadMyTickets]);

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
    if (!currentUser?.email) {
      Alert.alert('Validation Error', 'No active employee session was found.');
      return;
    }

    // Saves the ticket to the backend, then refreshes the history so the new
    // database row (and its generated TKT-### id) shows up immediately.
    setIsSubmitting(true);
    try {
      await createHrTicket({
        userEmail: currentUser.email,
        subject: subject.trim(),
        description: explanation.trim(),
        eventDate: targetDate,
      });
      await loadMyTickets();
      setSubject('');
      setExplanation('');

      Alert.alert(
        'HR Ticket Submitted',
        'Your ticket has been placed into the HR Operations Queue.'
      );
    } catch (error) {
      Alert.alert(
        'Submission Failed',
        error.message || 'Could not submit your ticket. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
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
          <AppButton
            title={targetDate || 'Select Date from Calendar'}
            variant="ghost"
            size="md"
            icon="calendar"
            style={{
              backgroundColor: palette.surface,
              borderWidth: 1,
              borderColor: palette.inputBorder,
              justifyContent: 'flex-start',
              paddingHorizontal: 12,
              paddingVertical: 10,
              marginBottom: 12,
            }}
            textStyle={{ color: palette.textPrimary, fontWeight: '600' }}
            onPress={() => setShowDatePicker(true)}
          />

          <AppButton
            title="Submit HR Ticket"
            variant="primary"
            size="md"
            fullWidth
            loading={isSubmitting}
            onPress={handleSubmitTicket}
          />
        </View>

        {/* Ticket History & Logs */}
        <Text style={[styles.sectionHeading, { color: palette.textPrimary }]}>
          Ticket History &amp; Logs
        </Text>
        {isLoading ? (
          <Text style={[styles.emptyHistoryText, { color: palette.textSecondary }]}>
            Loading tickets...
          </Text>
        ) : loadError ? (
          <Text style={[styles.emptyHistoryText, { color: '#B91C1C' }]}>
            Could not load tickets: {loadError}
          </Text>
        ) : tickets.length === 0 ? (
          <Text style={[styles.emptyHistoryText, { color: palette.textSecondary }]}>
            No tickets submitted yet — new tickets will appear here.
          </Text>
        ) : null}
        {tickets.map((t) => {
          const statusStyles = getStatusTagStyles(t.status);
          return (
            <CardButton
              key={t.id}
              style={[styles.ticketCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('MyHRTicketDetail', { ticketId: t.id })}
            >
              <View style={styles.ticketTopRow}>
                <Text style={[styles.ticketId, { color: palette.primary }]}>#{t.id}</Text>
                <View style={[styles.statusTag, statusStyles.tag]}>
                  <Text style={[styles.statusTagText, statusStyles.text]}>{t.status}</Text>
                </View>
              </View>

              <Text style={[styles.ticketSubject, { color: palette.textPrimary }]}>{t.subject}</Text>
              <Text style={[styles.ticketDate, { color: palette.textSecondary }]}>{t.date}</Text>
              <Text style={[styles.ticketExpl, { color: palette.textSecondary }]}>{t.explanation}</Text>
              <Text style={[styles.ticketOpenHint, { color: palette.primary }]}>
                View discussion →
              </Text>
            </CardButton>
          );
        })}
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

const getStatusTagStyles = (status) => {
  if (status === 'RESOLVED') return { tag: styles.tagResolved, text: styles.textResolved };
  if (status === 'IN_PROGRESS') return { tag: styles.tagProgress, text: styles.textProgress };
  if (status === 'REJECTED') return { tag: styles.tagRejected, text: styles.textRejected };
  return { tag: styles.tagOpen, text: styles.textOpen };
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
  tagProgress: { backgroundColor: '#DBEAFE' },
  tagResolved: { backgroundColor: '#DCFCE7' },
  tagRejected: { backgroundColor: '#FEE2E2' },
  statusTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  textOpen: { color: '#B45309' },
  textProgress: { color: '#1D4ED8' },
  textResolved: { color: '#16A34A' },
  textRejected: { color: '#B91C1C' },
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
});

export default MyHRTicketsScreen;
