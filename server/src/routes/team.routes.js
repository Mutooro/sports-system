const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const { authenticate, authorize } = require('../middleware/auth');
const auditLog = require('../middleware/auditLog');

router.get('/', authenticate, teamController.getAll);
router.post('/bulk', authenticate, authorize('admin'), auditLog('BULK_CREATE', 'team'), teamController.bulkCreate);
router.get('/:id/players', authenticate, teamController.getTeamPlayers);
router.get('/:id/ratings', authenticate, teamController.getTeamRatings);

// Formation endpoints — specific sub-paths before /:id
router.get('/:id/formation', authenticate, teamController.getFormation);
router.put(
  '/:id/formation',
  authenticate,
  authorize('admin', 'coach'),
  auditLog('UPDATE', 'team'),
  teamController.saveFormation
);

router.get('/:id', authenticate, teamController.getById);
router.post('/', authenticate, authorize('admin'), auditLog('CREATE', 'team'), teamController.create);
router.put('/:id', authenticate, authorize('admin'), auditLog('UPDATE', 'team'), teamController.update);
router.delete('/:id', authenticate, authorize('admin'), auditLog('DELETE', 'team'), teamController.delete);

module.exports = router;