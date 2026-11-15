const express = require('express');
const router = express.Router();
const { login, updateProfile } = require('../controllers/authController');

router.post('/login', login);
router.put('/profile', updateProfile);

module.exports = router;
