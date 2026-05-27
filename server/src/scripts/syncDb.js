const { sequelize } = require('../models');

const syncDatabase = async () => {
  try {
    await sequelize.sync({ force: true });
    console.log('✅ Database synchronized successfully (force: true)');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database sync failed:', error);
    process.exit(1);
  }
};

syncDatabase();
