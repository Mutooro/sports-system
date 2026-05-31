const express = require('express');
const router = express.Router();
const standingsController = require('../controllers/standingsController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, standingsController.getStandings);
router.get('/season-stats', authenticate, standingsController.getSeasonStats);

module.exports = router;
