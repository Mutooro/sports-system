const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Hall = sequelize.define('Hall', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  location: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  capacity: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'halls'
});

module.exports = Hall;
