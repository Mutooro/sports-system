const express = require('express');
const router = express.Router();
const fixtureController = require('../controllers/fixtureController');
const { authenticate, authorize } = require('../middleware/auth');
const auditLog = require('../middleware/auditLog');

router.get('/', authenticate, fixtureController.getAll);
router.get('/calendar', authenticate, fixtureController.getCalendar);
router.get('/:id', authenticate, fixtureController.getById);
router.post('/', authenticate, authorize('coach', 'admin'), auditLog('CREATE', 'fixture'), fixtureController.create);
router.post('/auto-generate', authenticate, authorize('coach', 'admin'), auditLog('CREATE', 'fixture'), fixtureController.autoGenerate);
router.post('/preview', authenticate, authorize('coach', 'admin'), fixtureController.previewGeneration);
router.put('/bulk-update', authenticate, authorize('coach', 'admin'), auditLog('UPDATE', 'fixture'), fixtureController.bulkUpdate);
router.put('/:id', authenticate, authorize('coach', 'admin'), auditLog('UPDATE', 'fixture'), fixtureController.update);
router.delete('/:id', authenticate, authorize('coach', 'admin'), auditLog('DELETE', 'fixture'), fixtureController.delete);

module.exports = router;