const { Notification, User, Player } = require('../models');
const { successResponse, errorResponse } = require('../utils/helpers');
const { sendFixtureNotification } = require('../utils/emailService');
const { logger } = require('../utils/logger');

const notificationController = {
  // Get my notifications
  getMyNotifications: async (req, res) => {
    try {
      const { page = 1, limit = 10, unread_only } = req.query;
      const where = { user_id: req.user.id };

      if (unread_only === 'true') {
        where.is_read = false;
      }

      const { count, rows: notifications } = await Notification.findAndCountAll({
        where,
        order: [['created_at', 'DESC']],
        offset: (page - 1) * limit,
        limit: parseInt(limit)
      });

      return successResponse(res, {
        notifications,
        unreadCount: await Notification.count({ where: { user_id: req.user.id, is_read: false } }),
        pagination: { page: parseInt(page), limit: parseInt(limit), total: count }
      });
    } catch (error) {
      return errorResponse(res, 'Failed to retrieve notifications', 500);
    }
  },

  // Mark as read
  markAsRead: async (req, res) => {
    try {
      const { id } = req.params;
      const notification = await Notification.findOne({
        where: { id, user_id: req.user.id }
      });

      if (!notification) {
        return errorResponse(res, 'Notification not found', 404);
      }

      await notification.update({ is_read: true });
      return successResponse(res, null, 'Notification marked as read');
    } catch (error) {
      return errorResponse(res, 'Failed to update notification', 500);
    }
  },

  // Send bulk notification (coach/admin)
  sendBulk: async (req, res) => {
    try {
      const { user_ids, title, message, type = 'general' } = req.body;

      const notifications = await Notification.bulkCreate(
        user_ids.map(user_id => ({
          user_id,
          title,
          message,
          type,
          sent_via: 'in_app',
          sent_at: new Date()
        }))
      );

      logger.info(`Bulk notification sent to ${user_ids.length} users`);
      return successResponse(res, notifications, 'Notifications sent', 201);
    } catch (error) {
      return errorResponse(res, 'Failed to send notifications', 500);
    }
  }
};

module.exports = notificationController;
