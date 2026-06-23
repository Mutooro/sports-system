const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Match = sequelize.define('Match', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  fixture_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'fixtures', key: 'id' }
  },
  home_score: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  away_score: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  played_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  result: {
    type: DataTypes.ENUM('home_win', 'away_win', 'draw', 'no_result'),
    allowNull: true
  },
  weather_conditions: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  match_report: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  home_lineup: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Array of player ids in the home starting XI for this match'
  },
  away_lineup: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Array of player ids in the away starting XI for this match'
  }
}, {
  tableName: 'matches'
});

module.exports = Match;