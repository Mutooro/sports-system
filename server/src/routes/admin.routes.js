const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/users', authenticate, authorize('admin'), adminController.getUsers);
router.put('/users/:id/toggle', authenticate, authorize('admin'), adminController.toggleUserStatus);
router.get('/audit-logs', authenticate, authorize('admin'), adminController.getAuditLogs);
router.get('/dashboard-stats', authenticate, authorize('admin'), adminController.getDashboardStats);

module.exports = router;
