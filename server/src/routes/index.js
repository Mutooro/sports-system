const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const playerRoutes = require('./player.routes');
const fixtureRoutes = require('./fixture.routes');
const matchRoutes = require('./match.routes');
const ratingRoutes = require('./rating.routes');
const notificationRoutes = require('./notification.routes');
const adminRoutes = require('./admin.routes');
const teamRoutes = require('./team.routes');
const hallRoutes = require('./hall.routes');

router.use('/auth', authRoutes);
router.use('/players', playerRoutes);
router.use('/fixtures', fixtureRoutes);
router.use('/matches', matchRoutes);
router.use('/ratings', ratingRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);
router.use('/teams', teamRoutes);
router.use('/halls', hallRoutes);

module.exports = router;
