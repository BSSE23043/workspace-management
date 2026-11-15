const crypto = require('crypto');
const pool = require('../config/db');

const EARTH_RADIUS_METERS = 6371000;

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const toRadians = (value) => (Number(value) * Math.PI) / 180;
  const deltaLat = toRadians(Number(lat2) - Number(lat1));
  const deltaLon = toRadians(Number(lon2) - Number(lon1));
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_METERS * c * 10) / 10;
};

const findUserByEmail = async (email) => {
  const [rows] = await pool.execute(
    `SELECT email, name, company_id, is_active
       FROM users
      WHERE email = ?
      LIMIT 1`,
    [email]
  );
  return rows[0] || null;
};

const getCompanySchedule = async (companyId) => {
  const [rows] = await pool.execute(
    `SELECT c.company_id, c.name, c.timezone, c.geofence_lat, c.geofence_lng,
            c.geofence_radius_m,
            TIME_FORMAT(s.starting_time, '%H:%i') AS start_time,
            TIME_FORMAT(s.ending_time, '%H:%i') AS end_time
       FROM companies c
       LEFT JOIN schedule s ON s.company_id = c.company_id
      WHERE c.company_id = ?
      LIMIT 1`,
    [companyId]
  );
  return rows[0] || null;
};

const getDbNow = async () => {
  const [rows] = await pool.query(
    `SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS today,
            TIME_FORMAT(NOW(), '%H:%i') AS nowTime`
  );
  return rows[0];
};

const getPunchesForDate = async (userEmail, date) => {
  const [rows] = await pool.execute(
    `SELECT is_checkin
       FROM attendance_logs
      WHERE user_email = ? AND DATE(attendance_date) = ?
      ORDER BY attendance_date ASC`,
    [userEmail, date]
  );
  return rows;
};

const createPunch = async ({ userEmail, isCheckIn, distanceMeters }) => {
  const id = crypto.randomUUID();
  await pool.execute(
    `INSERT INTO attendance_logs (id, user_email, attendance_date, is_checkin, distance_meters)
     VALUES (?, ?, NOW(), ?, ?)`,
    [id, userEmail, isCheckIn ? 1 : 0, distanceMeters]
  );
  return id;
};

const listAttendanceByUser = async (userEmail) => {
  const [rows] = await pool.execute(
    `SELECT al.id, al.user_email, al.is_checkin, al.distance_meters,
            DATE_FORMAT(al.attendance_date, '%Y-%m-%d') AS log_date,
            TIME_FORMAT(al.attendance_date, '%H:%i') AS log_time,
            u.name
       FROM attendance_logs al
       LEFT JOIN users u ON u.email = al.user_email
      WHERE al.user_email = ?
      ORDER BY al.attendance_date ASC, al.id ASC`,
    [userEmail]
  );

  const byDate = new Map();
  for (const row of rows) {
    if (!byDate.has(row.log_date)) byDate.set(row.log_date, []);
    byDate.get(row.log_date).push(row);
  }

  const logs = [];
  for (const [date, dayRows] of byDate) {
    const checkIns = dayRows.filter((row) => Number(row.is_checkin) === 1);
    const checkOuts = dayRows.filter((row) => Number(row.is_checkin) === 0);
    const firstCheckIn = checkIns[0];
    const lastCheckOut = checkOuts[checkOuts.length - 1];
    const reference = firstCheckIn || lastCheckOut || dayRows[0];

    logs.push({
      id: reference.id,
      userId: reference.user_email,
      userName: reference.name || '',
      date,
      checkInTime: firstCheckIn ? firstCheckIn.log_time : null,
      checkOutTime: lastCheckOut ? lastCheckOut.log_time : null,
      distanceMeters:
        reference.distance_meters != null ? Number(reference.distance_meters) : null,
      status: 'PRESENT',
      statusCategory: 'PRESENT & VERIFIED',
      terminal: 'Terminal 04-A',
      bssid: 'AcmeCorp-Internal',
      isGeofenceVerified: true,
    });
  }

  logs.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return logs;
};

module.exports = {
  calculateDistance,
  findUserByEmail,
  getCompanySchedule,
  getDbNow,
  getPunchesForDate,
  createPunch,
  listAttendanceByUser,
};
