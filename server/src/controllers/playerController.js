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

      // Require a user_id and verify the user exists
      if (!playerData.user_id) {
        return errorResponse(res, 'user_id is required to create a player', 400);
      }

      const user = await User.findByPk(playerData.user_id);
      if (!user) return errorResponse(res, 'Associated user not found', 404);

      // Only students should have player profiles created
      if (user.role !== 'student') {
        return errorResponse(res, 'Only users with role "student" can have a player profile', 400);
      }

      // Prevent duplicate player profiles for the same user
      const existing = await Player.findOne({ where: { user_id: playerData.user_id } });
      if (existing) {
        return errorResponse(res, 'Player profile already exists for this user', 409);
      }

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
  },

  // Bulk create players from CSV/JSON import
  bulkCreate: async (req, res) => {
    try {
      const { players } = req.body;
      if (!Array.isArray(players) || players.length === 0) {
        return errorResponse(res, 'players must be a non-empty array', 400);
      }

      const { Op } = require('sequelize');
      const DEFAULT_PASSWORD = 'Student@123';

      const created = [];
      const errors = [];

      for (let i = 0; i < players.length; i++) {
        const row = players[i];
        try {
          const email = row.email?.trim().toLowerCase();
          if (!email) throw new Error('email is required');
          if (!row.student_number) throw new Error('student_number is required');

          let user = await User.findOne({ where: { email } });
          if (!user) {
            if (!row.first_name || !row.last_name) {
              throw new Error('first_name and last_name required for new users');
            }
            user = await User.create({
              email,
              first_name: row.first_name.trim(),
              last_name: row.last_name.trim(),
              password: row.password || DEFAULT_PASSWORD,
              role: 'student'
            });
          } else if (user.role !== 'student') {
            throw new Error('User exists but is not a student');
          }

          const existing = await Player.findOne({ where: { user_id: user.id } });
          if (existing) throw new Error('Player profile already exists for this user');

          const duplicateStudentNum = await Player.findOne({ where: { student_number: row.student_number } });
          if (duplicateStudentNum) throw new Error('student_number already in use');

          let hall_id = row.hall_id ? parseInt(row.hall_id) : null;
          if (!hall_id && row.hall_name) {
            const hall = await Hall.findOne({ where: { name: { [Op.iLike]: row.hall_name.trim() } } });
            if (!hall) throw new Error(`Hall not found: ${row.hall_name}`);
            hall_id = hall.id;
          }

          let team_id = row.team_id ? parseInt(row.team_id) : null;
          if (!team_id && row.team_name) {
            const team = await Team.findOne({ where: { name: { [Op.iLike]: row.team_name.trim() } } });
            if (team) team_id = team.id;
          }

          const player = await Player.create({
            user_id: user.id,
            student_number: String(row.student_number).trim(),
            position: row.position || null,
            sport: row.sport || 'football',
            hall_id,
            team_id,
            date_of_birth: row.date_of_birth || null,
            height: row.height || null,
            weight: row.weight || null
          });

          created.push(player);
        } catch (err) {
          errors.push({ row: i + 2, email: row.email || '', message: err.message });
        }
      }

      logger.info(`Bulk player import: ${created.length} created, ${errors.length} failed`);
      return successResponse(res, {
        created: created.length,
        failed: errors.length,
        errors
      }, `Imported ${created.length} player(s)`);
    } catch (error) {
      logger.error('Bulk create players error:', error);
      return errorResponse(res, 'Failed to bulk import players', 500);
    }
  }
};

module.exports = playerController;
