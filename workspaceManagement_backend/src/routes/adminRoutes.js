const express = require('express');
const router = express.Router();
const {
  getCompanyProfile,
  updateCompanyProfile,
  getCompanyUsers,
  createCompanyUser,
  updateCompanyUser,
  toggleUserActiveStatus,
} = require('../controllers/adminController');

router.get('/company/:companyId', getCompanyProfile);
router.put('/company/:companyId', updateCompanyProfile);

router.get('/users', getCompanyUsers);
router.get('/users/:companyId', getCompanyUsers);
router.post('/users', createCompanyUser);
router.put('/users/:email', updateCompanyUser);
router.patch('/users/:email/status', toggleUserActiveStatus);

module.exports = router;
