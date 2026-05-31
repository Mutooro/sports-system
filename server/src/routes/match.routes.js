const express = require('express');
const router = express.Router();
const matchController = require('../controllers/matchController');
const { authenticate, authorize } = require('../middleware/auth');
const auditLog = require('../middleware/auditLog');

// Specific named routes BEFORE /:id
router.get('/recent', authenticate, matchController.getRecent);
router.get('/',       authenticate, matchController.getAll);

router.post(
  '/',
  authenticate,
  authorize('coach', 'admin'),
  auditLog('CREATE', 'match'),
  matchController.create
);

router.put(
  '/:id',
  authenticate,
  authorize('coach', 'admin'),
  auditLog('UPDATE', 'match'),
  matchController.update
);

router.post(
  '/:match_id/performances',
  authenticate,
  authorize('coach', 'admin'),
  auditLog('CREATE', 'performance'),
  matchController.addPerformance
);

router.get('/:id', authenticate, matchController.getById);

module.exports = router;
