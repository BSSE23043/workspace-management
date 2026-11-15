const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const taskController = require('../controllers/taskController');

const router = express.Router();

router.get('/', asyncHandler(taskController.listMyTasks));
router.put('/:id/status', asyncHandler(taskController.updateStatus));
router.post('/:id/logs', asyncHandler(taskController.addLog));

module.exports = router;
