const { User, Player } = require('../models');
const {
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  successResponse,
  errorResponse
} = require('../utils/helpers');
const { logger } = require('../utils/logger');

const authController = {
  // Register a new student account. Coach and admin accounts are created via
  // POST /admin/users so the public endpoint cannot be used for privilege
  // escalation (gap analysis item #5).
  register: async (req, res) => {
    try {
      const { email, password, first_name, last_name, phone, student_number } = req.body;
      const role = 'student';

      if (!email || !password || !first_name || !last_name || !student_number) {
        return errorResponse(res, 'email, password, first_name, last_name and student_number are required', 400);
      }

      const trimmedNumber = String(student_number).trim();
      if (trimmedNumber === '') {
        return errorResponse(res, 'student_number is required', 400);
      }

      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return errorResponse(res, 'Email already registered', 409);
      }

      const existingNumber = await User.findOne({ where: { student_number: trimmedNumber } });
      if (existingNumber) {
        return errorResponse(res, 'Student number already in use', 409);
      }

      const user = await User.create({
        email,
        password,
        first_name,
        last_name,
        role,
        phone,
        student_number: trimmedNumber
      });

      const userData = await User.findByPk(user.id, {
        attributes: { exclude: ['password'] },
        include: [{ model: Player, as: 'playerProfile' }]
      });

      logger.info(`New student registered: ${email}`);
      return successResponse(res, userData, 'Registration successful', 201);
    } catch (error) {
      logger.error('Registration error:', error);
      return errorResponse(res, 'Registration failed', 500);
    }
  },

  // Login
  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({
        where: { email },
        include: [{ model: Player, as: 'playerProfile' }]
      });

      if (!user || !user.is_active) {
        return errorResponse(res, 'Invalid credentials', 401);
      }

      const isValidPassword = await comparePassword(password, user.password);
      if (!isValidPassword) {
        return errorResponse(res, 'Invalid credentials', 401);
      }

      // Update last login
      await user.update({ last_login: new Date() });

      const payload = {
        id: user.id,
        email: user.email,
        role: user.role
      };

      const accessToken = generateAccessToken(payload);
      const refreshToken = generateRefreshToken(payload);

      const userData = {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        student_number: user.student_number,
        playerProfile: user.playerProfile
      };

      logger.info(`User logged in: ${email}`);
      return successResponse(res, {
        user: userData,
        accessToken,
        refreshToken
      }, 'Login successful');
    } catch (error) {
      logger.error('Login error:', error);
      return errorResponse(res, 'Login failed', 500);
    }
  },

  // Refresh token
  refresh: async (req, res) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return errorResponse(res, 'Refresh token required', 401);
      }

      const decoded = require('../utils/helpers').verifyToken(refreshToken, process.env.JWT_REFRESH_SECRET);
      const user = await User.findByPk(decoded.id);

      if (!user || !user.is_active) {
        return errorResponse(res, 'Invalid refresh token', 401);
      }

      const payload = { id: user.id, email: user.email, role: user.role };
      const newAccessToken = generateAccessToken(payload);

      return successResponse(res, { accessToken: newAccessToken }, 'Token refreshed');
    } catch (error) {
      return errorResponse(res, 'Invalid refresh token', 401);
    }
  },

  // Get current user
  me: async (req, res) => {
    try {
      const user = await User.findByPk(req.user.id, {
        attributes: { exclude: ['password'] },
        include: [
          { model: Player, as: 'playerProfile' },
          {
            model: require('../models').Notification,
            as: 'notifications',
            limit: 5,
            order: [['created_at', 'DESC']]
          }
        ]
      });
      return successResponse(res, user, 'User profile retrieved');
    } catch (error) {
      return errorResponse(res, 'Failed to retrieve profile', 500);
    }
  },

  // Logout (refresh-token rotation/revocation tracked separately).
  logout: async (req, res) => {
    logger.info(`User logged out: ${req.user.email}`);
    return successResponse(res, null, 'Logout successful');
  },

  // Get all coaches (for dropdown)
  getCoaches: async (req, res) => {
    try {
      const coaches = await User.findAll({
        where: {
          role: 'coach',
          is_active: true
        },
        attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'created_at'],
        order: [['first_name', 'ASC']]
      });

      logger.info(`Found ${coaches.length} coaches`);
      return successResponse(res, coaches, 'Coaches retrieved');
    } catch (error) {
      logger.error('Get coaches error:', error);
      return errorResponse(res, 'Failed to retrieve coaches', 500);
    }
  }
};

module.exports = authController;
