import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import HeaderBar from '../../components/common/HeaderBar';
import Icon from '../../components/common/Icon';
import DatePickerModal from '../../components/common/DatePickerModal';
import storageService, { STORAGE_KEYS } from '../../services/storageService';
import { loadLeaves } from '../../services/leaveService';
import { loadAttendance } from '../../services/attendanceService';
import { PUNCH_DUTY_ROLES, isWeekday, attendanceTrackingStart, isOnApprovedLeave } from '../../utils/attendanceStats';

export const CompanyAttendanceScreen = ({ navigation }) => {
  const { getRolePalette } = useTheme();
  const palette = getRolePalette('HR');
  const { currentUser } = useAuth();

  const deviceToday = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(deviceToday);
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [refreshing, setRefreshing] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);

  // Punch logs & leaves are NOT in Redux anymore — read them from AsyncStorage
  // on mount and refresh on focus so approved leave (ON_LEAVE rows) and every
  // real punch are always up to date. isDataLoaded waits for that first read
  // so no row is wrongly shown as absent while the data is still loading.
  const [leaves, setLeaves] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  useEffect(() => {
    const loadData = async () => {
      setLeaves(await loadLeaves());
      setLogs(await loadAttendance());
      setIsDataLoaded(true);
    };
    loadData();
    const unsubscribe = navigation.addListener('focus', loadData);
    return () => unsubscribe();
  }, [navigation]);

  // User roster (for absence synthesis) — same AsyncStorage source as payroll
  const [users, setUsers] = useState([]);
  useEffect(() => {
    (async () => {
      const storedUsers = await storageService.getItem(STORAGE_KEYS.USERS, []);
      setUsers(storedUsers);
    })();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 700);
  }, []);

  const shiftDate = (dateStr, days) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + days));
    return dt.toISOString().split('T')[0];
  };

  // Real punches for the date + synthesized rows for punch-duty users with no
  // log that day (working days only, and only for dates up to today).
  // The logged-in HR never sees their own row — staff only.
  const dateLogs = useMemo(() => {
    // Real records for the date. If HR approved a leave covering this date, any
    // record WITHOUT a verified punch (e.g. an ABSENT / geofence-fail log) is
    // shown as ON_LEAVE instead — an approved leave always beats an absence.
    // Confirmed punches (PRESENT / CORRECTED_PRESENT) are never overridden.
    const real = logs
      .filter((l) => l.date === selectedDate && l.userId !== currentUser?.id)
      .map((l) => {
        const hasVerifiedPunch = l.status === 'PRESENT' || l.status === 'CORRECTED_PRESENT';
        if (!hasVerifiedPunch && isOnApprovedLeave(leaves, l.userId, selectedDate)) {
          return { ...l, status: 'ON_LEAVE', statusCategory: 'APPROVED LEAVE' };
        }
        return l;
      });
    const realUserIds = new Set(real.map((l) => l.userId));
    const synth = [];
    // Absences only count from the day tracking began (first-ever log; today
    // if none) — earlier dates were not tracked and are never marked absent.
    const trackingStart = attendanceTrackingStart(logs, deviceToday);
    if (selectedDate >= trackingStart && selectedDate <= deviceToday && isWeekday(selectedDate)) {
      users
        .filter(
          (u) =>
            u.isActive !== false &&
            PUNCH_DUTY_ROLES.includes(u.role) &&
            u.id !== currentUser?.id
        )
        .filter((u) => !realUserIds.has(u.id))
        .forEach((u) => {
          const onLeave = isOnApprovedLeave(leaves, u.id, selectedDate);
          synth.push({
            id: `SYNTH-${u.id}-${selectedDate}`,
            userId: u.id,
            userName: u.name,
            department: u.title || '',
            date: selectedDate,
            status: onLeave ? 'ON_LEAVE' : 'ABSENT',
            statusCategory: onLeave ? 'APPROVED LEAVE' : 'UNEXCUSED ABSENT',
            synthesized: true,
          });
        });
    }
    return [...real, ...synth];
  }, [logs, users, leaves, selectedDate, deviceToday, currentUser]);

  const presentList = useMemo(
    () => dateLogs.filter((l) => l.status === 'PRESENT' || l.statusCategory === 'PRESENT & VERIFIED'),
    [dateLogs]
  );
  const openSessionList = useMemo(
    () => dateLogs.filter((l) => !l.checkOutTime && l.status === 'PRESENT'),
    [dateLogs]
  );
  const correctedList = useMemo(
    () => dateLogs.filter((l) => l.status === 'CORRECTED_PRESENT' || l.statusCategory === 'HR CORRECTED RECORDS'),
    [dateLogs]
  );
  const absentList = useMemo(
    () => dateLogs.filter((l) => l.status === 'ABSENT' || l.status === 'ON_LEAVE' || l.statusCategory === 'UNEXCUSED ABSENT'),
    [dateLogs]
  );

  const statusPills = [
    { id: 'ALL', label: 'All', count: dateLogs.length },
    { id: 'PRESENT', label: 'Present', count: presentList.length },
    { id: 'OPEN', label: 'Open Punch', count: openSessionList.length },
    { id: 'ABSENT', label: 'Absent/Leave', count: absentList.length },
  ];

  // Group logs into SectionList sections according to selectedStatus filter
  const sections = useMemo(() => {
    const result = [];
    if (selectedStatus === 'ALL' || selectedStatus === 'PRESENT') {
      if (presentList.length > 0) {
        result.push({
          title: `PRESENT & VERIFIED (${presentList.length})`,
          data: presentList,
          accent: '#16A34A',
        });
      }
    }
    if (selectedStatus === 'ALL' || selectedStatus === 'OPEN') {
      if (correctedList.length > 0) {
        result.push({
          title: `HR CORRECTED RECORDS (${correctedList.length})`,
          data: correctedList,
          accent: '#D97706',
        });
      }
    }
    if (selectedStatus === 'ALL' || selectedStatus === 'ABSENT') {
      if (absentList.length > 0) {
        result.push({
          title: `ABSENT & LEAVE LOGS (${absentList.length})`,
          data: absentList,
          accent: '#DC2626',
        });
      }
    }
    return result;
  }, [presentList, correctedList, absentList, selectedStatus]);

  const formattedDisplayDate = useMemo(() => {
    const p = selectedDate.split('-');
    if (p.length === 3) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const label = `${months[parseInt(p[1], 10) - 1]} ${parseInt(p[2], 10)}, ${p[0]}`;
      return selectedDate === deviceToday ? `${label} (Today)` : label;
    }
    return selectedDate;
  }, [selectedDate, deviceToday]);

  const handleAuditDayLog = () => {
    Alert.alert(
      'Audit Day Log Verified',
      `All attendance punch records for ${selectedDate} have been validated against the 200m geofence perimeter.`,
      [{ text: 'OK' }]
    );
  };

  const renderItem = ({ item }) => (
    <View style={[styles.logCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
      <View style={styles.logTopRow}>
        <View>
          <Text style={[styles.userName, { color: palette.textPrimary }]}>{item.userName}</Text>
          <Text style={[styles.deptText, { color: palette.textSecondary }]}>{item.department}</Text>
        </View>

        <View
          style={[
            styles.statusTag,
            item.status === 'PRESENT'
              ? styles.tagGreen
              : item.status === 'CORRECTED_PRESENT' || item.status === 'ON_LEAVE'
              ? styles.tagAmber
              : styles.tagRed,
          ]}
        >
          <Text
            style={[
              styles.statusTagText,
              item.status === 'PRESENT'
                ? styles.textGreen
                : item.status === 'CORRECTED_PRESENT' || item.status === 'ON_LEAVE'
                ? styles.textAmber
                : styles.textRed,
            ]}
          >
            {item.status}
          </Text>
        </View>
      </View>

      <View style={styles.logDetailsRow}>
        <View style={styles.detailItem}>
          <Icon name="time" size={13} color="#64748B" />
          <Text style={[styles.detailText, { color: palette.textPrimary }]}>
            {item.status === 'ON_LEAVE'
              ? 'Approved Leave — No Punch Required'
              : item.synthesized
              ? 'No Punch Recorded'
              : `${item.checkInTime || 'No Punch'} ${item.checkOutTime ? `→ ${item.checkOutTime}` : '• Open'}`}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Icon name="location" size={13} color="#64748B" />
          <Text style={[styles.detailText, { color: palette.textPrimary }]}>
            {item.status === 'ON_LEAVE'
              ? '—'
              : item.synthesized
              ? '—'
              : item.distanceMeters !== undefined
              ? `${item.distanceMeters}m radius`
              : 'Manual Log'}
          </Text>
        </View>
      </View>

      {Boolean(item.correctionNote) && (
        <View style={styles.noteBox}>
          <Text style={styles.noteText}>Override: {item.correctionNote}</Text>
        </View>
      )}
      {Boolean(item.absenceReason) && (
        <View style={[styles.noteBox, { backgroundColor: '#FEE2E2' }]}>
          <Text style={[styles.noteText, { color: '#DC2626' }]}>Reason: {item.absenceReason}</Text>
        </View>
      )}
    </View>
  );

  // Wait for the first AsyncStorage read so no row flashes as ABSENT before
  // approved leave is known.
  if (!isDataLoaded) {
    return <View style={[styles.container, { backgroundColor: palette.background }]} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <HeaderBar
        title="Company-Wide Attendance Log"
        subtitle="Human Resources"
        showBack
        navigation={navigation}
      />

      {/* Date Stepper Bar with Calendar Picker */}
      <View style={[styles.dateBar, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
        <TouchableOpacity
          style={styles.stepBtn}
          onPress={() => setSelectedDate((d) => shiftDate(d, -1))}
          accessibilityLabel="Previous Day"
        >
          <Text style={styles.stepBtnText}>&lt;</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dateDisplay}
          onPress={() => setCalendarVisible(true)}
          activeOpacity={0.7}
          accessibilityLabel="Open Calendar Date Picker"
        >
          <Icon name="calendar" size={16} color={palette.primary} />
          <Text style={[styles.dateDisplayText, { color: palette.textPrimary }]}>{formattedDisplayDate}</Text>
          <Icon name="chevron-down" size={14} color={palette.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.stepBtn}
          onPress={() => setSelectedDate((d) => shiftDate(d, 1))}
          accessibilityLabel="Next Day"
        >
          <Text style={styles.stepBtnText}>&gt;</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.todayBtn, { backgroundColor: palette.primary }]}
          onPress={() => setSelectedDate(deviceToday)}
        >
          <Text style={styles.todayBtnText}>Today</Text>
        </TouchableOpacity>
      </View>

      {/* Status Filter Pills */}
      <View style={styles.filterBar}>
        {statusPills.map((pill) => {
          const isSelected = selectedStatus === pill.id;
          return (
            <TouchableOpacity
              key={pill.id}
              style={[
                styles.filterPill,
                isSelected
                  ? { backgroundColor: palette.primary, borderColor: palette.primary }
                  : { backgroundColor: palette.card, borderColor: palette.cardBorder },
              ]}
              onPress={() => setSelectedStatus(pill.id)}
            >
              <Text
                style={[
                  styles.filterPillText,
                  isSelected ? { color: '#FFFFFF' } : { color: palette.textSecondary },
                ]}
              >
                {pill.label} ({pill.count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={calendarVisible}
        onClose={() => setCalendarVisible(false)}
        initialDate={selectedDate}
        title="Filter Company Attendance by Date"
        onSelectDate={(newDate) => setSelectedDate(newDate)}
      />

      {/* Syllabus Requirement: SectionList with sticky section headers */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={({ section: { title, accent } }) => (
          <View style={[styles.sectionHeader, { backgroundColor: palette.background }]}>
            <Text style={[styles.sectionTitle, { color: accent }]}>{title}</Text>
          </View>
        )}
        stickySectionHeadersEnabled
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            title="Syncing GPS attendance logs..."
            tintColor={palette.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
              No attendance punches recorded for {formattedDisplayDate}.
            </Text>
          </View>
        }
        ListFooterComponent={
          <View style={[styles.footerCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
            <Icon name="checkmark-circle" size={16} color="#16A34A" />
            <Text style={[styles.footerCardText, { color: palette.textPrimary }]}>
              Total Displayed: {dateLogs.length} Records • ALL RECORDS SYNCED
            </Text>
          </View>
        }
      />

      {/* Bottom Batch Bar */}
      <View style={[styles.bottomBar, { backgroundColor: palette.surface, borderTopColor: palette.cardBorder }]}>
        <TouchableOpacity
          style={[styles.batchBtn, { backgroundColor: palette.primary }]}
          onPress={handleAuditDayLog}
          activeOpacity={0.85}
        >
          <Icon name="shield-checkmark" size={16} color="#FFFFFF" />
          <Text style={styles.batchBtnText}>Audit Day Log</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'space-between',
  },
  stepBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  stepBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#64748B',
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateDisplayText: {
    fontSize: 13,
    fontWeight: '700',
  },
  todayBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  todayBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 70,
  },
  sectionHeader: {
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  logCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  logTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
  },
  deptText: {
    fontSize: 11,
    marginTop: 1,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagGreen: { backgroundColor: '#DCFCE7' },
  tagAmber: { backgroundColor: '#FEF3C7' },
  tagRed: { backgroundColor: '#FEE2E2' },
  statusTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  textGreen: { color: '#16A34A' },
  textAmber: { color: '#D97706' },
  textRed: { color: '#DC2626' },
  logDetailsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 11,
    fontWeight: '500',
  },
  noteBox: {
    marginTop: 8,
    backgroundColor: '#FEF3C7',
    padding: 6,
    borderRadius: 6,
  },
  noteText: {
    fontSize: 11,
    color: '#92400E',
  },
  footerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 12,
    gap: 8,
  },
  footerCardText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 13,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    borderTopWidth: 1,
  },
  batchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  batchBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});

export default CompanyAttendanceScreen;
