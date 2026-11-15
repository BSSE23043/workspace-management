const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const salaryController = require('../controllers/salaryController');

const router = express.Router();
router.get('/', asyncHandler(salaryController.getSalaryConfig));
module.exports = router;
