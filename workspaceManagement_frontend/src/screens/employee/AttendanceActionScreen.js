import React, { useCallback, useEffect, useReducer, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import {
  fetchAttendanceStatus,
  checkInToShift,
  checkOutOfShift,
} from '../../services/attendanceApi';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import HeaderBar from '../../components/common/HeaderBar';
import AppButton from '../../components/common/AppButton';
import ChipButton from '../../components/common/ChipButton';
import Icon from '../../components/common/Icon';
import { IMAGES } from '../../assets/images';
import { calculateHaversineDistance } from '../../utils/geofence';

// Syllabus Requirement: useReducer for GPS telemetry and check-in state
const gpsReducer = (state, action) => {
  switch (action.type) {
    case 'SET_GEOFENCE': {
      const { officeLat, officeLon, allowedRadius } = action.payload;
      const distance = calculateHaversineDistance(
        state.userLat,
        state.userLon,
        officeLat,
        officeLon
      );
      return {
        ...state,
        officeLat,
        officeLon,
        allowedRadius,
        distance,
        isInside: distance <= allowedRadius,
      };
    }
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

  // useReducer hook for GPS telemetry
  const [gpsState, dispatch] = useReducer(gpsReducer, initialGPSState);

  // Punch status is NOT in Redux anymore — it comes from MySQL (company
  // geofence, shift window and today's punches) and refreshes on focus.
  const [status, setStatus] = useState(null);
  const [isStatusLoading, setIsStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState('');
  const [isPunching, setIsPunching] = useState(false);

  const loadStatus = useCallback(async () => {
    const email = currentUser?.email;
    if (!email) {
      setIsStatusLoading(false);
      return;
    }

    setIsStatusLoading(true);
    setStatusError('');
    try {
      const data = await fetchAttendanceStatus(email);
      setStatus(data);

      if (data?.company?.geofenceLat != null && data?.company?.geofenceLng != null) {
        dispatch({
          type: 'SET_GEOFENCE',
          payload: {
            officeLat: Number(data.company.geofenceLat),
            officeLon: Number(data.company.geofenceLng),
            allowedRadius: Number(data.company.geofenceRadiusM) || 200,
          },
        });
      }
    } catch (error) {
      setStatusError(error.message || 'Unable to load attendance status.');
    } finally {
      setIsStatusLoading(false);
    }
  }, [currentUser?.email]);

  useEffect(() => {
    loadStatus();
    const unsubscribe = navigation.addListener('focus', loadStatus);
    return () => unsubscribe();
  }, [navigation, loadStatus]);

  const todayRecord = status?.today || null;
  const isCheckedIn = Boolean(todayRecord?.checkInTime);
  const isCompleted = Boolean(todayRecord?.checkInTime && todayRecord?.checkOutTime);

  // This user's own punch history (backend already filters by user, newest first)
  const myRecentLogs = (status?.logs || []).slice(0, 5);

  const insideDistance = calculateHaversineDistance(
    31.52042,
    74.35881,
    gpsState.officeLat,
    gpsState.officeLon
  );
  const outsideDistance = calculateHaversineDistance(
    31.5245,
    74.3635,
    gpsState.officeLat,
    gpsState.officeLon
  );

  const handleToggleShiftPunch = async () => {
    if (!gpsState.isInside) {
      Alert.alert(
        'Punch Blocked (Out of Bounds)',
        `Your calculated distance is ${gpsState.distance}m, exceeding the ${gpsState.allowedRadius}m company geofence perimeter. Check-in/out is disabled.`,
        [{ text: 'OK' }]
      );
      return;
    }

    const email = currentUser?.email;
    if (!email) {
      Alert.alert('Punch Failed', 'Your account is missing an email address.');
      return;
    }

    setIsPunching(true);
    try {
      const punch = isCheckedIn ? checkOutOfShift : checkInToShift;
      const data = await punch({
        userEmail: email,
        latitude: gpsState.userLat,
        longitude: gpsState.userLon,
      });
      setStatus(data);
      Alert.alert(
        isCheckedIn ? 'Check-Out Confirmed' : 'Check-In Confirmed',
        isCheckedIn
          ? 'You have successfully punched out of your current shift.'
          : `You have successfully punched in within the ${gpsState.allowedRadius}m geofence.`
      );
    } catch (error) {
      Alert.alert(
        isCheckedIn ? 'Check-Out Failed' : 'Check-In Failed',
        error.message || 'Unable to record attendance right now.'
      );
    } finally {
      setIsPunching(false);
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
        {/* Map Container with dashed geofence circle overlay and location pin */}
        <View style={styles.mapCard}>
          <Image
            source={IMAGES.mapLahoreCampus}
            style={styles.mapImage}
            resizeMode="cover"
          />
          {/* Dashed geofence circle */}
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
              label={`Inside ${gpsState.allowedRadius}m (${insideDistance}m)`}
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
              label={`Outside ${gpsState.allowedRadius}m (${outsideDistance}m - Blocked)`}
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
                  ? `Geofence Perimeter Validated • Within ${gpsState.allowedRadius}m Limit`
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

        {/* Shift Window & Today's Punches */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
          <View style={styles.shiftRow}>
            <Icon name="time" size={16} color={palette.primary} />
            <Text style={[styles.shiftText, { color: palette.textPrimary }]}>
              Shift Window:{' '}
              {status?.schedule
                ? `${status.schedule.startTime} – ${status.schedule.endTime}`
                : status
                  ? 'Not configured'
                  : '—'}
            </Text>
          </View>

          {isStatusLoading && !status ? (
            <Text style={[styles.logSub, { marginTop: 6 }]}>Syncing attendance…</Text>
          ) : (
            <Text style={[styles.logSub, { marginTop: 6 }]}>
              {todayRecord
                ? `Today: In ${todayRecord.checkInTime || '—'} • Out ${todayRecord.checkOutTime || '—'}`
                : 'No punch recorded today.'}
            </Text>
          )}

          {statusError ? (
            <>
              <Text style={[styles.errorText, { marginTop: 8 }]}>{statusError}</Text>
              <AppButton
                title="Retry"
                variant="secondary"
                size="md"
                icon="refresh"
                fullWidth
                style={{ marginTop: 10 }}
                onPress={loadStatus}
              />
            </>
          ) : null}
        </View>

        {/* Primary Punch Action Button */}
        <AppButton
          title={
            isCompleted
              ? 'Attendance Completed for Today'
              : isCheckedIn
                ? 'Check Out of Current Shift'
                : 'Check In to Current Shift'
          }
          variant={isCompleted ? 'soft' : isCheckedIn ? 'danger' : 'primary'}
          size="lg"
          icon={isCompleted ? 'checkmark-circle' : 'time'}
          loading={isPunching}
          disabled={isStatusLoading || Boolean(statusError) || isCompleted}
          fullWidth
          style={{ marginBottom: 10 }}
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
            loadStatus();
            Alert.alert(
              'Location Updated',
              'Your GPS location has been refreshed successfully (Accuracy: ±5m).'
            );
          }}
        />

        {/* Recent Punch Logs — real punches from the backend */}
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
  shiftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shiftText: {
    fontSize: 13,
    fontWeight: '700',
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
  errorText: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '600',
  },
  logDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 8,
  },
});

export default AttendanceActionScreen;
