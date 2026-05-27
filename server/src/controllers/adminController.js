const { User, AuditLog, sequelize } = require('../models');
const { successResponse, errorResponse, paginate } = require('../utils/helpers');

const adminController = {
  // Get all users
  getUsers: async (req, res) => {
    try {
      const { page = 1, limit = 20, role, is_active } = req.query;
      const where = {};
      if (role) where.role = role;
      if (is_active !== undefined) where.is_active = is_active === 'true';

      const { count, rows: users } = await User.findAndCountAll({
        where,
        attributes: { exclude: ['password'] },
        ...paginate({}, { page, limit }),
        order: [['created_at', 'DESC']]
      });

      return successResponse(res, {
        users,
        pagination: { page: parseInt(page), limit: parseInt(limit), total: count }
      });
    } catch (error) {
      return errorResponse(res, 'Failed to retrieve users', 500);
    }
  },

  // Toggle user status
  toggleUserStatus: async (req, res) => {
    try {
      const user = await User.findByPk(req.params.id);
      if (!user) {
        return errorResponse(res, 'User not found', 404);
      }

      await user.update({ is_active: !user.is_active });
      return successResponse(res, user, `User ${user.is_active ? 'activated' : 'deactivated'}`);
    } catch (error) {
      return errorResponse(res, 'Failed to update user', 500);
    }
  },

  // Get audit logs
  getAuditLogs: async (req, res) => {
    try {
      const { page = 1, limit = 50, action, entity_type } = req.query;
      const where = {};
      if (action) where.action = action;
      if (entity_type) where.entity_type = entity_type;

      const { count, rows: logs } = await AuditLog.findAndCountAll({
        where,
        include: [
          { model: User, as: 'user', attributes: ['first_name', 'last_name', 'email', 'role'] }
        ],
        ...paginate({}, { page, limit }),
        order: [['created_at', 'DESC']]
      });

      return successResponse(res, {
        logs,
        pagination: { page: parseInt(page), limit: parseInt(limit), total: count }
      });
    } catch (error) {
      return errorResponse(res, 'Failed to retrieve audit logs', 500);
    }
  },

  // Dashboard stats
  getDashboardStats: async (req, res) => {
    try {
      const stats = await Promise.all([
        User.count(),
        User.count({ where: { role: 'student' } }),
        User.count({ where: { role: 'coach' } }),
        require('../models').Player.count(),
        require('../models').Fixture.count(),
        require('../models').Fixture.count({ where: { status: 'scheduled' } }),
        require('../models').Match.count()
      ]);

      return successResponse(res, {
        totalUsers: stats[0],
        totalStudents: stats[1],
        totalCoaches: stats[2],
        totalPlayers: stats[3],
        totalFixtures: stats[4],
        upcomingFixtures: stats[5],
        totalMatches: stats[6]
      });
    } catch (error) {
      return errorResponse(res, 'Failed to retrieve stats', 500);
    }
  }
};

module.exports = adminController;
