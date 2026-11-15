const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const attendanceController = require('../controllers/attendanceController');

const router = express.Router();
router.get('/status', asyncHandler(attendanceController.getStatus));
router.post('/check-in', asyncHandler(attendanceController.checkIn));
router.post('/check-out', asyncHandler(attendanceController.checkOut));
router.get('/', asyncHandler(attendanceController.listMyAttendance));
module.exports = router;
