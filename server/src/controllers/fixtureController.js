const { Fixture, Team, Match, sequelize } = require('../models');
const { successResponse, errorResponse, paginate } = require('../utils/helpers');
const { sendFixtureNotification } = require('../utils/emailService');
const { logger } = require('../utils/logger');
const FixtureGenerator = require('../services/fixtureGenerator');

const fixtureController = {
  // ── GET /fixtures ──────────────────────────────────────────────────────────
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

  // ── GET /fixtures/calendar ─────────────────────────────────────────────────
  getCalendar: async (req, res) => {
    try {
      const fixtures = await Fixture.findAll({
        include: [
          { model: Team, as: 'homeTeam', attributes: ['id', 'name'] },
          { model: Team, as: 'awayTeam', attributes: ['id', 'name'] }
        ],
        order: [['match_date', 'ASC']]
      });
      return successResponse(res, { fixtures }, 'Fixture calendar retrieved');
    } catch (error) {
      logger.error('Get fixture calendar error:', error);
      return errorResponse(res, 'Failed to retrieve fixture calendar', 500);
    }
  },

  // ── GET /fixtures/:id ──────────────────────────────────────────────────────
  getById: async (req, res) => {
    try {
      const fixture = await Fixture.findByPk(req.params.id, {
        include: [
          { model: Team, as: 'homeTeam' },
          { model: Team, as: 'awayTeam' },
          { model: Match, as: 'matchResult' }
        ]
      });
      if (!fixture) return errorResponse(res, 'Fixture not found', 404);
      return successResponse(res, fixture);
    } catch (error) {
      return errorResponse(res, 'Failed to retrieve fixture', 500);
    }
  },

  // ── POST /fixtures ─────────────────────────────────────────────────────────
  create: async (req, res) => {
    try {
      const { home_team_id, away_team_id, venue, match_date, notes } = req.body;

      const fixture = await Fixture.create({ home_team_id, away_team_id, venue, match_date, notes });

      const newFixture = await Fixture.findByPk(fixture.id, {
        include: [
          { model: Team, as: 'homeTeam', attributes: ['name'] },
          { model: Team, as: 'awayTeam', attributes: ['name'] }
        ]
      });

      logger.info(`Fixture created: ${fixture.id}`);
      return successResponse(res, newFixture, 'Fixture created successfully', 201);
    } catch (error) {
      logger.error('Create fixture error:', error);
      return errorResponse(res, 'Failed to create fixture', 500);
    }
  },

  // ── POST /fixtures/preview ─────────────────────────────────────────────────
  previewGeneration: async (req, res) => {
    try {
      const { start_date, match_days, match_time, venues, include_return_leg, sport_type } = req.body;

      if (!start_date || !Array.isArray(match_days) || match_days.length === 0 || !match_time) {
        return errorResponse(res, 'start_date, match_days (array) and match_time are required', 400);
      }

      // Fetch all active teams for this sport
      const whereClause = sport_type ? { sport_type } : {};
      const teams = await Team.findAll({ where: whereClause });

      if (teams.length < 2) {
        return errorResponse(
          res,
          `Not enough teams to generate a schedule. Found ${teams.length} team(s) for sport "${sport_type || 'all'}". Need at least 2.`,
          400
        );
      }

      const preview = await FixtureGenerator.preview(teams, {
        start_date,
        match_days: match_days.map(Number),
        match_time,
        venues: venues && venues.length > 0 ? venues : ['football_pitch'],
        include_return_leg: include_return_leg !== false
      });

      logger.info(`Preview generated: ${preview.total_fixtures} fixtures, ${preview.conflicts.length} conflicts`);
      return successResponse(res, preview, 'Preview generated successfully');
    } catch (error) {
      logger.error('Preview generation error:', error);
      return errorResponse(res, error.message || 'Failed to generate preview', 500);
    }
  },

  // ── POST /fixtures/auto-generate ──────────────────────────────────────────
  autoGenerate: async (req, res) => {
    try {
      const { start_date, match_days, match_time, venues, include_return_leg, sport_type } = req.body;

      if (!start_date || !Array.isArray(match_days) || match_days.length === 0 || !match_time) {
        return errorResponse(res, 'start_date, match_days (array) and match_time are required', 400);
      }

      // Guard: prevent double-generation if scheduled fixtures already exist
      const existing = await Fixture.count({ where: { status: 'scheduled' } });
      if (existing > 0) {
        return errorResponse(
          res,
          `${existing} scheduled fixture(s) already exist. Delete or complete them before generating a new set.`,
          409
        );
      }

      const whereClause = sport_type ? { sport_type } : {};
      const teams = await Team.findAll({ where: whereClause });

      if (teams.length < 2) {
        return errorResponse(
          res,
          `Not enough teams. Found ${teams.length} for sport "${sport_type || 'all'}". Need at least 2.`,
          400
        );
      }

      const created = await FixtureGenerator.generateAndSave(teams, {
        start_date,
        match_days: match_days.map(Number),
        match_time,
        venues: venues && venues.length > 0 ? venues : ['football_pitch'],
        include_return_leg: include_return_leg !== false
      });

      // Fire-and-forget: notify all players in participating teams
      notifyTeamPlayers(teams, created).catch(err =>
        logger.warn('Batch notification failed (non-critical):', err.message)
      );

      logger.info(`Auto-generated ${created.length} fixtures`);
      return successResponse(
        res,
        { fixtures_count: created.length },
        `Successfully generated ${created.length} fixtures`,
        201
      );
    } catch (error) {
      logger.error('Auto generate fixtures error:', error);
      return errorResponse(res, error.message || 'Failed to auto-generate fixtures', 500);
    }
  },

  // ── PUT /fixtures/bulk-update ──────────────────────────────────────────────
  bulkUpdate: async (req, res) => {
    try {
      const { fixture_ids, update } = req.body;
      if (!Array.isArray(fixture_ids) || fixture_ids.length === 0) {
        return errorResponse(res, 'fixture_ids array is required', 400);
      }
      const { Op } = require('sequelize');
      const [updatedCount] = await Fixture.update(update, {
        where: { id: { [Op.in]: fixture_ids } }
      });
      return successResponse(res, { updated: updatedCount }, `${updatedCount} fixtures updated`);
    } catch (error) {
      logger.error('Bulk update error:', error);
      return errorResponse(res, 'Failed to bulk update fixtures', 500);
    }
  },

  // ── PUT /fixtures/:id ──────────────────────────────────────────────────────
  update: async (req, res) => {
    try {
      const fixture = await Fixture.findByPk(req.params.id);
      if (!fixture) return errorResponse(res, 'Fixture not found', 404);

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

  // ── DELETE /fixtures/:id ───────────────────────────────────────────────────
  delete: async (req, res) => {
    try {
      const fixture = await Fixture.findByPk(req.params.id);
      if (!fixture) return errorResponse(res, 'Fixture not found', 404);

      await fixture.destroy();
      logger.info(`Fixture deleted: ${req.params.id}`);
      return successResponse(res, null, 'Fixture deleted successfully');
    } catch (error) {
      return errorResponse(res, 'Failed to delete fixture', 500);
    }
  }
};

// ── Helper: notify all players in the affected teams ────────────────────────
async function notifyTeamPlayers(teams, fixtures) {
  if (!fixtures.length) return;

  const { User, Player } = require('../models');
  const { sendFixtureNotification } = require('../utils/emailService');

  const teamIds = teams.map(t => t.id);
  const players = await Player.findAll({
    where: { team_id: teamIds },
    include: [{ model: User, as: 'user', attributes: ['email'] }]
  });

  const firstFixture = fixtures[0];
  for (const player of players) {
    if (player.user?.email) {
      await sendFixtureNotification(player.user.email, {
        homeTeam: `Team ${firstFixture.home_team_id}`,
        awayTeam: `Team ${firstFixture.away_team_id}`,
        matchDate: firstFixture.match_date,
        venue: firstFixture.venue
      }).catch(() => {});
    }
  }
}

module.exports = fixtureController;