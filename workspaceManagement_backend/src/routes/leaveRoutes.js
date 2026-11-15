const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const leaveController = require('../controllers/leaveController');

const router = express.Router();

router.get('/', asyncHandler(leaveController.listMyLeaves));
router.post('/', asyncHandler(leaveController.createLeaveRequest));

module.exports = router;
