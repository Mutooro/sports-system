const { Hall } = require('../models');
const { successResponse, errorResponse } = require('../utils/helpers');

const hallController = {
  getAll: async (req, res) => {
    try {
      const halls = await Hall.findAll({
        order: [['name', 'ASC']]
      });
      return successResponse(res, halls);
    } catch (error) {
      return errorResponse(res, 'Failed to retrieve halls', 500);
    }
  },

  getById: async (req, res) => {
    try {
      const hall = await Hall.findByPk(req.params.id);
      if (!hall) return errorResponse(res, 'Hall not found', 404);
      return successResponse(res, hall);
    } catch (error) {
      return errorResponse(res, 'Failed to retrieve hall', 500);
    }
  }
};

module.exports = hallController;