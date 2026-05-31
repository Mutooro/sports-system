const { Player, User, Team, Hall, Performance, Rating, FitnessRecord, sequelize } = require('../models');
const { successResponse, errorResponse, paginate } = require('../utils/helpers');
const { logger } = require('../utils/logger');

const playerController = {
  // Get all players with filters
  getAll: async (req, res) => {
    try {
      const { page = 1, limit = 10, search, position, hall_id, team_id, sport } = req.query;

      const where = {};
      if (position) where.position = position;
      if (hall_id) where.hall_id = hall_id;
      if (team_id) where.team_id = team_id;
      if (sport) where.sport = sport;

      const include = [
        { model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'email'] },
        { model: Team, as: 'team', attributes: ['id', 'name'] },
        { model: Hall, as: 'hall', attributes: ['id', 'name'] }
      ];

      // Search by name
      if (search) {
        include[0].where = {
          [require('sequelize').Op.or]: [
            { first_name: { [require('sequelize').Op.iLike]: `%${search}%` } },
            { last_name: { [require('sequelize').Op.iLike]: `%${search}%` } }
          ]
        };
      }

      const { count, rows: players } = await Player.findAndCountAll({
        where,
        include,
        ...paginate({}, { page, limit }),
        order: [['created_at', 'DESC']]
      });

      return successResponse(res, {
        players,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      logger.error('Get players error:', error);
      return errorResponse(res, 'Failed to retrieve players', 500);
    }
  },

  // Get single player with full details
  getById: async (req, res) => {
    try {
      const { id } = req.params;

      const player = await Player.findByPk(id, {
        include: [
          { model: User, as: 'user', attributes: { exclude: ['password'] } },
          { model: Team, as: 'team' },
          { model: Hall, as: 'hall' },
          { 
            model: Performance, 
            as: 'performances',
            include: [{ model: require('../models').Match, as: 'match' }],
            limit: 10,
            order: [['created_at', 'DESC']]
          },
          { 
            model: Rating, 
            as: 'ratings',
            limit: 1,
            order: [['calculation_date', 'DESC']]
          },
          { 
            model: FitnessRecord, 
            as: 'fitnessRecords',
            limit: 5,
            order: [['record_date', 'DESC']]
          }
        ]
      });

      if (!player) {
        return errorResponse(res, 'Player not found', 404);
      }

      return successResponse(res, player);
    } catch (error) {
      logger.error('Get player error:', error);
      return errorResponse(res, 'Failed to retrieve player', 500);
    }
  },

  // Create player
  create: async (req, res) => {
    try {
      const playerData = req.body;

      const player = await Player.create(playerData);
      const newPlayer = await Player.findByPk(player.id, {
        include: [
          { model: User, as: 'user', attributes: ['first_name', 'last_name', 'email'] },
          { model: Team, as: 'team' }
        ]
      });

      logger.info(`Player created: ${player.id}`);
      return successResponse(res, newPlayer, 'Player created successfully', 201);
    } catch (error) {
      logger.error('Create player error:', error);
      return errorResponse(res, 'Failed to create player', 500);
    }
  },

  // Update player
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const player = await Player.findByPk(id);
      if (!player) {
        return errorResponse(res, 'Player not found', 404);
      }

      await player.update(updateData);

      const updated = await Player.findByPk(id, {
        include: [
          { model: User, as: 'user', attributes: ['first_name', 'last_name'] },
          { model: Team, as: 'team' }
        ]
      });

      logger.info(`Player updated: ${id}`);
      return successResponse(res, updated, 'Player updated successfully');
    } catch (error) {
      logger.error('Update player error:', error);
      return errorResponse(res, 'Failed to update player', 500);
    }
  },

  // Delete player
  delete: async (req, res) => {
    try {
      const { id } = req.params;
      const player = await Player.findByPk(id);

      if (!player) {
        return errorResponse(res, 'Player not found', 404);
      }

      await player.destroy();
      logger.info(`Player deleted: ${id}`);
      return successResponse(res, null, 'Player deleted successfully');
    } catch (error) {
      logger.error('Delete player error:', error);
      return errorResponse(res, 'Failed to delete player', 500);
    }
  },

  // Search players
  search: async (req, res) => {
    try {
      const { q } = req.query;
      const { Op } = require('sequelize');

      const players = await Player.findAll({
        include: [
          { 
            model: User, 
            as: 'user',
            where: {
              [Op.or]: [
                { first_name: { [Op.iLike]: `%${q}%` } },
                { last_name: { [Op.iLike]: `%${q}%` } },
                { email: { [Op.iLike]: `%${q}%` } }
              ]
            },
            attributes: ['first_name', 'last_name', 'email']
          },
          { model: Team, as: 'team', attributes: ['name'] }
        ],
        limit: 20
      });

      return successResponse(res, players);
    } catch (error) {
      return errorResponse(res, 'Search failed', 500);
    }
  }
};

module.exports = playerController;
