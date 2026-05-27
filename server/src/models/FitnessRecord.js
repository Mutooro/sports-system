const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FitnessRecord = sequelize.define('FitnessRecord', {
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
  record_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  blood_pressure_systolic: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  blood_pressure_diastolic: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  heart_rate: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  weight: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  },
  injury_type: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  injury_status: {
    type: DataTypes.ENUM('fit', 'minor', 'moderate', 'severe', 'recovering'),
    defaultValue: 'fit'
  },
  recovery_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  recorded_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'users', key: 'id' }
  }
}, {
  tableName: 'fitness_records'
});

module.exports = FitnessRecord;
