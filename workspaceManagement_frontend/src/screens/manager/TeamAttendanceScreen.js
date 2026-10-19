import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import storageService, { STORAGE_KEYS } from '../../services/storageService';
import { loadLeaves } from '../../services/leaveService';
import { loadAttendance } from '../../services/attendanceService';
import HeaderBar from '../../components/common/HeaderBar';
import Icon from '../../components/common/Icon';

import DatePickerModal from '../../components/common/DatePickerModal';

export const TeamAttendanceScreen = ({ navigation }) => {
  const { currentUser } = useAuth();
  const { getRolePalette } = useTheme();
  const palette = getRolePalette('MANAGER');

  // Users are loaded from AsyncStorage (Redux no longer stores the user list)
  const [users, setUsers] = useState([]);
  useEffect(() => {
    (async () => {
      const storedUsers = await storageService.getItem(STORAGE_KEYS.USERS, []);
      setUsers(storedUsers);
    })();
  }, []);

  // Punch logs & leaves are NOT in Redux anymore — read them from AsyncStorage
  // on mount and refresh on focus so the "On Leave" / "Absent" sections stay
  // accurate. isDataLoaded waits for that first read so no teammate flashes as
  // absent while the data is still loading.
  const [leaves, setLeaves] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  useEffect(() => {
    const load = async () => {
      setLeaves(await loadLeaves());
      setLogs(await loadAttendance());
      setIsDataLoaded(true);
    };
    load();
    const unsubscribe = navigation.addListener('focus', load);
    return () => unsubscribe();
  }, [navigation]);

  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [calendarVisible, setCalendarVisible] = useState(false);

  // Shift a "YYYY-MM-DD" string by a number of days (for the day stepper).
  const shiftDate = (dateStr, delta) => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + delta);
    return d.toISOString().split('T')[0];
  };

  // The team = employees whose reporting line points to this manager.
  const myTeam = useMemo(() => {
    return users.filter((u) => u.managerId === currentUser?.id);
  }, [users, currentUser]);

  // Real attendance logs for the selected day.
  const dayLogs = useMemo(
    () => logs.filter((l) => l.date === selectedDate),
    [logs, selectedDate]
  );

  const isPresent = (uid) =>
    dayLogs.some(
      (l) => l.userId === uid && (l.status === 'PRESENT' || l.status === 'CORRECTED_PRESENT')
    );

  const isOnLeave = (uid) =>
    leaves.some(
      (l) =>
        l.userId === uid &&
        l.status === 'APPROVED' &&
        selectedDate >= l.startDate &&
        selectedDate <= l.endDate
    );

  const presentTeam = useMemo(() => myTeam.filter((u) => isPresent(u.id)), [myTeam, dayLogs]);
  const onLeaveTeam = useMemo(
    () => myTeam.filter((u) => !isPresent(u.id) && isOnLeave(u.id)),
    [myTeam, dayLogs, leaves]
  );
  const absentTeam = useMemo(
    () => myTeam.filter((u) => !isPresent(u.id) && !isOnLeave(u.id)),
    [myTeam, dayLogs, leaves]
  );

  const filterPills = [
    { id: 'ALL', label: 'All', count: myTeam.length },
    { id: 'PRESENT', label: 'Present', count: presentTeam.length },
    { id: 'LEAVE', label: 'On Leave', count: onLeaveTeam.length },
    { id: 'ABSENT', label: 'Absent', count: absentTeam.length },
  ];

  const sections = useMemo(() => {
    const res = [];
    if ((activeFilter === 'ALL' || activeFilter === 'PRESENT') && presentTeam.length > 0) {
      res.push({
        title: `CHECKED-IN & ACTIVE (${presentTeam.length})`,
        data: presentTeam.map((u) => {
          const log = dayLogs.find((l) => l.userId === u.id);
          return {
            id: u.id,
            name: u.name,
            title: u.title,
            checkIn: log?.checkInTime || 'Checked In',
            status: 'PRESENT',
            distance: log?.distanceMeters != null ? `${log.distanceMeters}m` : '—',
          };
        }),
        accent: '#16A34A',
      });
    }
    if ((activeFilter === 'ALL' || activeFilter === 'LEAVE') && onLeaveTeam.length > 0) {
      res.push({
        title: `ON APPROVED LEAVE (${onLeaveTeam.length})`,
        data: onLeaveTeam.map((u) => ({
          id: u.id,
          name: u.name,
          title: u.title,
          checkIn: 'Approved Leave',
          status: 'ON_LEAVE',
          distance: 'Excused',
        })),
        accent: '#2563EB',
      });
    }
    if ((activeFilter === 'ALL' || activeFilter === 'ABSENT') && absentTeam.length > 0) {
      res.push({
        title: `UNEXCUSED ABSENT (${absentTeam.length})`,
        data: absentTeam.map((u) => ({
          id: u.id,
          name: u.name,
          title: u.title,
          checkIn: 'No Punch Recorded',
          status: 'ABSENT',
          distance: '—',
        })),
        accent: '#DC2626',
      });
    }
    return res;
  }, [presentTeam, onLeaveTeam, absentTeam, dayLogs, activeFilter]);

  const handleExportReport = () => {
    Alert.alert(
      'Export Daily Team Attendance Report',
      `Attendance summary CSV/PDF for ${selectedDate} has been compiled for ${myTeam.length} team member(s).`,
      [{ text: 'OK' }]
    );
  };

  const formattedDisplayDate = useMemo(() => {
    if (selectedDate === todayStr) return 'Today';
    const p = selectedDate.split('-');
    if (p.length === 3) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[parseInt(p[1], 10) - 1]} ${parseInt(p[2], 10)}, ${p[0]}`;
    }
    return selectedDate;
  }, [selectedDate, todayStr]);

  const renderItem = ({ item }) => {
    const pillStyle =
      item.status === 'PRESENT'
        ? styles.pillGreen
        : item.status === 'ABSENT'
        ? styles.pillRed
        : styles.pillBlue;
    const textStyle =
      item.status === 'PRESENT'
        ? styles.textGreen
        : item.status === 'ABSENT'
        ? styles.textRed
        : styles.textBlue;
    const label =
      item.status === 'PRESENT' ? 'PRESENT' : item.status === 'ABSENT' ? 'ABSENT' : 'ON LEAVE';

    return (
      <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
        <View style={styles.cardTop}>
          <View>
            <Text style={[styles.name, { color: palette.textPrimary }]}>{item.name}</Text>
            <Text style={[styles.title, { color: palette.textSecondary }]}>{item.title}</Text>
          </View>
          <View style={[styles.statusPill, pillStyle]}>
            <Text style={[styles.statusText, textStyle]}>{label}</Text>
          </View>
        </View>

        <View style={styles.cardBottom}>
          <View style={styles.metaRow}>
            <Icon name="time" size={13} color="#64748B" />
            <Text style={[styles.metaText, { color: palette.textSecondary }]}>{item.checkIn}</Text>
          </View>
          <View style={styles.metaRow}>
            <Icon name="location" size={13} color="#64748B" />
            <Text style={[styles.metaText, { color: palette.textSecondary }]}>{item.distance}</Text>
          </View>
        </View>
      </View>
    );
  };

  // Wait for the first AsyncStorage read before rendering the day's sections.
  if (!isDataLoaded) {
    return <View style={[styles.container, { backgroundColor: palette.background }]} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <HeaderBar
        title="Assigned Team Attendance"
        subtitle="Engineering Management"
        showBack
        navigation={navigation}
      />

      {/* Date Stepper with Calendar Launcher */}
      <View style={[styles.dateBar, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
        <TouchableOpacity
          onPress={() => setSelectedDate(shiftDate(selectedDate, -1))}
          accessibilityLabel="Previous Day"
        >
          <Text style={styles.stepperArrow}>&lt;</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dateRow}
          onPress={() => setCalendarVisible(true)}
          activeOpacity={0.7}
          accessibilityLabel="Open Calendar Date Picker"
        >
          <Icon name="calendar" size={16} color={palette.primary} />
          <Text style={[styles.dateText, { color: palette.textPrimary }]}>{formattedDisplayDate}</Text>
          <Icon name="chevron-down" size={14} color={palette.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setSelectedDate(shiftDate(selectedDate, 1))}
          accessibilityLabel="Next Day"
        >
          <Text style={styles.stepperArrow}>&gt;</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.todayTag, { backgroundColor: palette.primary }]}
          onPress={() => setSelectedDate(todayStr)}
        >
          <Text style={styles.todayTagText}>Today</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Pills */}
      <View style={styles.filterBar}>
        {filterPills.map((pill) => {
          const isSelected = activeFilter === pill.id;
          return (
            <TouchableOpacity
              key={pill.id}
              style={[
                styles.filterPill,
                isSelected
                  ? { backgroundColor: palette.primary, borderColor: palette.primary }
                  : { backgroundColor: palette.card, borderColor: palette.cardBorder },
              ]}
              onPress={() => setActiveFilter(pill.id)}
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
        title="Filter Team Attendance by Date"
        onSelectDate={(newDate) => setSelectedDate(newDate)}
      />

      {/* SectionList */}
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
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyText, { color: palette.textSecondary }]}>
              {myTeam.length === 0
                ? 'No team members are assigned to you yet.'
                : 'No attendance records for this date.'}
            </Text>
          </View>
        }
      />

      {/* Bottom Export Button */}
      <View style={[styles.bottomBar, { backgroundColor: palette.surface, borderTopColor: palette.cardBorder }]}>
        <TouchableOpacity
          style={[styles.exportBtn, { backgroundColor: palette.primary }]}
          onPress={handleExportReport}
          activeOpacity={0.85}
        >
          <Icon name="document-text" size={16} color="#FFFFFF" />
          <Text style={styles.exportBtnText}>
            Export Daily Team Attendance Report (PDF/CSV)
          </Text>
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
  stepperArrow: {
    fontSize: 18,
    fontWeight: '700',
    color: '#64748B',
    paddingHorizontal: 8,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '700',
  },
  todayTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  todayTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 6,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  sectionHeader: {
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 13,
  },
  card: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
  },
  title: {
    fontSize: 11,
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pillGreen: { backgroundColor: '#DCFCE7' },
  pillBlue: { backgroundColor: '#DBEAFE' },
  pillRed: { backgroundColor: '#FEE2E2' },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  textGreen: { color: '#16A34A' },
  textBlue: { color: '#1D4ED8' },
  textRed: { color: '#DC2626' },
  cardBottom: {
    flexDirection: 'row',
    gap: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    borderTopWidth: 1,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 12,
    gap: 6,
  },
  exportBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});

export default TeamAttendanceScreen;
