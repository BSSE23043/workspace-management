import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { createTicket } from '../../store/slices/ticketsSlice';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import HeaderBar from '../../components/common/HeaderBar';
import AppInput from '../../components/common/AppInput';
import Icon from '../../components/common/Icon';
import DatePickerModal from '../../components/common/DatePickerModal';

const CATEGORIES = ['Attendance Correction', 'Salary Issue', 'General Inquiry'];

export const MyHRTicketsScreen = ({ navigation, isEmbedded = false }) => {
  const dispatch = useDispatch();
  const { currentUser } = useAuth();
  const { getRolePalette } = useTheme();
  const palette = getRolePalette('EMPLOYEE');

  const { tickets } = useSelector((state) => state.tickets);
  const myTickets = tickets.filter((t) => t.userId === currentUser?.id);

  const [category, setCategory] = useState('Attendance Correction');
  const [subject, setSubject] = useState('');
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [requestedIn, setRequestedIn] = useState('');
  const [requestedOut, setRequestedOut] = useState('');
  const [explanation, setExplanation] = useState('');

  const isAttendanceCorrection = category === 'Attendance Correction';

  const handleSubmitTicket = () => {
    if (!subject.trim() || !explanation.trim()) {
      Alert.alert('Validation Error', 'Subject and explanation are required.');
      return;
    }

    dispatch(
      createTicket({
        userId: currentUser?.id || '',
        userName: currentUser?.name || '',
        category,
        subject: subject.trim(),
        explanation: explanation.trim(),
        date: targetDate,
        requestedIn: isAttendanceCorrection ? requestedIn.trim() : '',
        requestedOut: isAttendanceCorrection ? requestedOut.trim() : '',
        proposedAdjustment:
          isAttendanceCorrection && requestedOut.trim()
            ? `Out ${requestedOut.trim()} / Full Shift`
            : null,
      })
    );

    Alert.alert(
      'HR Ticket Submitted',
      'Your ticket has been placed into the HR Operations Queue.'
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <HeaderBar
        title="HR Support & Attendance Override"
        subtitle="Employee Inquiries"
        showBack
        navigation={navigation}
        isEmbedded={isEmbedded}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* New Ticket Form Card */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>Open Support Ticket</Text>

          {/* Category Chips */}
          <Text style={[styles.label, { color: palette.textPrimary }]}>Category</Text>
          <View style={styles.chipsRow}>
            {CATEGORIES.map((cat) => {
              const isSelected = category === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.chip,
                    { borderColor: palette.cardBorder },
                    isSelected && { backgroundColor: palette.primary, borderColor: palette.primary },
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      isSelected ? { color: '#FFFFFF' } : { color: palette.textPrimary },
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Conditional Attendance Correction Details Sub-Card */}
          {isAttendanceCorrection && (
            <View style={[styles.overrideSubCard, { backgroundColor: palette.inputBackground, borderColor: palette.cardBorder }]}>
              <View style={styles.overrideHeaderRow}>
                <Icon name="time" size={15} color={palette.primary} />
                <Text style={[styles.overrideSubTitle, { color: palette.textPrimary }]}>
                  Attendance Correction Details
                </Text>
              </View>

              <Text style={[styles.fieldLabel, { color: palette.textPrimary }]}>
                Target Work Date
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

              <View style={styles.timeRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <AppInput
                    label="Requested Check-In"
                    value={requestedIn}
                    onChangeText={setRequestedIn}
                    placeholder="09:00 AM"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <AppInput
                    label="Requested Check-Out"
                    value={requestedOut}
                    onChangeText={setRequestedOut}
                    placeholder="05:00 PM"
                  />
                </View>
              </View>
            </View>
          )}

          <AppInput
            label="Ticket Subject"
            value={subject}
            onChangeText={setSubject}
            placeholder="e.g. Forgot to check out"
          />

          <AppInput
            label="Detailed Explanation"
            value={explanation}
            onChangeText={setExplanation}
            multiline
            numberOfLines={3}
            placeholder="Provide context on why punch was missed or discrepancy occurred..."
          />

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
          <View
            key={t.id}
            style={[styles.ticketCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}
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
            <Text style={[styles.ticketExpl, { color: palette.textSecondary }]}>{t.explanation}</Text>

            {Boolean(t.proposedAdjustment) && (
              <View style={styles.overrideSyncBox}>
                <Text style={styles.overrideSyncText}>
                  Override Adjustment: {t.proposedAdjustment}
                </Text>
              </View>
            )}
          </View>
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
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  overrideSubCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  overrideHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  overrideSubTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  timeRow: {
    flexDirection: 'row',
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
  ticketExpl: {
    fontSize: 11,
    lineHeight: 15,
  },
  overrideSyncBox: {
    marginTop: 8,
    backgroundColor: '#F0FDFA',
    padding: 6,
    borderRadius: 6,
  },
  overrideSyncText: {
    fontSize: 11,
    color: '#0F766E',
    fontWeight: '600',
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
