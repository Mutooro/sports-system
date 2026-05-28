const express = require('express');
const router = express.Router();
const standingsController = require('../controllers/standingsController');
const { authenticate } = require('../middleware/auth');

router.get('/table', authenticate, standingsController.getStandings);
router.get('/stats', authenticate, standingsController.getSeasonStats);
router.get('/upcoming', authenticate, standingsController.getUpcomingFixtures);
router.get('/results', authenticate, standingsController.getRecentResults);

module.exports = router;
