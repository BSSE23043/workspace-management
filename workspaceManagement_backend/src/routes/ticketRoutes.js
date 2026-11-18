const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const ticketController = require('../controllers/ticketController');

const router = express.Router();

router.get('/', asyncHandler(ticketController.listMyTickets));
router.post('/', asyncHandler(ticketController.createHrTicket));
router.post('/:ticketId/messages', asyncHandler(ticketController.addMessage));

module.exports = router;
