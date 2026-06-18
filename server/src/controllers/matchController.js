const { Match, Fixture, Performance, Player, Team, Rating, sequelize } = require('../models');
const { User } = require('../models');
const { successResponse, errorResponse, paginate } = require('../utils/helpers');
const { logger } = require('../utils/logger');
const { calculateRatingsForPlayers } = require('../services/ratingService');

const matchController = {

  // ── GET /matches ─────────────────────────────────────────────────────────
  getAll: async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      const { count, rows: matches } = await Match.findAndCountAll({
        include: [{
          model: Fixture, as: 'fixture',
          include: [
            { model: Team, as: 'homeTeam', attributes: ['id', 'name'] },
            { model: Team, as: 'awayTeam', attributes: ['id', 'name'] }
          ]
        }],
        ...paginate({}, { page, limit }),
        order: [['played_date', 'DESC']]
      });
      return successResponse(res, {
        matches,
        pagination: {
          page: parseInt(page), limit: parseInt(limit),
          total: count, totalPages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      logger.error('Get matches error:', error);
      return errorResponse(res, 'Failed to retrieve matches', 500);
    }
  },

  // ── GET /matches/recent ──────────────────────────────────────────────────
  getRecent: async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 5;
      const matches = await Match.findAll({
        include: [{
          model: Fixture, as: 'fixture',
          include: [
            { model: Team, as: 'homeTeam', attributes: ['id', 'name'] },
            { model: Team, as: 'awayTeam', attributes: ['id', 'name'] }
          ]
        }],
        order: [['played_date', 'DESC']],
        limit
      });
      return successResponse(res, { matches }, 'Recent matches retrieved');
    } catch (error) {
      logger.error('Get recent matches error:', error);
      return errorResponse(res, 'Failed to retrieve recent matches', 500);
    }
  },

  // ── GET /matches/:id ─────────────────────────────────────────────────────
  getById: async (req, res) => {
    try {
      const match = await Match.findByPk(req.params.id, {
        include: [
          {
            model: Fixture, as: 'fixture',
            include: [
              { model: Team, as: 'homeTeam', attributes: ['id', 'name'] },
              { model: Team, as: 'awayTeam', attributes: ['id', 'name'] }
            ]
          },
          {
            model: Performance, as: 'performances',
            include: [{
              model: Player, as: 'player',
              include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name'] }]
            }]
          }
        ]
      });
      if (!match) return errorResponse(res, 'Match not found', 404);
      return successResponse(res, match);
    } catch (error) {
      return errorResponse(res, 'Failed to retrieve match', 500);
    }
  },

  // ── POST /matches ────────────────────────────────────────────────────────
  create: async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
      const { fixture_id, home_score, away_score, played_date, weather_conditions, match_report } = req.body;

      const existing = await Match.findOne({ where: { fixture_id } });
      if (existing) {
        await transaction.rollback();
        return errorResponse(res, 'A result for this fixture already exists. Use PUT /matches/:id to update it.', 409);
      }

      const fixture = await Fixture.findByPk(fixture_id, {
        include: [
          { model: Team, as: 'homeTeam', attributes: ['id', 'name'] },
          { model: Team, as: 'awayTeam', attributes: ['id', 'name'] }
        ],
        transaction
      });
      if (!fixture) {
        await transaction.rollback();
        return errorResponse(res, 'Fixture not found', 404);
      }

      let result = 'draw';
      if (parseInt(home_score) > parseInt(away_score)) result = 'home_win';
      else if (parseInt(away_score) > parseInt(home_score)) result = 'away_win';

      const match = await Match.create({
        fixture_id,
        home_score: parseInt(home_score),
        away_score: parseInt(away_score),
        played_date: played_date || fixture.match_date,
        result,
        weather_conditions,
        match_report
      }, { transaction });

      await fixture.update({ status: 'completed' }, { transaction });
      await transaction.commit();

      const full = await Match.findByPk(match.id, {
        include: [{
          model: Fixture, as: 'fixture',
          include: [
            { model: Team, as: 'homeTeam', attributes: ['id', 'name'] },
            { model: Team, as: 'awayTeam', attributes: ['id', 'name'] }
          ]
        }]
      });

      logger.info(`Match recorded: ${match.id} — ${fixture.homeTeam?.name} ${home_score}–${away_score} ${fixture.awayTeam?.name}`);
      return successResponse(res, full, 'Match result recorded successfully', 201);
    } catch (error) {
      await transaction.rollback();
      logger.error('Create match error:', error);
      return errorResponse(res, 'Failed to record match', 500);
    }
  },

  // ── PUT /matches/:id  ────────────────────────────────────────────────────
  update: async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
      const match = await Match.findByPk(req.params.id, { transaction });
      if (!match) {
        await transaction.rollback();
        return errorResponse(res, 'Match not found', 404);
      }

      const { home_score, away_score, played_date, weather_conditions, match_report } = req.body;

      // Recompute result whenever scores are supplied
      let result = match.result;
      const hs = home_score !== undefined ? parseInt(home_score) : match.home_score;
      const as_ = away_score !== undefined ? parseInt(away_score) : match.away_score;
      if (home_score !== undefined || away_score !== undefined) {
        if (hs > as_) result = 'home_win';
        else if (as_ > hs) result = 'away_win';
        else result = 'draw';
      }

      await match.update({
        home_score: hs,
        away_score: as_,
        result,
        ...(played_date        && { played_date }),
        ...(weather_conditions !== undefined && { weather_conditions }),
        ...(match_report       !== undefined && { match_report })
      }, { transaction });

      await transaction.commit();

      const updated = await Match.findByPk(match.id, {
        include: [{
          model: Fixture, as: 'fixture',
          include: [
            { model: Team, as: 'homeTeam', attributes: ['id', 'name'] },
            { model: Team, as: 'awayTeam', attributes: ['id', 'name'] }
          ]
        }]
      });

      logger.info(`Match updated: ${match.id} → ${hs}–${as_} (${result})`);
      return successResponse(res, updated, 'Match result updated successfully');
    } catch (error) {
      await transaction.rollback();
      logger.error('Update match error:', error);
      return errorResponse(res, 'Failed to update match', 500);
    }
  },

  // ── POST /matches/:match_id/performances ─────────────────────────────────
  addPerformance: async (req, res) => {
    try {
      const { match_id } = req.params;
      const { performances } = req.body;

      if (!Array.isArray(performances) || performances.length === 0) {
        return errorResponse(res, 'performances must be a non-empty array', 400);
      }

      const match = await Match.findByPk(match_id);
      if (!match) return errorResponse(res, 'Match not found', 404);

      await Performance.destroy({ where: { match_id } });
      const created = await Performance.bulkCreate(
        performances.map(p => ({ ...p, match_id: parseInt(match_id) })),
        { validate: true }
      );

      const playerIds = performances.map((p) => p.player_id);
      const ratingsCalculated = await calculateRatingsForPlayers(playerIds);

      logger.info(`Performance data saved for match ${match_id}: ${created.length} records, ${ratingsCalculated} ratings updated`);
      return successResponse(res, { performances: created, ratings_calculated: ratingsCalculated }, 'Performance data recorded', 201);
    } catch (error) {
      logger.error('Add performance error:', error);
      return errorResponse(res, 'Failed to record performance data', 500);
    }
  }
};

module.exports = matchController;
