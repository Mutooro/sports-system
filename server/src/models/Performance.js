const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Performance = sequelize.define('Performance', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  match_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'matches', key: 'id' }
  },
  player_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'players', key: 'id' }
  },
  goals: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  assists: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  minutes_played: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  yellow_cards: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  red_cards: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  tackles: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  passes_completed: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  shots_on_target: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  rating: {
    type: DataTypes.DECIMAL(3, 1),
    allowNull: true,
    comment: 'Coach rating 1-10'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'performances'
});

module.exports = Performance;
