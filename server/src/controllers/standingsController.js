const StandingsService = require('../services/standingsService');
const { successResponse, errorResponse } = require('../utils/helpers');
const { logger } = require('../utils/logger');

const standingsController = {
  // Get league standings table
  getStandings: async (req, res) => {
    try {
      const { sport_type = 'football' } = req.query;

      const standings = await StandingsService.calculateStandings(sport_type);

      return successResponse(res, {
        standings,
        season: new Date().getFullYear(),
        total_teams: standings.length,
        matches_played: standings.reduce((sum, t) => sum + t.played, 0) / 2
      }, 'Standings retrieved');
    } catch (error) {
      logger.error('Get standings error:', error);
      return errorResponse(res, 'Failed to calculate standings', 500);
    }
  },

  // Get season stats (top scorers, assisters, rated)
  getSeasonStats: async (req, res) => {
    try {
      const { sport_type = 'football' } = req.query;

      const stats = await StandingsService.getSeasonStats(sport_type);

      return successResponse(res, stats, 'Season stats retrieved');
    } catch (error) {
      logger.error('Get season stats error:', error);
      return errorResponse(res, 'Failed to retrieve season stats', 500);
    }
  }
};

module.exports = standingsController;
