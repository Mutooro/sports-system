const express = require('express');
const router = express.Router();
const ratingController = require('../controllers/ratingController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/calculate/:player_id', authenticate, authorize('coach', 'admin'), ratingController.calculate);
router.get('/team/:team_id', authenticate, ratingController.getTeamRatings);
router.get('/leaderboard', authenticate, ratingController.getLeaderboard);

module.exports = router;
