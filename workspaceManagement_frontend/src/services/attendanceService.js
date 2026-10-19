import storageService, { STORAGE_KEYS } from './storageService';

// ---------------------------------------------------------------------------
// ATTENDANCE SERVICE — punch logs are NO LONGER stored in Redux.
//
// AsyncStorage (@wms_attendance) is the single source of truth. Every screen
// that needs punch logs calls loadAttendance() when it mounts (and again on
// focus), and each mutation below does the same three steps the old
// attendanceSlice reducers did, but against the stored list:
//
//   1. read the current list from AsyncStorage
//   2. apply the change (same logic the old slice had)
//   3. write the list back and return it
//
// So a screen only ever writes two lines:
//
//   const next = await checkIn({ ... });
//   setLogs(next);
//
// Punching in/out (and HR overrides) therefore saves straight to AsyncStorage
// and survives app reloads (the old Redux copy was session-only).
// ---------------------------------------------------------------------------

// Read the whole list (never returns null — always an array).
export const loadAttendance = async () => {
  const stored = await storageService.getItem(STORAGE_KEYS.ATTENDANCE, []);
  return Array.isArray(stored) ? stored : [];
};

// Persist a list (used by the mutations below and by any bulk write).
export const saveAttendance = async (logs) => {
  await storageService.setItem(STORAGE_KEYS.ATTENDANCE, logs);
  return logs;
};

// Format the current moment the same way the old slice did.
const nowTime = () =>
  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const nowDate = () => new Date().toISOString().split('T')[0];

// Employee punches IN for today. If a record for today already exists it is
// updated in place, otherwise a new one is added at the top of the list.
export const checkIn = async (payload) => {
  const {
    userId,
    userName,
    department,
    distanceMeters = 14.2,
    isGeofenceVerified = true,
    terminal = 'Terminal 04-A',
    bssid = 'AcmeCorp-Internal',
  } = payload;

  const timeStr = nowTime();
  const dateStr = nowDate();
  const logs = await loadAttendance();

  const existing = logs.find((l) => l.userId === userId && l.date === dateStr);
  if (existing) {
    existing.checkInTime = timeStr;
    existing.distanceMeters = distanceMeters;
    existing.isGeofenceVerified = isGeofenceVerified;
    existing.status = isGeofenceVerified ? 'PRESENT' : 'ABSENT';
    existing.statusCategory = isGeofenceVerified ? 'PRESENT & VERIFIED' : 'UNEXCUSED ABSENT';
  } else {
    logs.unshift({
      id: `ATT-${Date.now()}`,
      userId,
      userName,
      department: department || '', // no department logic — field kept only for old demo logs
      date: dateStr,
      checkInTime: timeStr,
      checkOutTime: null,
      distanceMeters,
      status: isGeofenceVerified ? 'PRESENT' : 'ABSENT',
      statusCategory: isGeofenceVerified ? 'PRESENT & VERIFIED' : 'UNEXCUSED ABSENT',
      terminal,
      bssid,
      isGeofenceVerified,
    });
  }
  return saveAttendance(logs);
};

// Employee punches OUT of today's shift (creates a default record if none).
export const checkOut = async ({ userId }) => {
  const timeStr = nowTime();
  const dateStr = nowDate();
  const logs = await loadAttendance();

  const record = logs.find((l) => l.userId === userId && l.date === dateStr);
  if (record) {
    record.checkOutTime = timeStr;
  } else {
    logs.unshift({
      id: `ATT-${Date.now()}`,
      userId,
      date: dateStr,
      checkInTime: '09:00 AM',
      checkOutTime: timeStr,
      distanceMeters: 14.2,
      status: 'PRESENT',
      statusCategory: 'PRESENT & VERIFIED',
      terminal: 'Terminal 04-A',
      bssid: 'AcmeCorp-Internal',
      isGeofenceVerified: true,
    });
  }
  return saveAttendance(logs);
};

// HR corrects (overrides) a punch record for a given user/date — the existing
// record is updated or a corrected one is created. Kept for parity with the
// old slice so HR-corrected records keep the same shape.
export const overrideAttendance = async ({ userId, date, checkOutTime, checkInTime, note, userName }) => {
  const timeStr = nowTime();
  const dateStr = date || nowDate();
  const inStr = checkInTime || timeStr;
  const outStr = checkOutTime || timeStr;
  const logs = await loadAttendance();

  const record = logs.find((l) => l.userId === userId && l.date === dateStr);
  if (record) {
    record.checkInTime = inStr;
    record.checkOutTime = outStr;
    record.status = 'CORRECTED_PRESENT';
    record.statusCategory = 'HR CORRECTED RECORDS';
    record.correctionNote = note || 'HR Corrected via ticket override';
  } else {
    logs.unshift({
      id: `ATT-OVR-${Date.now()}`,
      userId,
      userName: userName || 'Employee',
      department: '',
      date: dateStr,
      checkInTime: inStr,
      checkOutTime: outStr,
      distanceMeters: 0,
      status: 'CORRECTED_PRESENT',
      statusCategory: 'HR CORRECTED RECORDS',
      correctionNote: note || 'HR Corrected via ticket override',
      terminal: 'Manual Override Bay',
      isGeofenceVerified: false,
    });
  }
  return saveAttendance(logs);
};
