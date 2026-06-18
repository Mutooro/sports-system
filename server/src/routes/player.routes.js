const express = require('express');
const router = express.Router();
const playerController = require('../controllers/playerController');
const { authenticate, authorize } = require('../middleware/auth');
const auditLog = require('../middleware/auditLog');

router.get('/', authenticate, playerController.getAll);
router.get('/search', authenticate, authorize('coach', 'admin'), playerController.search);
router.post('/bulk', authenticate, authorize('coach', 'admin'), auditLog('BULK_CREATE', 'player'), playerController.bulkCreate);
router.get('/:id', authenticate, playerController.getById);
router.post('/', authenticate, authorize('coach', 'admin'), auditLog('CREATE', 'player'), playerController.create);
router.put('/:id', authenticate, authorize('coach', 'admin'), auditLog('UPDATE', 'player'), playerController.update);
router.delete('/:id', authenticate, authorize('coach', 'admin'), auditLog('DELETE', 'player'), playerController.delete);

module.exports = router;
