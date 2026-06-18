const { Rating, Player, sequelize } = require('../models');
const { successResponse, errorResponse } = require('../utils/helpers');
const { logger } = require('../utils/logger');
const { calculateRatingForPlayer, recalculateAllRatings } = require('../services/ratingService');
const { getScheduleStatus, runScheduledRecalculation } = require('../jobs/ratingScheduler');

const ratingController = {
  // Calculate and update player ratings
  calculate: async (req, res) => {
    try {
      const { player_id } = req.params;

      const player = await Player.findByPk(player_id);
      if (!player) {
        return errorResponse(res, 'Player not found', 404);
      }

      const rating = await calculateRatingForPlayer(player_id);
      if (!rating) {
        return errorResponse(res, 'No performance data available for rating', 400);
      }

      return successResponse(res, rating, 'Rating calculated successfully');
    } catch (error) {
      logger.error('Calculate rating error:', error);
      return errorResponse(res, 'Failed to calculate rating', 500);
    }
  },

  // Recalculate ratings for all players with performance data
  recalculateAll: async (req, res) => {
    try {
      const result = await runScheduledRecalculation('manual');
      return successResponse(res, result, `Ratings calculated for ${result.calculated} players`);
    } catch (error) {
      logger.error('Recalculate all ratings error:', error);
      return errorResponse(res, 'Failed to recalculate ratings', 500);
    }
  },

  getScheduleStatus: async (req, res) => {
    try {
      return successResponse(res, getScheduleStatus());
    } catch (error) {
      return errorResponse(res, 'Failed to retrieve schedule status', 500);
    }
  },

  // Get team ratings
  getTeamRatings: async (req, res) => {
    try {
      const { team_id } = req.params;

      const players = await Player.findAll({
        where: { team_id },
        include: [
          { model: require('../models').User, as: 'user', attributes: ['first_name', 'last_name'] },
          { 
            model: Rating, 
            as: 'ratings',
            limit: 1,
            order: [['calculation_date', 'DESC']]
          }
        ]
      });

      return successResponse(res, players);
    } catch (error) {
      return errorResponse(res, 'Failed to retrieve team ratings', 500);
    }
  },

  // Get leaderboard (latest rating per player)
  getLeaderboard: async (req, res) => {
    try {
      const { limit = 20 } = req.query;

      const rows = await sequelize.query(`
        SELECT DISTINCT ON (r.player_id)
          r.id, r.player_id, r.overall, r.attack, r.defense, r.fitness,
          r.teamwork, r.discipline, r.calculation_date,
          u.first_name, u.last_name,
          t.name AS team_name,
          p.position
        FROM ratings r
        JOIN players p ON r.player_id = p.id
        JOIN users u ON p.user_id = u.id
        LEFT JOIN teams t ON p.team_id = t.id
        ORDER BY r.player_id, r.calculation_date DESC
      `, { type: sequelize.QueryTypes.SELECT });

      const ratings = rows
        .sort((a, b) => parseFloat(b.overall) - parseFloat(a.overall))
        .slice(0, parseInt(limit))
        .map((r) => ({
          id: r.id,
          player_id: r.player_id,
          overall: r.overall,
          attack: r.attack,
          defense: r.defense,
          fitness: r.fitness,
          teamwork: r.teamwork,
          discipline: r.discipline,
          calculation_date: r.calculation_date,
          player: {
            id: r.player_id,
            position: r.position,
            user: { first_name: r.first_name, last_name: r.last_name },
            team: { name: r.team_name }
          }
        }));

      return successResponse(res, ratings);
    } catch (error) {
      logger.error('Get leaderboard error:', error);
      return errorResponse(res, 'Failed to retrieve leaderboard', 500);
    }
  }
};

module.exports = ratingController;
