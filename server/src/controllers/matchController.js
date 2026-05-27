const { Match, Fixture, Performance, Player, Rating, sequelize } = require('../models');
const { successResponse, errorResponse } = require('../utils/helpers');
const { logger } = require('../utils/logger');

const matchController = {
  // Record a match result
  create: async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
      const { fixture_id, home_score, away_score, played_date, weather_conditions, match_report } = req.body;

      const fixture = await Fixture.findByPk(fixture_id, { transaction });
      if (!fixture) {
        await transaction.rollback();
        return errorResponse(res, 'Fixture not found', 404);
      }

      // Determine result
      let result = 'draw';
      if (home_score > away_score) result = 'home_win';
      else if (away_score > home_score) result = 'away_win';

      const match = await Match.create({
        fixture_id,
        home_score,
        away_score,
        played_date,
        result,
        weather_conditions,
        match_report
      }, { transaction });

      // Update fixture status
      await fixture.update({ status: 'completed' }, { transaction });

      await transaction.commit();

      logger.info(`Match recorded: ${match.id}`);
      return successResponse(res, match, 'Match recorded successfully', 201);
    } catch (error) {
      await transaction.rollback();
      logger.error('Create match error:', error);
      return errorResponse(res, 'Failed to record match', 500);
    }
  },

  // Add player performance for a match
  addPerformance: async (req, res) => {
    try {
      const { match_id } = req.params;
      const performances = req.body.performances; // Array of performance objects

      const match = await Match.findByPk(match_id);
      if (!match) {
        return errorResponse(res, 'Match not found', 404);
      }

      const created = await Performance.bulkCreate(
        performances.map(p => ({ ...p, match_id })),
        { validate: true }
      );

      logger.info(`Performance data added for match: ${match_id}`);
      return successResponse(res, created, 'Performance data recorded', 201);
    } catch (error) {
      logger.error('Add performance error:', error);
      return errorResponse(res, 'Failed to record performance', 500);
    }
  },

  // Get match details with performances
  getById: async (req, res) => {
    try {
      const match = await Match.findByPk(req.params.id, {
        include: [
          { 
            model: Fixture, 
            as: 'fixture',
            include: [
              { model: require('../models').Team, as: 'homeTeam', attributes: ['name'] },
              { model: require('../models').Team, as: 'awayTeam', attributes: ['name'] }
            ]
          },
          {
            model: Performance,
            as: 'performances',
            include: [
              { model: Player, as: 'player', include: [{ model: require('../models').User, as: 'user', attributes: ['first_name', 'last_name'] }] }
            ]
          }
        ]
      });

      if (!match) {
        return errorResponse(res, 'Match not found', 404);
      }

      return successResponse(res, match);
    } catch (error) {
      return errorResponse(res, 'Failed to retrieve match', 500);
    }
  }
};

module.exports = matchController;
