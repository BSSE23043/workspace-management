const HttpError = require('../utils/httpError');
const attendanceService = require('../services/attendanceService');

const normalizeEmail = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');

const parseCoordinate = (value, min, max, name) => {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    throw new HttpError(400, `${name} must be a valid coordinate between ${min} and ${max}`);
  }
  return number;
};

const loadUserContext = async (rawEmail) => {
  const email = normalizeEmail(rawEmail);
  if (!email) throw new HttpError(400, 'userEmail is required');

  const user = await attendanceService.findUserByEmail(email);
  if (!user) throw new HttpError(404, `No user found with email ${email}`);
  if (!user.is_active) throw new HttpError(403, 'This account is deactivated');

  const company = await attendanceService.getCompanySchedule(user.company_id);
  if (!company) throw new HttpError(404, 'Company not found for this user');

  return { email, user, company };
};

const requireAttendanceConfig = (company) => {
  if (company.geofence_lat == null || company.geofence_lng == null) {
    throw new HttpError(409, 'Attendance geofence is not configured for this company');
  }

  if (!company.start_time || !company.end_time) {
    throw new HttpError(409, 'Shift schedule is not configured for this company');
  }
};

const buildPayload = (company, todayLog, logs) => ({
  company: {
    companyId: company.company_id,
    name: company.name,
    timezone: company.timezone,
    geofenceLat: company.geofence_lat != null ? Number(company.geofence_lat) : null,
    geofenceLng: company.geofence_lng != null ? Number(company.geofence_lng) : null,
    geofenceRadiusM:
      company.geofence_radius_m != null ? Number(company.geofence_radius_m) : null,
  },
  schedule:
    company.start_time && company.end_time
      ? { startTime: company.start_time, endTime: company.end_time }
      : null,
  today: todayLog
    ? {
        date: todayLog.date,
        checkInTime: todayLog.checkInTime,
        checkOutTime: todayLog.checkOutTime,
      }
    : null,
  logs,
});

const buildCurrentPayload = async (email, company) => {
  const logs = await attendanceService.listAttendanceByUser(email);
  const { today } = await attendanceService.getDbNow();
  return buildPayload(company, logs.find((log) => log.date === today) || null, logs);
};

const validatePunchContext = async (body) => {
  const { userEmail, latitude, longitude } = body || {};
  const { email, company } = await loadUserContext(userEmail);
  requireAttendanceConfig(company);

  const lat = parseCoordinate(latitude, -90, 90, 'latitude');
  const lng = parseCoordinate(longitude, -180, 180, 'longitude');

  const distance = attendanceService.calculateDistance(
    lat,
    lng,
    Number(company.geofence_lat),
    Number(company.geofence_lng)
  );
  const radius = Number(company.geofence_radius_m);

  if (distance > radius) {
    throw new HttpError(
      403,
      `You are ${distance}m away from ${company.name}. Attendance can only be marked within the ${radius}m geofence.`
    );
  }

  return { email, company, distance };
};

const listMyAttendance = async (req, res) => {
  const email = normalizeEmail(req.query.userEmail);
  if (!email) throw new HttpError(400, 'userEmail query parameter is required');
  const data = await attendanceService.listAttendanceByUser(email);
  res.json({ data });
};

const getStatus = async (req, res) => {
  const { email, company } = await loadUserContext(req.query.userEmail);
  res.json({ data: await buildCurrentPayload(email, company) });
};

const checkIn = async (req, res) => {
  const { email, company, distance } = await validatePunchContext(req.body);
  const { today, nowTime } = await attendanceService.getDbNow();
  const punches = await attendanceService.getPunchesForDate(email, today);

  if (punches.some((punch) => Number(punch.is_checkin) === 1)) {
    throw new HttpError(409, 'You have already checked in today.');
  }

  if (nowTime > company.start_time) {
    throw new HttpError(
      400,
      `Check-in is closed for today. Your shift starts at ${company.start_time}.`
    );
  }

  await attendanceService.createPunch({
    userEmail: email,
    isCheckIn: true,
    distanceMeters: distance,
  });

  res.status(201).json({ data: await buildCurrentPayload(email, company) });
};

const checkOut = async (req, res) => {
  const { email, company, distance } = await validatePunchContext(req.body);
  const { today, nowTime } = await attendanceService.getDbNow();
  const punches = await attendanceService.getPunchesForDate(email, today);
  const hasCheckedIn = punches.some((punch) => Number(punch.is_checkin) === 1);
  const hasCheckedOut = punches.some((punch) => Number(punch.is_checkin) === 0);

  if (!hasCheckedIn) {
    throw new HttpError(400, 'You have not checked in today.');
  }

  if (hasCheckedOut) {
    throw new HttpError(409, 'You have already checked out today.');
  }

  if (nowTime < company.end_time) {
    throw new HttpError(
      400,
      `Check-out is not open yet. Your shift ends at ${company.end_time}.`
    );
  }

  await attendanceService.createPunch({
    userEmail: email,
    isCheckIn: false,
    distanceMeters: distance,
  });

  res.status(201).json({ data: await buildCurrentPayload(email, company) });
};

module.exports = { listMyAttendance, getStatus, checkIn, checkOut };
