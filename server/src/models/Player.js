const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Player = sequelize.define('Player', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  student_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  height: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Height in cm'
  },
  weight: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Weight in kg'
  },
  position: {
    type: DataTypes.ENUM('goalkeeper', 'defender', 'midfielder', 'forward', 'winger'),
    allowNull: true
  },
  sport: {
    type: DataTypes.ENUM('football', 'rugby', 'basketball', 'swimming', 'athletics'),
    defaultValue: 'football'
  },
  team_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'teams',
      key: 'id'
    }
  },
  hall_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'halls',
      key: 'id'
    }
  },
  date_of_birth: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  photo_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'players'
});

module.exports = Player;
