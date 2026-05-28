const express = require('express');
const router = express.Router();
const matchController = require('../controllers/matchController');
const { authenticate, authorize } = require('../middleware/auth');
const auditLog = require('../middleware/auditLog');

router.post('/', authenticate, authorize('coach', 'admin'), auditLog('CREATE', 'match'), matchController.create);
router.get('/', authenticate, matchController.getAll);
router.get('/:id', authenticate, matchController.getById);
router.post('/:match_id/performances', authenticate, authorize('coach', 'admin'), auditLog('CREATE', 'performance'), matchController.addPerformance);

module.exports = router;
