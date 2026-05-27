const Sequelize = require('sequelize');
const sequelize = require('../config/database');

// Import models
const User = require('./User');
const Player = require('./Player');
const Team = require('./Team');
const Hall = require('./Hall');
const Fixture = require('./Fixture');
const Match = require('./Match');
const Performance = require('./Performance');
const Rating = require('./Rating');
const FitnessRecord = require('./FitnessRecord');
const Notification = require('./Notification');
const AuditLog = require('./AuditLog');

// Define associations
User.hasOne(Player, { foreignKey: 'user_id', as: 'playerProfile' });
Player.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Hall.hasMany(Team, { foreignKey: 'hall_id', as: 'teams' });
Team.belongsTo(Hall, { foreignKey: 'hall_id', as: 'hall' });

Team.hasMany(Player, { foreignKey: 'team_id', as: 'players' });
Player.belongsTo(Team, { foreignKey: 'team_id', as: 'team' });

User.hasMany(Team, { foreignKey: 'coach_id', as: 'coachedTeams' });
Team.belongsTo(User, { foreignKey: 'coach_id', as: 'coach' });

Team.hasMany(Fixture, { foreignKey: 'home_team_id', as: 'homeFixtures' });
Team.hasMany(Fixture, { foreignKey: 'away_team_id', as: 'awayFixtures' });
Fixture.belongsTo(Team, { foreignKey: 'home_team_id', as: 'homeTeam' });
Fixture.belongsTo(Team, { foreignKey: 'away_team_id', as: 'awayTeam' });

Fixture.hasOne(Match, { foreignKey: 'fixture_id', as: 'matchResult' });
Match.belongsTo(Fixture, { foreignKey: 'fixture_id', as: 'fixture' });

Match.hasMany(Performance, { foreignKey: 'match_id', as: 'performances' });
Performance.belongsTo(Match, { foreignKey: 'match_id', as: 'match' });

Player.hasMany(Performance, { foreignKey: 'player_id', as: 'performances' });
Performance.belongsTo(Player, { foreignKey: 'player_id', as: 'player' });

Player.hasMany(Rating, { foreignKey: 'player_id', as: 'ratings' });
Rating.belongsTo(Player, { foreignKey: 'player_id', as: 'player' });

Player.hasMany(FitnessRecord, { foreignKey: 'player_id', as: 'fitnessRecords' });
FitnessRecord.belongsTo(Player, { foreignKey: 'player_id', as: 'player' });

User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'auditLogs' });
AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = {
  sequelize,
  User,
  Player,
  Team,
  Hall,
  Fixture,
  Match,
  Performance,
  Rating,
  FitnessRecord,
  Notification,
  AuditLog
};
