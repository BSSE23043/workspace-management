const express = require('express');
const router = express.Router();
const {
  getPlatformStats,
  getCompanyAdmins,
  createCompanyAdmin,
  deleteCompanyAdmin,
} = require('../controllers/superAdminController');

router.get('/stats', getPlatformStats);
router.get('/admins', getCompanyAdmins);
router.post('/admins', createCompanyAdmin);
router.delete('/admins/:email', deleteCompanyAdmin);

module.exports = router;
