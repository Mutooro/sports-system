const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Team = sequelize.define('Team', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  hall_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'halls',
      key: 'id'
    }
  },
  sport_type: {
    type: DataTypes.ENUM('football', 'rugby', 'basketball', 'swimming', 'athletics'),
    defaultValue: 'football'
  },
  coach_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  formation: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Saved tactical formation: array of { id, label, top, left, playerId }'
  }
}, {
  tableName: 'teams'
});

module.exports = Team;
