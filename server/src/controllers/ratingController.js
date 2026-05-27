const { Rating, Player, Performance, sequelize } = require('../models');
const { successResponse, errorResponse } = require('../utils/helpers');
const { logger } = require('../utils/logger');

const ratingController = {
  // Calculate and update player ratings
  calculate: async (req, res) => {
    try {
      const { player_id } = req.params;

      const player = await Player.findByPk(player_id);
      if (!player) {
        return errorResponse(res, 'Player not found', 404);
      }

      // Get last 10 performances
      const performances = await Performance.findAll({
        where: { player_id },
        order: [['created_at', 'DESC']],
        limit: 10
      });

      if (performances.length === 0) {
        return errorResponse(res, 'No performance data available for rating', 400);
      }

      // Calculate metrics
      const totalGoals = performances.reduce((sum, p) => sum + p.goals, 0);
      const totalAssists = performances.reduce((sum, p) => sum + p.assists, 0);
      const avgMinutes = performances.reduce((sum, p) => sum + p.minutes_played, 0) / performances.length;
      const avgRating = performances.reduce((sum, p) => sum + (p.rating || 5), 0) / performances.length;
      const totalMatches = performances.length;

      // Weighted calculation (customize weights as needed)
      const attack = Math.min(10, (totalGoals * 1.5 + totalAssists * 1.0 + avgRating * 0.5) / Math.max(totalMatches * 0.3, 1));
      const defense = Math.min(10, avgRating * 0.8 + (avgMinutes / 90) * 2);
      const fitness = Math.min(10, (avgMinutes / 90) * 8 + 2);
      const teamwork = Math.min(10, avgRating * 0.9 + (totalAssists * 0.5));
      const discipline = Math.min(10, 10 - (performances.reduce((sum, p) => sum + p.yellow_cards + p.red_cards * 2, 0) / Math.max(totalMatches, 1)));

      const overall = (attack + defense + fitness + teamwork + discipline) / 5;

      const rating = await Rating.create({
        player_id,
        overall: parseFloat(overall.toFixed(1)),
        attack: parseFloat(attack.toFixed(1)),
        defense: parseFloat(defense.toFixed(1)),
        fitness: parseFloat(fitness.toFixed(1)),
        teamwork: parseFloat(teamwork.toFixed(1)),
        discipline: parseFloat(discipline.toFixed(1)),
        calculation_date: new Date()
      });

      logger.info(`Rating calculated for player: ${player_id}`);
      return successResponse(res, rating, 'Rating calculated successfully');
    } catch (error) {
      logger.error('Calculate rating error:', error);
      return errorResponse(res, 'Failed to calculate rating', 500);
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

  // Get leaderboard
  getLeaderboard: async (req, res) => {
    try {
      const { limit = 20 } = req.query;

      const ratings = await Rating.findAll({
        include: [
          { 
            model: Player, 
            as: 'player',
            include: [
              { model: require('../models').User, as: 'user', attributes: ['first_name', 'last_name'] },
              { model: require('../models').Team, as: 'team', attributes: ['name'] }
            ]
          }
        ],
        order: [['overall', 'DESC']],
        limit: parseInt(limit)
      });

      return successResponse(res, ratings);
    } catch (error) {
      return errorResponse(res, 'Failed to retrieve leaderboard', 500);
    }
  }
};

module.exports = ratingController;
