const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Fixture = sequelize.define('Fixture', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  home_team_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'teams', key: 'id' }
  },
  away_team_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'teams', key: 'id' }
  },
  venue: {
    type: DataTypes.ENUM('football_pitch', 'rugby_ground', 'swimming_pool', 'basketball_court', 'athletics_track'),
    allowNull: false
  },
  match_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('scheduled', 'postponed', 'cancelled', 'completed'),
    defaultValue: 'scheduled'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'fixtures'
});

module.exports = Fixture;
