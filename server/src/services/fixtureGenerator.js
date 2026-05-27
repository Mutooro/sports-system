const { Fixture } = require('../models');
const { logger } = require('../utils/logger');

const FixtureGenerator = {
  generateAndSave: async (teams, options) => {
    logger.info('FixtureGenerator.generateAndSave called with', {
      teamCount: teams.length,
      options
    });

    // Placeholder implementation: do not generate fixtures yet.
    // Return an empty array so feature-dependent code can still work.
    return [];
  }
};

module.exports = FixtureGenerator;
