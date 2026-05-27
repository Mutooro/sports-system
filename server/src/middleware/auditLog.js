const { AuditLog } = require('../models');
const { logger } = require('../utils/logger');

const auditLog = (action, entityType) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json;

    res.json = function(data) {
      // Restore original method
      res.json = originalJson;

      // Log after response is sent
      res.on('finish', async () => {
        try {
          if (req.user && res.statusCode < 400) {
            await AuditLog.create({
              user_id: req.user.id,
              action,
              entity_type: entityType,
              entity_id: req.params.id || null,
              details: JSON.stringify({
                method: req.method,
                path: req.path,
                body: req.method !== 'GET' ? req.body : undefined,
                ip: req.ip,
                userAgent: req.get('user-agent')
              }),
              created_at: new Date()
            });
          }
        } catch (error) {
          logger.error('Audit log failed:', error);
        }
      });

      return originalJson.call(this, data);
    };

    next();
  };
};

module.exports = auditLog;
