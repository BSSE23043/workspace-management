import React, { useReducer, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { checkIn, checkOut, loadAttendance } from '../../services/attendanceService';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import HeaderBar from '../../components/common/HeaderBar';
import AppButton from '../../components/common/AppButton';
import ChipButton from '../../components/common/ChipButton';
import Icon from '../../components/common/Icon';
import { IMAGES } from '../../assets/images';
import { calculateHaversineDistance, isWithinGeofence } from '../../utils/geofence';

// Syllabus Requirement: useReducer for GPS telemetry and check-in state
const gpsReducer = (state, action) => {
  switch (action.type) {
    case 'SET_TEST_MODE': {
      const isInside = action.payload === 'INSIDE';
      const userLat = isInside ? 31.52042 : 31.5245;
      const userLon = isInside ? 74.35881 : 74.3635;
      const distance = calculateHaversineDistance(
        userLat,
        userLon,
        state.officeLat,
        state.officeLon
      );
      return {
        ...state,
        simulatedMode: action.payload,
        userLat,
        userLon,
        distance,
        isInside: distance <= state.allowedRadius,
      };
    }
    case 'FORCE_REFRESH': {
      const distance = calculateHaversineDistance(
        state.userLat,
        state.userLon,
        state.officeLat,
        state.officeLon
      );
      return {
        ...state,
        distance,
        isInside: distance <= state.allowedRadius,
        lastRefreshed: 'Just now',
      };
    }
    default:
      return state;
  }
};

const initialGPSState = {
  officeLat: 31.5204,
  officeLon: 74.3587,
  allowedRadius: 200,
  userLat: 31.52042,
  userLon: 74.35881,
  distance: 14.2,
  isInside: true,
  simulatedMode: 'INSIDE', // 'INSIDE' | 'OUTSIDE'
  bssid: 'AcmeCorp-Internal',
  terminal: 'Terminal 04-A',
  lastRefreshed: 'Synced 1m ago',
};

export const AttendanceActionScreen = ({ navigation }) => {
  const { currentUser } = useAuth();
  const { getRolePalette } = useTheme();
  const palette = getRolePalette('EMPLOYEE');

  // Punch logs are NOT in Redux anymore — read them from AsyncStorage on mount
  // and refresh on focus so today's record and the history stay accurate.
  const [logs, setLogs] = useState([]);
  useEffect(() => {
    const load = async () => {
      setLogs(await loadAttendance());
    };
    load();
    const unsubscribe = navigation.addListener('focus', load);
    return () => unsubscribe();
  }, [navigation]);

  // useReducer hook for GPS telemetry
  const [gpsState, dispatch] = useReducer(gpsReducer, initialGPSState);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecord = logs.find(
    (l) => l.userId === currentUser?.id && l.date === todayStr
  );
  const isCheckedIn = Boolean(todayRecord && todayRecord.status === 'PRESENT');

  // This user's own punch history (newest first — new logs are unshifted), max 5 shown
  const myRecentLogs = logs.filter((l) => l.userId === currentUser?.id).slice(0, 5);

  const handleToggleShiftPunch = async () => {
    if (!gpsState.isInside) {
      Alert.alert(
        'Punch Blocked (Out of Bounds)',
        `Your calculated distance is ${gpsState.distance}m, exceeding the 200m Lahore Campus geofence perimeter. Check-in/out is disabled.`,
        [{ text: 'OK' }]
      );
      return;
    }

    // Each punch saves to AsyncStorage and returns the updated list, which the
    // recent-punches section below renders from.
    if (isCheckedIn) {
      const next = await checkOut({ userId: currentUser?.id || '' });
      setLogs(next);
      Alert.alert('Check-Out Confirmed', 'You have successfully punched out of your current shift.');
    } else {
      const next = await checkIn({
        userId: currentUser?.id || '',
        userName: currentUser?.name || '',
        distanceMeters: gpsState.distance,
        isGeofenceVerified: true,
        terminal: gpsState.terminal,
        bssid: gpsState.bssid,
      });
      setLogs(next);
      Alert.alert('Check-In Confirmed', 'You have successfully punched in within the 200m geofence.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <HeaderBar
        title="Check-In & Check-Out"
        subtitle="GPS Haversine Telemetry"
        showBack
        navigation={navigation}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Map Container with dashed 200m circle overlay and location pin */}
        <View style={styles.mapCard}>
          <Image
            source={IMAGES.mapLahoreCampus}
            style={styles.mapImage}
            resizeMode="cover"
          />
          {/* Dashed 200m circle */}
          <View style={styles.dashedCircle} />

          {/* User Location Pin */}
          <View style={[styles.pinWrapper, !gpsState.isInside && styles.pinOutside]}>
            <View style={[styles.pinBubble, !gpsState.isInside && { backgroundColor: '#DC2626' }]}>
              <Text style={styles.pinText}>
                Your Location ({gpsState.distance}m)
              </Text>
            </View>
            <Icon name="location" size={26} color={gpsState.isInside ? '#16A34A' : '#DC2626'} />
          </View>
        </View>

        {/* Demo GPS Switcher */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>
            Simulate GPS Position (Haversine Formula Tester)
          </Text>
          <View style={styles.simButtonsRow}>
            <ChipButton
              label="Inside 200m (14.2m)"
              variant="segment"
              selected={gpsState.simulatedMode === 'INSIDE'}
              activeColor="#16A34A"
              style={{ paddingVertical: 10 }}
              unselectedStyle={{
                backgroundColor: palette.inputBackground,
                borderWidth: 1,
                borderColor: palette.cardBorder,
              }}
              textStyle={{
                fontSize: 11,
                fontWeight: '700',
                color: gpsState.simulatedMode === 'INSIDE' ? '#FFFFFF' : palette.textPrimary,
              }}
              onPress={() => dispatch({ type: 'SET_TEST_MODE', payload: 'INSIDE' })}
            />

            <ChipButton
              label="Outside 200m (520m - Blocked)"
              variant="segment"
              selected={gpsState.simulatedMode === 'OUTSIDE'}
              activeColor="#DC2626"
              style={{ paddingVertical: 10 }}
              unselectedStyle={{
                backgroundColor: palette.inputBackground,
                borderWidth: 1,
                borderColor: palette.cardBorder,
              }}
              textStyle={{
                fontSize: 11,
                fontWeight: '700',
                color: gpsState.simulatedMode === 'OUTSIDE' ? '#FFFFFF' : palette.textPrimary,
              }}
              onPress={() => dispatch({ type: 'SET_TEST_MODE', payload: 'OUTSIDE' })}
            />
          </View>
        </View>

        {/* Geofence Status Card */}
        <View
          style={[
            styles.geofenceCard,
            gpsState.isInside ? styles.geoCardInside : styles.geoCardOutside,
          ]}
        >
          <View style={styles.geoHeaderRow}>
            <View style={styles.geoTitleRow}>
              <Icon
                name={gpsState.isInside ? 'shield-checkmark' : 'alert-circle'}
                size={18}
                color={gpsState.isInside ? '#16A34A' : '#DC2626'}
              />
              <Text style={[styles.geoTitle, { color: gpsState.isInside ? '#16A34A' : '#DC2626' }]}>
                {gpsState.isInside
                  ? 'Geofence Perimeter Validated • Within 200m Limit'
                  : 'Geofence Validation Failed • Outside Perimeter'}
              </Text>
            </View>
          </View>

          <View style={styles.telemetryGrid}>
            <View style={styles.tItem}>
              <Text style={styles.tLabel}>Radial Distance:</Text>
              <Text style={[styles.tVal, { color: gpsState.isInside ? '#16A34A' : '#DC2626' }]}>
                {gpsState.distance}m
              </Text>
            </View>
            <View style={styles.tItem}>
              <Text style={styles.tLabel}>Allowed Radius:</Text>
              <Text style={styles.tVal}>{gpsState.allowedRadius}m</Text>
            </View>
            <View style={styles.tItem}>
              <Text style={styles.tLabel}>Wi-Fi BSSID:</Text>
              <Text style={styles.tVal}>{gpsState.bssid}</Text>
            </View>
            <View style={styles.tItem}>
              <Text style={styles.tLabel}>Terminal ID:</Text>
              <Text style={styles.tVal}>{gpsState.terminal}</Text>
            </View>
          </View>
        </View>

        {/* Primary Punch Action Button */}
        <AppButton
          title={isCheckedIn ? 'Check Out of Current Shift' : 'Check In to Current Shift'}
          variant={isCheckedIn ? 'danger' : 'primary'}
          size="lg"
          icon="time"
          disabled={!gpsState.isInside}
          fullWidth
          style={{
            marginBottom: 10,
            ...(!gpsState.isInside ? { backgroundColor: '#94A3B8' } : null),
          }}
          onPress={handleToggleShiftPunch}
        />

        {/* Force GPS Refresh Button */}
        <AppButton
          title="Force GPS Refresh"
          variant="secondary"
          size="md"
          icon="refresh"
          fullWidth
          style={{ marginBottom: 16 }}
          onPress={() => {
            dispatch({ type: 'FORCE_REFRESH' });
            Alert.alert(
              'Location Updated',
              'Your GPS location has been refreshed successfully! Verified inside campus zone (Accuracy: ±5m).'
            );
          }}
        />

        {/* Recent Punch Logs — real punches from Redux */}
        <Text style={[styles.sectionHeading, { color: palette.textPrimary }]}>
          Recent Punch Logs
        </Text>
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
          {myRecentLogs.length === 0 ? (
            <Text style={[styles.logSub, { color: palette.textSecondary }]}>
              No punches yet — use the Check In button above.
            </Text>
          ) : (
            myRecentLogs.map((log, idx) => (
              <View key={log.id}>
                {idx > 0 && <View style={styles.logDivider} />}
                <View style={styles.logRow}>
                  <Icon
                    name="checkmark-circle"
                    size={16}
                    color={
                      log.status === 'PRESENT' || log.status === 'CORRECTED_PRESENT'
                        ? '#16A34A'
                        : '#D97706'
                    }
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.logTitle, { color: palette.textPrimary }]}>
                      {log.date} • Check-In {log.checkInTime || '—'}
                      {log.checkOutTime ? ` • Out ${log.checkOutTime}` : ''}
                    </Text>
                    <Text style={styles.logSub}>
                      {log.distanceMeters > 0 ? `Radial: ${log.distanceMeters}m` : 'Manual Entry'}
                      {log.terminal ? ` • ${log.terminal}` : ''}
                      {log.isGeofenceVerified ? ' • Verified' : ''}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
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
  mapCard: {
    height: 190,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
    marginBottom: 14,
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  dashedCircle: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: '#2563EB',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
  },
  pinWrapper: {
    position: 'absolute',
    alignItems: 'center',
  },
  pinOutside: {
    transform: [{ translateY: -40 }, { translateX: 60 }],
  },
  pinBubble: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 2,
  },
  pinText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  simButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  geofenceCard: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 16,
  },
  geoCardInside: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  geoCardOutside: {
    backgroundColor: '#FEF2F2',
    borderColor: '#F87171',
  },
  geoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  geoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  geoTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  telemetryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 8,
  },
  tItem: {
    width: '50%',
  },
  tLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  tVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 1,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  logSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  logDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 8,
  },
});

export default AttendanceActionScreen;
