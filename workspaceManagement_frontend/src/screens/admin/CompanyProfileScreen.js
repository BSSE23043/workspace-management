import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  Modal,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../context/AuthContext';
import { loadCompanyProfile, saveCompanyProfile } from '../../services/companyService';
import HeaderBar from '../../components/common/HeaderBar';
import AppInput from '../../components/common/AppInput';
import AppButton from '../../components/common/AppButton';
import ChipButton from '../../components/common/ChipButton';
import CardButton from '../../components/common/CardButton';
import IconButton from '../../components/common/IconButton';
import Icon from '../../components/common/Icon';
import { IMAGES } from '../../assets/images';

const ALL_DAYS = [
  { key: 'M', label: 'Mon' },
  { key: 'T1', label: 'Tue' },
  { key: 'W', label: 'Wed' },
  { key: 'T2', label: 'Thu' },
  { key: 'F', label: 'Fri' },
  { key: 'S1', label: 'Sat' },
  { key: 'S2', label: 'Sun' },
];

export const CompanyProfileScreen = ({ navigation }) => {
  const { getRolePalette, isDark } = useTheme();
  const { currentUser } = useAuth();
  const palette = getRolePalette('ADMIN');

  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [mainCampus, setMainCampus] = useState('');
  const [timezone, setTimezone] = useState('');
  const [workingDays, setWorkingDays] = useState(['M', 'T1', 'W', 'T2', 'F']);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [radius, setRadius] = useState('');

  const [workingDaysPerMonth, setWorkingDaysPerMonth] = useState('22');
  const [absenceDeduction, setAbsenceDeduction] = useState('5000');

  // Load the company profile from the MySQL backend once on mount
  useEffect(() => {
    (async () => {
      const company = await loadCompanyProfile(currentUser?.companyId);
      setName(company.name || '');
      setMainCampus(company.mainCampus || '');
      setTimezone(company.timezone || '');
      if (Array.isArray(company.workingDays) && company.workingDays.length > 0) {
        setWorkingDays(company.workingDays);
      }
      setLatitude(String(company.latitude));
      setLongitude(String(company.longitude));
      setRadius(String(company.geofenceRadiusMeters));
      setWorkingDaysPerMonth(String(company.standardWorkingDaysPerMonth || 22));
      setAbsenceDeduction(String(company.defaultAbsenceDeduction || 5000));
    })();
  }, [currentUser?.companyId]);

  const toggleDay = (dayKey) => {
    if (workingDays.includes(dayKey)) {
      setWorkingDays(workingDays.filter((d) => d !== dayKey));
    } else {
      setWorkingDays([...workingDays, dayKey]);
    }
  };

  const handleSave = async () => {
    const payload = {
      name: name.trim(),
      mainCampus: mainCampus.trim(),
      timezone: timezone.trim(),
      workingDays,
      latitude: parseFloat(latitude) || 31.5204,
      longitude: parseFloat(longitude) || 74.3587,
      geofenceRadiusMeters: parseInt(radius, 10) || 200,
      standardWorkingDaysPerMonth: parseInt(workingDaysPerMonth, 10) || 22,
      defaultAbsenceDeduction: parseInt(absenceDeduction, 10) || 5000,
    };
    try {
      await saveCompanyProfile(currentUser?.companyId, payload);
      Alert.alert(
        'Configuration Saved',
        'Company profile and main campus geofence policy updated.'
      );
    } catch (err) {
      Alert.alert(
        'Save Failed',
        err.message || 'Could not save company profile to database.'
      );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <HeaderBar
        title="Company Profile & Geofence Policy"
        showBack
        navigation={navigation}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Company Profile Card */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>
            Company Profile & Operational Schedule
          </Text>
          <Text style={[styles.cardSubtitle, { color: palette.textSecondary }]}>
            Base identity and business operating cycle
          </Text>

          <AppInput
            label="Company Name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Your Company Name"
          />

          <AppInput
            label="System Operating Timezone"
            value={timezone}
            onChangeText={setTimezone}
            placeholder="Asia/Karachi (GMT+05:00)"
          />

          {/* Active Working Days row with flexWrap: 'wrap' */}
          <Text style={[styles.inputLabel, { color: palette.textPrimary }]}>
            Active Working Days (Shift Schedule)
          </Text>
          <View style={styles.daysRow}>
            {ALL_DAYS.map((d) => {
              const active = workingDays.includes(d.key);
              return (
                <ChipButton
                  key={d.key}
                  label={d.label}
                  variant="day"
                  selected={active}
                  unselectedStyle={{ backgroundColor: palette.inputBackground }}
                  onPress={() => toggleDay(d.key)}
                />
              );
            })}
          </View>
        </View>

        {/* Main Campus Location & Geofence Perimeter */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>
            Main Campus Location & Geofence Perimeter
          </Text>
          <Text style={[styles.cardSubtitle, { color: palette.textSecondary }]}>
            Single headquarters location & geofence radius configuration
          </Text>

          <AppInput
            label="Main Campus Name / Location"
            value={mainCampus}
            onChangeText={setMainCampus}
            placeholder="e.g. Main Campus — Lahore HQ"
          />

          {/* Map Preview Container with dashed radius circle and pin */}
          <CardButton
            style={styles.mapContainer}
            onPress={() => setMapModalVisible(true)}
            activeOpacity={0.9}
            accessibilityLabel="Open Fullscreen Interactive Map Picker"
          >
            <Image
              source={IMAGES.mapLahoreCampus}
              style={styles.mapImage}
              resizeMode="cover"
            />
            {/* Dashed 200m circle overlay */}
            <View style={styles.dashedGeofenceCircle} />
            {/* Centered Main Campus Pin */}
            <View style={styles.mapPinContainer}>
              <View style={styles.pinBubble}>
                <Text style={styles.pinBubbleText}>{mainCampus.trim() || 'Main Campus HQ'}</Text>
              </View>
              <Icon name="location" size={26} color="#DC2626" />
            </View>
            <View style={styles.tapToEditBadge}>
              <Icon name="map" size={14} color="#FFFFFF" />
              <Text style={styles.tapToEditText}>Tap to Open Interactive Map</Text>
            </View>
          </CardButton>

          {/* Open Map Button */}
          <AppButton
            title="Open Interactive Map Location Picker"
            variant="primary"
            size="md"
            icon="map"
            style={{ marginBottom: 12 }}
            onPress={() => setMapModalVisible(true)}
          />

          <View style={styles.coordsRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <AppInput
                label="Latitude"
                value={latitude}
                onChangeText={setLatitude}
                keyboardType="numeric"
                placeholder="31.5204"
              />
            </View>
            <View style={{ flex: 1 }}>
              <AppInput
                label="Longitude"
                value={longitude}
                onChangeText={setLongitude}
                keyboardType="numeric"
                placeholder="74.3587"
              />
            </View>
          </View>

          <AppInput
            label="Geofence Radius (Meters)"
            value={radius}
            onChangeText={setRadius}
            keyboardType="numeric"
            placeholder="200"
            helperText="Employees must be within this main campus radius to register attendance check-ins."
          />
        </View>

        {/* Interactive Map Picker Modal */}
        <Modal
          visible={mapModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setMapModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: palette.surface, borderColor: palette.cardBorder }]}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={[styles.modalTitle, { color: palette.textPrimary }]}>
                    Main Campus Geofence Map Picker
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: palette.textSecondary }]}>
                    Tap anywhere on the map to set main campus geofence coordinates
                  </Text>
                </View>
                <IconButton
                  icon="close"
                  size={22}
                  color={palette.textSecondary}
                  variant="plain"
                  onPress={() => setMapModalVisible(false)}
                  accessibilityLabel="Close map picker"
                />
              </View>

              {/* Interactive Visual Map Area with Tap Detector */}
              <CardButton
                style={styles.interactiveMapBox}
                activeOpacity={0.95}
                accessibilityLabel="Tap map to reposition geofence"
                onPress={(evt) => {
                  const { locationX, locationY } = evt.nativeEvent;
                  // Map relative touch coordinates into subtle coordinate adjustments
                  const deltaLat = ((locationY - 110) / 110) * 0.005;
                  const deltaLng = ((locationX - 150) / 150) * 0.005;
                  const newLat = (31.5204 - deltaLat).toFixed(4);
                  const newLng = (74.3587 + deltaLng).toFixed(4);
                  setLatitude(String(newLat));
                  setLongitude(String(newLng));
                }}
              >
                <Image
                  source={IMAGES.mapLahoreCampus}
                  style={styles.modalMapImage}
                  resizeMode="cover"
                />
                <View style={styles.modalGeofenceCircle} />
                <View style={styles.modalCenterPin}>
                  <View style={styles.pinBubble}>
                    <Text style={styles.pinBubbleText}>{mainCampus.trim() || 'Main Campus Center'}</Text>
                  </View>
                  <Icon name="location" size={32} color="#DC2626" />
                </View>
                <View style={styles.mapHintBadge}>
                  <Text style={styles.mapHintText}>📍 Tap map to reposition pin coordinates</Text>
                </View>
              </CardButton>

              {/* Current Active Pin Readout */}
              <View style={[styles.coordBanner, { backgroundColor: palette.background, borderColor: palette.cardBorder }]}>
                <View style={styles.coordCol}>
                  <Text style={styles.coordLabel}>LATITUDE</Text>
                  <Text style={[styles.coordVal, { color: palette.primary }]}>{latitude}</Text>
                </View>
                <View style={styles.coordCol}>
                  <Text style={styles.coordLabel}>LONGITUDE</Text>
                  <Text style={[styles.coordVal, { color: palette.primary }]}>{longitude}</Text>
                </View>
                <View style={styles.coordCol}>
                  <Text style={styles.coordLabel}>RADIUS</Text>
                  <Text style={[styles.coordVal, { color: palette.primary }]}>{radius}m</Text>
                </View>
              </View>

              {/* Apply Button */}
              <AppButton
                title="Apply Selected Map Coordinates"
                variant="primary"
                size="md"
                icon="checkmark-circle"
                fullWidth
                onPress={() => {
                  setMapModalVisible(false);
                  Alert.alert('Map Location Applied', `Main campus coordinates updated to (${latitude}, ${longitude}) with ${radius}m geofence.`);
                }}
              />
            </View>
          </View>
        </Modal>

        {/* Default Salary & Deduction Policy */}
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>
            Default Salary & Deduction Policy
          </Text>
          <Text style={[styles.cardSubtitle, { color: palette.textSecondary }]}>
            Standard payroll values used across HR calculators
          </Text>

          <AppInput
            label="Standard Working Days / Month"
            value={workingDaysPerMonth}
            onChangeText={setWorkingDaysPerMonth}
            keyboardType="numeric"
            placeholder="22"
          />

          <AppInput
            label="Default Absence Deduction (PKR / Day)"
            value={absenceDeduction}
            onChangeText={setAbsenceDeduction}
            keyboardType="numeric"
            placeholder="5000"
          />
        </View>

        {/* Save Configuration Button */}
        <AppButton
          title="Save Configuration"
          variant="primary"
          size="lg"
          fullWidth
          onPress={handleSave}
        />
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
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 18,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  daysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  mapContainer: {
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
    marginBottom: 16,
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  dashedGeofenceCircle: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 2,
    borderColor: '#2563EB',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
  },
  mapPinContainer: {
    position: 'absolute',
    alignItems: 'center',
  },
  pinBubble: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 2,
  },
  pinBubbleText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  tapToEditBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tapToEditText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  coordsRow: {
    flexDirection: 'row',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 11,
    marginTop: 2,
    maxWidth: 300,
  },
  interactiveMapBox: {
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#CBD5E1',
    marginBottom: 12,
  },
  modalMapImage: {
    width: '100%',
    height: '100%',
  },
  modalGeofenceCircle: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: '#2563EB',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
  },
  modalCenterPin: {
    position: 'absolute',
    alignItems: 'center',
  },
  mapHintBadge: {
    position: 'absolute',
    bottom: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  mapHintText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  coordBanner: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  coordCol: {
    alignItems: 'center',
  },
  coordLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
  },
  coordVal: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
});

export default CompanyProfileScreen;
