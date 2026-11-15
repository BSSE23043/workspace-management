const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const requirementController = require('../controllers/requirementController');

const router = express.Router();

router.get('/', asyncHandler(requirementController.listByClient));
router.post('/:id/replies', asyncHandler(requirementController.addReply));

module.exports = router;
