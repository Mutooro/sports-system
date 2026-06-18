const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const { authenticate, authorize } = require('../middleware/auth');
const auditLog = require('../middleware/auditLog');

router.get('/', authenticate, teamController.getAll);
router.post('/bulk', authenticate, authorize('admin'), auditLog('BULK_CREATE', 'team'), teamController.bulkCreate);
router.get('/:id', authenticate, teamController.getById);
router.get('/:id/players', authenticate, teamController.getTeamPlayers);
router.get('/:id/ratings', authenticate, teamController.getTeamRatings);
router.post('/', authenticate, authorize('admin'), auditLog('CREATE', 'team'), teamController.create);
router.put('/:id', authenticate, authorize('admin'), auditLog('UPDATE', 'team'), teamController.update);
router.delete('/:id', authenticate, authorize('admin'), auditLog('DELETE', 'team'), teamController.delete);

module.exports = router;