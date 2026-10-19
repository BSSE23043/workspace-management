import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import Icon from './Icon';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const DatePickerModal = ({
  visible,
  onClose,
  onSelectDate,
  initialDate = new Date().toISOString().split('T')[0],
  title = 'Select Date',
  minDate,
  maxDate,
}) => {
  const { getRolePalette } = useTheme();
  const palette = getRolePalette();

  // Parse initialDate YYYY-MM-DD (fallback = real device date)
  const parseDate = (dStr) => {
    if (!dStr) return new Date();
    const parts = dStr.split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
    return new Date();
  };

  const initialParsed = parseDate(initialDate);
  const [currentYear, setCurrentYear] = useState(initialParsed.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(initialParsed.getMonth()); // 0-11
  const [selectedDay, setSelectedDay] = useState(initialParsed.getDate());

  // Today reference = real device date (was hardcoded to Oct 18, 2026)
  const todayNow = new Date();
  const TODAY_YEAR = todayNow.getFullYear();
  const TODAY_MONTH = todayNow.getMonth();
  const TODAY_DAY = todayNow.getDate();
  const TODAY_BADGE = `${MONTH_NAMES[TODAY_MONTH].slice(0, 3)} ${TODAY_DAY}`;

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleJumpToToday = () => {
    setCurrentYear(TODAY_YEAR);
    setCurrentMonth(TODAY_MONTH);
    setSelectedDay(TODAY_DAY);
  };

  const daysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Get day of week for 1st of month (0 = Sun, 1 = Mon ... 6 = Sat)
  // Convert so Monday = 0, Sunday = 6
  const getFirstDayOffset = (year, month) => {
    const day = new Date(year, month, 1).getDay();
    return (day + 6) % 7;
  };

  const totalDays = daysInMonth(currentYear, currentMonth);
  const firstDayOffset = getFirstDayOffset(currentYear, currentMonth);

  const handleConfirm = () => {
    const mStr = String(currentMonth + 1).padStart(2, '0');
    const dStr = String(selectedDay).padStart(2, '0');
    const formatted = `${currentYear}-${mStr}-${dStr}`;
    onSelectDate(formatted);
    onClose();
  };

  // Build grid items
  const calendarCells = [];
  for (let i = 0; i < firstDayOffset; i++) {
    calendarCells.push({ key: `blank-${i}`, isBlank: true });
  }
  for (let d = 1; d <= totalDays; d++) {
    calendarCells.push({ key: `day-${d}`, day: d, isBlank: false });
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.calendarCard,
            { backgroundColor: palette.surface, borderColor: palette.cardBorder },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={[styles.modalTitle, { color: palette.textPrimary }]}>{title}</Text>
              <Text style={[styles.modalSubtitle, { color: palette.textSecondary }]}>
                Calendar Picker
              </Text>
            </View>
            <TouchableOpacity onPress={handleJumpToToday} style={[styles.todayBadge, { backgroundColor: palette.badge }]}>
              <Text style={[styles.todayBadgeText, { color: palette.primary }]}>Today ({TODAY_BADGE})</Text>
            </TouchableOpacity>
          </View>

          {/* Month / Year Navigator */}
          <View style={[styles.navRow, { backgroundColor: palette.background, borderColor: palette.cardBorder }]}>
            <TouchableOpacity onPress={handlePrevMonth} style={styles.navButton} accessibilityLabel="Previous month">
              <Icon name="arrow-back" size={18} color={palette.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.navMonthYear, { color: palette.textPrimary }]}>
              {MONTH_NAMES[currentMonth]} {currentYear}
            </Text>
            <TouchableOpacity onPress={handleNextMonth} style={styles.navButton} accessibilityLabel="Next month">
              <Icon name="chevron-forward" size={18} color={palette.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Day of Week Row */}
          <View style={styles.weekdaysRow}>
            {DAYS_OF_WEEK.map((dw) => (
              <View key={dw} style={styles.weekdayCell}>
                <Text style={[styles.weekdayText, { color: palette.textSecondary }]}>{dw}</Text>
              </View>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.grid}>
            {calendarCells.map((cell) => {
              if (cell.isBlank) {
                return <View key={cell.key} style={styles.dayCell} />;
              }
              const isSelected = selectedDay === cell.day;
              const isToday =
                currentYear === TODAY_YEAR &&
                currentMonth === TODAY_MONTH &&
                cell.day === TODAY_DAY;

              return (
                <TouchableOpacity
                  key={cell.key}
                  style={[
                    styles.dayCell,
                    isSelected && { backgroundColor: palette.primary, borderRadius: 20 },
                    !isSelected && isToday && { borderWidth: 1.5, borderColor: palette.primary, borderRadius: 20 },
                  ]}
                  onPress={() => setSelectedDay(cell.day)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dayText,
                      { color: isSelected ? '#FFFFFF' : palette.textPrimary },
                      isToday && !isSelected && { color: palette.primary, fontWeight: '700' },
                      isSelected && { fontWeight: '800' },
                    ]}
                  >
                    {cell.day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Selected Date Summary */}
          <View style={[styles.selectedSummary, { backgroundColor: palette.background, borderColor: palette.cardBorder }]}>
            <Icon name="calendar" size={16} color={palette.primary} />
            <Text style={[styles.summaryText, { color: palette.textPrimary }]}>
              Selected:{' '}
              <Text style={{ fontWeight: '700', color: palette.primary }}>
                {MONTH_NAMES[currentMonth]} {selectedDay}, {currentYear}
              </Text>
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: palette.cardBorder }]}
              onPress={onClose}
            >
              <Text style={[styles.cancelBtnText, { color: palette.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: palette.primary }]}
              onPress={handleConfirm}
            >
              <Text style={styles.confirmBtnText}>Apply Date</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  calendarCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  todayBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  todayBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  navButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navMonthYear: {
    fontSize: 15,
    fontWeight: '700',
  },
  weekdaysRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  dayCell: {
    width: '14.28%',
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
  },
  dayText: {
    fontSize: 14,
  },
  selectedSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 13,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default DatePickerModal;
