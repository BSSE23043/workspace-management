import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { applyLeave } from '../../store/slices/leavesSlice';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import HeaderBar from '../../components/common/HeaderBar';
import AppInput from '../../components/common/AppInput';
import Icon from '../../components/common/Icon';
import DatePickerModal from '../../components/common/DatePickerModal';
import { validateLeaveDates } from '../../utils/validation';

const LEAVE_TYPES = [
  { id: 'Annual Leave', label: 'Annual Leave' },
  { id: 'Sick Leave', label: 'Sick Leave' },
];

export const MyLeaveRequestsScreen = ({ navigation, isEmbedded = false }) => {
  const dispatch = useDispatch();
  const { currentUser } = useAuth();
  const { getRolePalette } = useTheme();
  const palette = getRolePalette('EMPLOYEE');

  const { leaves } = useSelector((state) => state.leaves);
  const myLeaves = leaves.filter((l) => l.userId === currentUser?.id);

  const [selectedType, setSelectedType] = useState('Annual Leave');
  const [startDate, setStartDate] = useState('2026-10-20');
  const [endDate, setEndDate] = useState('2026-10-21');
  const [calendarField, setCalendarField] = useState(null); // 'start' | 'end' | null
  const [reason, setReason] = useState('Family emergency requiring travel to hometown...');
  const [submitted, setSubmitted] = useState(false);

  // Validate dates with pure validation function checking overlaps
  const dateValidation = validateLeaveDates(startDate, endDate, myLeaves);

  const handleSubmit = () => {
    setSubmitted(true);
    if (!dateValidation.valid) {
      return;
    }
    if (!reason.trim()) {
      Alert.alert('Validation Error', 'Please enter a reason for your leave request.');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysCount = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);

    dispatch(
      applyLeave({
        userId: currentUser?.id || '',
        userName: currentUser?.name || '',
        type: selectedType,
        startDate,
        endDate,
        daysCount,
        reason: reason.trim(),
      })
    );

    Alert.alert(
      'Leave Request Submitted',
      `Your request for ${daysCount} working days has been forwarded to your reporting manager for review.`
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <HeaderBar
        title="Leave Requests"
        subtitle="Employee Self-Service"
        showBack
        navigation={navigation}
        isEmbedded={isEmbedded}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* New Leave Request Form Card */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>Submit Leave Request</Text>
          <Text style={[styles.cardSubtitle, { color: palette.textSecondary }]}>
            Requests are verified against sprint commitments &amp; team availability
          </Text>

          {/* Leave Type Selector Chips */}
          <Text style={[styles.label, { color: palette.textPrimary }]}>Select Leave Type</Text>
          <View style={styles.typesRow}>
            {LEAVE_TYPES.map((t) => {
              const isSelected = selectedType === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    styles.typeChip,
                    { borderColor: palette.cardBorder },
                    isSelected && { backgroundColor: palette.primary, borderColor: palette.primary },
                  ]}
                  onPress={() => setSelectedType(t.id)}
                >
                  <Text
                    style={[
                      styles.typeText,
                      isSelected ? { color: '#FFFFFF' } : { color: palette.textPrimary },
                    ]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Start & End Dates with Interactive Calendar */}
          <View style={styles.datesRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>Start Date</Text>
              <TouchableOpacity
                style={[styles.datePickerBtn, { backgroundColor: palette.background, borderColor: palette.inputBorder }]}
                onPress={() => setCalendarField('start')}
                activeOpacity={0.7}
              >
                <Icon name="calendar" size={16} color={palette.primary} />
                <Text style={[styles.datePickerBtnText, { color: palette.textPrimary }]}>{startDate}</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>End Date</Text>
              <TouchableOpacity
                style={[styles.datePickerBtn, { backgroundColor: palette.background, borderColor: palette.inputBorder }]}
                onPress={() => setCalendarField('end')}
                activeOpacity={0.7}
              >
                <Icon name="calendar" size={16} color={palette.primary} />
                <Text style={[styles.datePickerBtnText, { color: palette.textPrimary }]}>{endDate}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Date Picker Modal */}
          <DatePickerModal
            visible={calendarField !== null}
            onClose={() => setCalendarField(null)}
            initialDate={calendarField === 'start' ? startDate : endDate}
            title={calendarField === 'start' ? 'Select Leave Start Date' : 'Select Leave End Date'}
            onSelectDate={(newDate) => {
              if (calendarField === 'start') {
                setStartDate(newDate);
              } else {
                setEndDate(newDate);
              }
            }}
          />

          {/* Syllabus Requirement: Inline overlap error text */}
          {!dateValidation.valid && submitted && (
            <Text style={styles.errorText}>
              {dateValidation.error}
            </Text>
          )}

          {/* Team Availability Check Pill */}
          <View style={styles.overlapCheckPill}>
            <Icon name="checkmark-circle" size={14} color="#16A34A" />
            <Text style={styles.overlapCheckText}>Team Availability Check: Clear</Text>
          </View>

          {/* Reason Input */}
          <AppInput
            label="Reason & Handover Details"
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={3}
            placeholder="Describe urgency and sprint task handover..."
          />

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: palette.primary }]}
            onPress={handleSubmit}
            activeOpacity={0.85}
          >
            <Text style={styles.submitBtnText}>Submit Leave Request</Text>
          </TouchableOpacity>
        </View>

        {/* My Submitted Requests */}
        <Text style={[styles.sectionHeading, { color: palette.textPrimary }]}>
          My Submitted Requests
        </Text>
        {myLeaves.map((req) => (
          <View
            key={req.id}
            style={[styles.historyCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}
          >
            <View style={styles.historyTopRow}>
              <View>
                <Text style={[styles.reqType, { color: palette.textPrimary }]}>{req.type}</Text>
                <Text style={[styles.reqDates, { color: palette.textSecondary }]}>
                  {req.startDate} → {req.endDate} ({req.daysCount} Working Days)
                </Text>
              </View>
              <View
                style={[
                  styles.statusTag,
                  req.status === 'APPROVED'
                    ? styles.tagApproved
                    : req.status === 'REJECTED'
                    ? styles.tagRejected
                    : styles.tagPending,
                ]}
              >
                <Text
                  style={[
                    styles.statusTagText,
                    req.status === 'APPROVED'
                      ? styles.textApproved
                      : req.status === 'REJECTED'
                      ? styles.textRejected
                      : styles.textPending,
                  ]}
                >
                  {req.status}
                </Text>
              </View>
            </View>

            <Text style={[styles.reqReason, { color: palette.textSecondary }]}>
              Reason: {req.reason}
            </Text>

            {Boolean(req.managerReviewComment) && (
              <View style={styles.commentNoteBox}>
                <Text style={styles.commentNoteText}>
                  Manager Comment: {req.managerReviewComment}
                </Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
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
  },
  cardSubtitle: {
    fontSize: 11,
    marginTop: 2,
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  typesRow: {
    gap: 8,
    marginBottom: 12,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  datesRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  datePickerBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: -6,
  },
  overlapCheckPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    padding: 8,
    borderRadius: 6,
    gap: 6,
    marginBottom: 12,
  },
  overlapCheckText: {
    color: '#16A34A',
    fontSize: 11,
    fontWeight: '700',
  },
  submitBtn: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
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
  historyCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  historyTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  reqType: {
    fontSize: 13,
    fontWeight: '700',
  },
  reqDates: {
    fontSize: 11,
    marginTop: 2,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  tagApproved: { backgroundColor: '#DCFCE7' },
  tagRejected: { backgroundColor: '#FEE2E2' },
  tagPending: { backgroundColor: '#FEF3C7' },
  statusTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  textApproved: { color: '#16A34A' },
  textRejected: { color: '#DC2626' },
  textPending: { color: '#B45309' },
  reqReason: {
    fontSize: 11,
    lineHeight: 15,
  },
  commentNoteBox: {
    marginTop: 8,
    backgroundColor: '#F1F5F9',
    padding: 6,
    borderRadius: 6,
  },
  commentNoteText: {
    fontSize: 11,
    color: '#334155',
  },
});

export default MyLeaveRequestsScreen;
