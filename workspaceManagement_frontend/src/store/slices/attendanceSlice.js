import { createSlice } from '@reduxjs/toolkit';
import { SEED_ATTENDANCE } from '../../data/seedData';

const initialState = {
  logs: [...SEED_ATTENDANCE],
};

const attendanceSlice = createSlice({
  name: 'attendance',
  initialState,
  reducers: {
    checkIn: (state, action) => {
      const {
        userId,
        userName,
        department,
        distanceMeters = 14.2,
        isGeofenceVerified = true,
        terminal = 'Terminal 04-A',
        bssid = 'AcmeCorp-Internal',
      } = action.payload;

      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = now.toISOString().split('T')[0];

      // Check if user already has an entry for today
      const existing = state.logs.find((l) => l.userId === userId && l.date === dateStr);
      if (existing) {
        existing.checkInTime = timeStr;
        existing.distanceMeters = distanceMeters;
        existing.isGeofenceVerified = isGeofenceVerified;
        existing.status = isGeofenceVerified ? 'PRESENT' : 'ABSENT';
        existing.statusCategory = isGeofenceVerified ? 'PRESENT & VERIFIED' : 'UNEXCUSED ABSENT';
      } else {
        state.logs.unshift({
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
    },
    checkOut: (state, action) => {
      const { userId } = action.payload;
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = now.toISOString().split('T')[0];

      const record = state.logs.find((l) => l.userId === userId && l.date === dateStr);
      if (record) {
        record.checkOutTime = timeStr;
      } else {
        // If no check-in, create one
        state.logs.unshift({
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
    },
    overrideAttendance: (state, action) => {
      const { userId, date, checkOutTime, checkInTime, note } = action.payload;
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = date || now.toISOString().split('T')[0];
      const inStr = checkInTime || timeStr;
      const outStr = checkOutTime || timeStr;
      const record = state.logs.find((l) => l.userId === userId && l.date === dateStr);
      if (record) {
        record.checkInTime = inStr;
        record.checkOutTime = outStr;
        record.status = 'CORRECTED_PRESENT';
        record.statusCategory = 'HR CORRECTED RECORDS';
        record.correctionNote = note || 'HR Corrected via ticket override';
      } else {
        state.logs.unshift({
          id: `ATT-OVR-${Date.now()}`,
          userId,
          userName: action.payload.userName || 'Employee',
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
    },
    resetAttendance: () => ({
      logs: [...SEED_ATTENDANCE],
    }),
  },
});

export const { checkIn, checkOut, overrideAttendance, resetAttendance } = attendanceSlice.actions;
export default attendanceSlice.reducer;
