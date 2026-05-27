const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Rating = sequelize.define('Rating', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  player_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'players', key: 'id' }
  },
  overall: {
    type: DataTypes.DECIMAL(3, 1),
    allowNull: false,
    comment: 'Calculated overall rating 1-10'
  },
  attack: {
    type: DataTypes.DECIMAL(3, 1),
    defaultValue: 5.0
  },
  defense: {
    type: DataTypes.DECIMAL(3, 1),
    defaultValue: 5.0
  },
  fitness: {
    type: DataTypes.DECIMAL(3, 1),
    defaultValue: 5.0
  },
  teamwork: {
    type: DataTypes.DECIMAL(3, 1),
    defaultValue: 5.0
  },
  discipline: {
    type: DataTypes.DECIMAL(3, 1),
    defaultValue: 5.0
  },
  calculation_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'ratings'
});

module.exports = Rating;
