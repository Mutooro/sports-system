const { Player, User, Team, Hall, Performance, Rating, FitnessRecord, sequelize } = require('../models');
const { successResponse, errorResponse, paginate } = require('../utils/helpers');
const { logger } = require('../utils/logger');

const VALID_POSITIONS = new Set(['goalkeeper', 'defender', 'midfielder', 'forward', 'winger']);
const POSITION_ALIASES = {
  gk: 'goalkeeper', keeper: 'goalkeeper', goalie: 'goalkeeper',
  def: 'defender', cb: 'defender', lb: 'defender', rb: 'defender',
  'centre-back': 'defender', centerback: 'defender', fullback: 'defender',
  mid: 'midfielder', cm: 'midfielder', dm: 'midfielder', am: 'midfielder',
  fwd: 'forward', striker: 'forward', cf: 'forward', st: 'forward', attacker: 'forward',
  wing: 'winger', lw: 'winger', rw: 'winger'
};
function normalizePosition(raw) {
  if (!raw || typeof raw !== 'string' || !raw.trim()) return null;
  const key = raw.trim().toLowerCase();
  if (VALID_POSITIONS.has(key)) return key;
  if (POSITION_ALIASES[key]) return POSITION_ALIASES[key];
  for (const pos of VALID_POSITIONS) { if (key.includes(pos)) return pos; }
  return null;
}

/**
 * Enforce the strict hall/team pairing: if team_id is set, team.hall_id must
 * equal player.hall_id. Returns an error message string on mismatch, or null
 * when the pairing is valid.
 */
async function validateHallTeamPairing(hallId, teamId) {
  if (!teamId) return null;
  const team = await Team.findByPk(teamId);
  if (!team) return 'Team not found';
  if (parseInt(team.hall_id) !== parseInt(hallId)) {
    return `Player hall (${hallId}) does not match team hall (${team.hall_id})`;
  }
  return null;
}

