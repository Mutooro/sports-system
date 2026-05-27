const { Fixture, Team, Match, sequelize } = require('../models');
const { successResponse, errorResponse, paginate } = require('../utils/helpers');
const { sendFixtureNotification } = require('../utils/emailService');
const { logger } = require('../utils/logger');

const fixtureController = {
  // Get all fixtures
  getAll: async (req, res) => {
    try {
      const { page = 1, limit = 10, status, venue, team_id } = req.query;
      const where = {};

      if (status) where.status = status;
      if (venue) where.venue = venue;

      const { count, rows: fixtures } = await Fixture.findAndCountAll({
        where,
        include: [
          { model: Team, as: 'homeTeam', attributes: ['id', 'name'] },
          { model: Team, as: 'awayTeam', attributes: ['id', 'name'] }
        ],
        ...paginate({}, { page, limit }),
        order: [['match_date', 'ASC']]
      });

      return successResponse(res, {
        fixtures,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      logger.error('Get fixtures error:', error);
      return errorResponse(res, 'Failed to retrieve fixtures', 500);
    }
  },

  // Get fixture by ID
  getById: async (req, res) => {
    try {
      const fixture = await Fixture.findByPk(req.params.id, {
        include: [
          { model: Team, as: 'homeTeam' },
          { model: Team, as: 'awayTeam' },
          { model: Match, as: 'matchResult' }
        ]
      });

      if (!fixture) {
        return errorResponse(res, 'Fixture not found', 404);
      }

      return successResponse(res, fixture);
    } catch (error) {
      return errorResponse(res, 'Failed to retrieve fixture', 500);
    }
  },

  // Create fixture
  create: async (req, res) => {
    try {
      const { home_team_id, away_team_id, venue, match_date, notes } = req.body;

      const fixture = await Fixture.create({
        home_team_id,
        away_team_id,
        venue,
        match_date,
        notes
      });

      const newFixture = await Fixture.findByPk(fixture.id, {
        include: [
          { model: Team, as: 'homeTeam', attributes: ['name'] },
          { model: Team, as: 'awayTeam', attributes: ['name'] }
        ]
      });

      // Send notifications to affected team members
      // (In production, you'd queue this)
      logger.info(`Fixture created: ${fixture.id}`);
      return successResponse(res, newFixture, 'Fixture created successfully', 201);
    } catch (error) {
      logger.error('Create fixture error:', error);
      return errorResponse(res, 'Failed to create fixture', 500);
    }
  },

  // Update fixture
  update: async (req, res) => {
    try {
      const fixture = await Fixture.findByPk(req.params.id);
      if (!fixture) {
        return errorResponse(res, 'Fixture not found', 404);
      }

      await fixture.update(req.body);

      const updated = await Fixture.findByPk(fixture.id, {
        include: [
          { model: Team, as: 'homeTeam', attributes: ['name'] },
          { model: Team, as: 'awayTeam', attributes: ['name'] }
        ]
      });

      logger.info(`Fixture updated: ${fixture.id}`);
      return successResponse(res, updated, 'Fixture updated successfully');
    } catch (error) {
      return errorResponse(res, 'Failed to update fixture', 500);
    }
  },

  // Delete fixture
  delete: async (req, res) => {
    try {
      const fixture = await Fixture.findByPk(req.params.id);
      if (!fixture) {
        return errorResponse(res, 'Fixture not found', 404);
      }

      await fixture.destroy();
      logger.info(`Fixture deleted: ${req.params.id}`);
      return successResponse(res, null, 'Fixture deleted successfully');
    } catch (error) {
      return errorResponse(res, 'Failed to delete fixture', 500);
    }
  }
};

module.exports = fixtureController;
