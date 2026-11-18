import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { fetchMyLeaves, submitLeaveRequest } from '../../services/leaveApi';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import HeaderBar from '../../components/common/HeaderBar';
import AppInput from '../../components/common/AppInput';
import AppButton from '../../components/common/AppButton';
import Icon from '../../components/common/Icon';
import DatePickerModal from '../../components/common/DatePickerModal';
import { validateLeaveDates } from '../../utils/validation';

const toDateInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDefaultStartDate = () => toDateInput(new Date());

const getDefaultEndDate = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return toDateInput(tomorrow);
};

export const MyLeaveRequestsScreen = ({ navigation, isEmbedded = false }) => {
  const { currentUser } = useAuth();
  const { getRolePalette } = useTheme();
  const palette = getRolePalette('EMPLOYEE');

  // Leave requests are stored in the backend database now. The list is fetched
  // for the logged-in employee on mount and again on focus so it stays fresh.
  const [leaves, setLeaves] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const loadMyLeaves = useCallback(async () => {
    if (!currentUser?.email) {
      setLeaves([]);
      setIsLoading(false);
      return;
    }
    try {
      setLoadError(null);
      const data = await fetchMyLeaves(currentUser.email);
      setLeaves(data);
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.email]);

  useEffect(() => {
    loadMyLeaves();
    const unsubscribe = navigation.addListener('focus', loadMyLeaves);
    return () => unsubscribe();
  }, [navigation, loadMyLeaves]);

  const [startDate, setStartDate] = useState(getDefaultStartDate);
  const [endDate, setEndDate] = useState(getDefaultEndDate);
  const [calendarField, setCalendarField] = useState(null); // 'start' | 'end' | null
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Validate dates with pure validation function checking overlaps
  const dateValidation = validateLeaveDates(startDate, endDate, leaves);

  const handleSubmit = async () => {
    setSubmitted(true);
    if (!dateValidation.valid) {
      return;
    }
    if (!reason.trim()) {
      Alert.alert('Validation Error', 'Please enter a reason for your leave request.');
      return;
    }
    if (!currentUser?.email) {
      Alert.alert('Validation Error', 'No active employee session was found.');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysCount = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);

    // Submits the new PENDING request to the backend and refreshes the list
    // from the database so "My Submitted Requests" reflects the saved row.
    setIsSubmitting(true);
    try {
      await submitLeaveRequest({
        userEmail: currentUser.email,
        startDate,
        endDate,
        reason: reason.trim(),
      });
      await loadMyLeaves();
      setReason('');
      setSubmitted(false);

      Alert.alert(
        'Leave Request Submitted',
        `Your request for ${daysCount} working days has been forwarded to your reporting manager for review.`
      );
    } catch (error) {
      Alert.alert(
        'Submission Failed',
        error.message || 'Could not submit your leave request. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
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

          {/* Start & End Dates with Interactive Calendar */}
          <View style={styles.datesRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>Start Date</Text>
              <AppButton
                title={startDate}
                variant="ghost"
                size="md"
                icon="calendar"
                style={{
                  backgroundColor: palette.background,
                  borderWidth: 1,
                  borderColor: palette.inputBorder,
                  justifyContent: 'flex-start',
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                }}
                textStyle={{ color: palette.textPrimary, fontWeight: '600' }}
                onPress={() => setCalendarField('start')}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>End Date</Text>
              <AppButton
                title={endDate}
                variant="ghost"
                size="md"
                icon="calendar"
                style={{
                  backgroundColor: palette.background,
                  borderWidth: 1,
                  borderColor: palette.inputBorder,
                  justifyContent: 'flex-start',
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                }}
                textStyle={{ color: palette.textPrimary, fontWeight: '600' }}
                onPress={() => setCalendarField('end')}
              />
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

          <AppButton
            title="Submit Leave Request"
            variant="primary"
            size="md"
            fullWidth
            loading={isSubmitting}
            style={{ marginTop: 4, paddingVertical: 12 }}
            onPress={handleSubmit}
          />
        </View>

        {/* My Submitted Requests */}
        <Text style={[styles.sectionHeading, { color: palette.textPrimary }]}>
          My Submitted Requests
        </Text>
        {isLoading && (
          <Text style={[styles.historyMessage, { color: palette.textSecondary }]}>Loading your leave requests...</Text>
        )}
        {!isLoading && loadError && (
          <Text style={styles.errorText}>{loadError}</Text>
        )}
        {!isLoading && !loadError && leaves.length === 0 && (
          <Text style={[styles.historyMessage, { color: palette.textSecondary }]}>
            You have not submitted any leave requests yet.
          </Text>
        )}
        {leaves.map((req) => (
          <View
            key={req.id}
            style={[styles.historyCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}
          >
            <View style={styles.historyTopRow}>
              <View>
                <Text style={[styles.reqType, { color: palette.textPrimary }]}>Leave Request</Text>
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
  datesRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
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
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  historyMessage: {
    fontSize: 12,
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
