const express = require('express');
const router = express.Router();
const hallController = require('../controllers/hallController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, hallController.getAll);
router.get('/:id', authenticate, hallController.getById);

module.exports = router;