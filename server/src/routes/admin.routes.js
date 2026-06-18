const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');

const createUserValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('first_name').trim().notEmpty(),
  body('last_name').trim().notEmpty(),
  body('role').isIn(['student', 'coach', 'admin']).withMessage('role must be student, coach or admin'),
  body('student_number').optional().isString()
];

router.get('/users', authenticate, authorize('admin'), adminController.getUsers);
router.put('/users/:id/toggle', authenticate, authorize('admin'), adminController.toggleUserStatus);
router.post('/users', authenticate, authorize('admin'), createUserValidation, adminController.createUser);
router.get('/audit-logs', authenticate, authorize('admin'), adminController.getAuditLogs);
router.get('/dashboard-stats', authenticate, authorize('admin'), adminController.getDashboardStats);
router.get('/standings', authenticate, authorize('admin'), adminController.getStandings);

module.exports = router;
