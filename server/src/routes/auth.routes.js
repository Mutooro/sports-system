const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('first_name').trim().notEmpty(),
  body('last_name').trim().notEmpty(),
  body('student_number').trim().notEmpty().withMessage('Student number is required'),
  // Role is hard-coded to 'student' inside the controller; any client-supplied
  // value is silently ignored. Block it here so misbehaving clients get a
  // helpful 400 instead of a silently-stripped payload.
  body('role').custom((value) => {
    if (value === undefined || value === null || value === '') return true;
    if (value === 'student') return true;
    throw new Error('Role cannot be set via public registration. Use /admin/users for coach/admin accounts.');
  })
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
];

router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);
router.post('/refresh', authController.refresh);
router.get('/me', authenticate, authController.me);
router.post('/logout', authenticate, authController.logout);

// Coach dropdown endpoint
router.get('/coaches', authenticate, authController.getCoaches);

module.exports = router;