const playerController = {
  // List players (filters by position, hall, team, sport, and free-text search).
  getAll: async (req, res) => {
    try {
      const { page = 1, limit = 10, search, position, hall_id, team_id, sport, include_inactive } = req.query;

      const where = {};
      if (position) where.position = position;
      if (hall_id) where.hall_id = hall_id;
      if (team_id) where.team_id = team_id;
      if (sport) where.sport = sport;
      // By default only return active players; admins/coaches can pass
      // ?include_inactive=true to see retired ones.
      if (include_inactive !== 'true') where.is_active = true;

      const include = [
        { model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'email', 'student_number'] },
        { model: Team, as: 'team', attributes: ['id', 'name'] },
        { model: Hall, as: 'hall', attributes: ['id', 'name'] }
      ];

      if (search) {
        const { Op } = require('sequelize');
        include[0].where = {
          [Op.or]: [
            { first_name: { [Op.iLike]: `%${search}%` } },
            { last_name: { [Op.iLike]: `%${search}%` } },
            { student_number: { [Op.iLike]: `%${search}%` } }
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

  // Get a single player.
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

  // Create a player profile (coach/admin only). The associated user must already
  // exist as a student; one Player row per (user, sport).
  create: async (req, res) => {
    try {
      const playerData = { ...req.body };

      if (!playerData.user_id) {
        return errorResponse(res, 'user_id is required', 400);
      }
      if (!playerData.hall_id) {
        return errorResponse(res, 'hall_id is required', 400);
      }

      const user = await User.findByPk(playerData.user_id);
      if (!user) return errorResponse(res, 'Associated user not found', 404);
      if (user.role !== 'student') {
        return errorResponse(res, 'Only users with role "student" can have a player profile', 400);
      }

      const sport = playerData.sport || 'football';
      const existing = await Player.findOne({
        where: { user_id: playerData.user_id, sport }
      });
      if (existing) {
        return errorResponse(res, `Player profile already exists for sport "${sport}"`, 409);
      }

      const pairingError = await validateHallTeamPairing(playerData.hall_id, playerData.team_id);
      if (pairingError) return errorResponse(res, pairingError, 400);

      playerData.sport = sport;
      if (playerData.is_active === undefined) playerData.is_active = true;
      if (playerData.position !== undefined) playerData.position = normalizePosition(playerData.position);

      const player = await Player.create(playerData);
      const newPlayer = await Player.findByPk(player.id, {
        include: [
          { model: User, as: 'user', attributes: ['first_name', 'last_name', 'email', 'student_number'] },
          { model: Team, as: 'team' },
          { model: Hall, as: 'hall' }
        ]
      });

      logger.info(`Player created: ${player.id} (sport=${sport})`);
      return successResponse(res, newPlayer, 'Player created successfully', 201);
    } catch (error) {
      logger.error('Create player error:', error);
      return errorResponse(res, 'Failed to create player', 500);
    }
  },

  // Update a player profile.
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = { ...req.body };

      const player = await Player.findByPk(id);
      if (!player) {
        return errorResponse(res, 'Player not found', 404);
      }

      // Validate the (post-update) hall/team pairing whenever either field is
      // being touched. We use the merged values, not just the request body, so
      // a hall change with no team change still gets validated against the
      // current team.
      const nextHallId = updateData.hall_id !== undefined ? updateData.hall_id : player.hall_id;
      const nextTeamId = updateData.team_id !== undefined ? updateData.team_id : player.team_id;
      const pairingError = await validateHallTeamPairing(nextHallId, nextTeamId);
      if (pairingError) return errorResponse(res, pairingError, 400);

      await player.update(updateData);

      const updated = await Player.findByPk(id, {
        include: [
          { model: User, as: 'user', attributes: ['first_name', 'last_name', 'student_number'] },
          { model: Team, as: 'team' },
          { model: Hall, as: 'hall' }
        ]
      });

      logger.info(`Player updated: ${id}`);
      return successResponse(res, updated, 'Player updated successfully');
    } catch (error) {
      logger.error('Update player error:', error);
      return errorResponse(res, 'Failed to update player', 500);
    }
  },

  // Soft-retire a player (sets is_active=false). Keeps history intact.
  delete: async (req, res) => {
    try {
      const { id } = req.params;
      const player = await Player.findByPk(id);

      if (!player) {
        return errorResponse(res, 'Player not found', 404);
      }

      await player.update({ is_active: false });
      logger.info(`Player retired: ${id}`);
      return successResponse(res, { id: player.id, is_active: false }, 'Player retired successfully');
    } catch (error) {
      logger.error('Retire player error:', error);
      return errorResponse(res, 'Failed to retire player', 500);
    }
  },

  // Re-activate a previously retired player.
  reactivate: async (req, res) => {
    try {
      const { id } = req.params;
      const player = await Player.findByPk(id);
      if (!player) return errorResponse(res, 'Player not found', 404);

      const pairingError = await validateHallTeamPairing(player.hall_id, player.team_id);
      if (pairingError) return errorResponse(res, pairingError, 400);

      await player.update({ is_active: true });
      return successResponse(res, { id: player.id, is_active: true }, 'Player reactivated');
    } catch (error) {
      return errorResponse(res, 'Failed to reactivate player', 500);
    }
  },

  // Search players.
  search: async (req, res) => {
    try {
      const { q } = req.query;
      const { Op } = require('sequelize');

      const players = await Player.findAll({
        where: { is_active: true },
        include: [
          {
            model: User,
            as: 'user',
            where: {
              [Op.or]: [
                { first_name: { [Op.iLike]: `%${q}%` } },
                { last_name: { [Op.iLike]: `%${q}%` } },
                { email: { [Op.iLike]: `%${q}%` } },
                { student_number: { [Op.iLike]: `%${q}%` } }
              ]
            },
            attributes: ['first_name', 'last_name', 'email', 'student_number']
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

  // Bulk create players from CSV/JSON import. Mirrors the per-row constraints
  // enforced in `create` so the import path can't bypass them.
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
              role: 'student',
              student_number: String(row.student_number).trim()
            });
          } else if (user.role !== 'student') {
            throw new Error('User exists but is not a student');
          }

          const sport = row.sport || 'football';

          const existing = await Player.findOne({
            where: { user_id: user.id, sport }
          });
          if (existing) throw new Error(`Player profile already exists for sport "${sport}"`);

          let hall_id = row.hall_id ? parseInt(row.hall_id) : null;
          if (!hall_id && row.hall_name) {
            const hall = await Hall.findOne({ where: { name: { [Op.iLike]: row.hall_name.trim() } } });
            if (!hall) throw new Error(`Hall not found: ${row.hall_name}`);
            hall_id = hall.id;
          }
          if (!hall_id) throw new Error('hall_id or hall_name is required');

          let team_id = row.team_id ? parseInt(row.team_id) : null;
          if (!team_id && row.team_name) {
            const team = await Team.findOne({ where: { name: { [Op.iLike]: row.team_name.trim() } } });
            if (team) team_id = team.id;
          }

          const pairingError = await validateHallTeamPairing(hall_id, team_id);
          if (pairingError) throw new Error(pairingError);

          const player = await Player.create({
            user_id: user.id,
            position: normalizePosition(row.position) || null,
            sport,
            hall_id,
            team_id,
            date_of_birth: row.date_of_birth || null,
            height: row.height || null,
            weight: row.weight || null,
            is_active: row.is_active !== undefined ? !!row.is_active : true
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
