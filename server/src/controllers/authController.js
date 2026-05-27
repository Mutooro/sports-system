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
  // Register new user
  register: async (req, res) => {
    try {
      const { email, password, first_name, last_name, role, phone, student_number, hall_id } = req.body;

      // Check if user exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return errorResponse(res, 'Email already registered', 409);
      }

      // Create user
      const user = await User.create({
        email,
        password,
        first_name,
        last_name,
        role: role || 'student',
        phone
      });

      // If student, create player profile
      if (role === 'student' || !role) {
        await Player.create({
          user_id: user.id,
          student_number: student_number || `STU${Date.now()}`,
          hall_id: hall_id || null
        });
      }

      const userData = await User.findByPk(user.id, {
        attributes: { exclude: ['password'] },
        include: [{ model: Player, as: 'playerProfile' }]
      });

      logger.info(`New user registered: ${email}`);
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
          { model: require('../models').Notification, as: 'notifications', limit: 5 }
        ]
      });
      return successResponse(res, user, 'User profile retrieved');
    } catch (error) {
      return errorResponse(res, 'Failed to retrieve profile', 500);
    }
  },

  // Logout
  logout: async (req, res) => {
    // In a more advanced setup, you'd blacklist the token in Redis
    logger.info(`User logged out: ${req.user.email}`);
    return successResponse(res, null, 'Logout successful');
  }
};

module.exports = authController;
