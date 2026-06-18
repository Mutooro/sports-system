const { Rating, Player, Performance, sequelize } = require('../models');
const { logger } = require('../utils/logger');

async function calculateRatingForPlayer(playerId) {
  const player = await Player.findByPk(playerId);
  if (!player) return null;

  const performances = await Performance.findAll({
    where: { player_id: playerId },
    order: [['created_at', 'DESC']],
    limit: 10
  });

  if (performances.length === 0) return null;

  const totalGoals = performances.reduce((sum, p) => sum + p.goals, 0);
  const totalAssists = performances.reduce((sum, p) => sum + p.assists, 0);
  const avgMinutes = performances.reduce((sum, p) => sum + p.minutes_played, 0) / performances.length;
  const avgRating = performances.reduce((sum, p) => sum + (p.rating || 5), 0) / performances.length;
  const totalMatches = performances.length;

  const attack = Math.min(10, (totalGoals * 1.5 + totalAssists * 1.0 + avgRating * 0.5) / Math.max(totalMatches * 0.3, 1));
  const defense = Math.min(10, avgRating * 0.8 + (avgMinutes / 90) * 2);
  const fitness = Math.min(10, (avgMinutes / 90) * 8 + 2);
  const teamwork = Math.min(10, avgRating * 0.9 + (totalAssists * 0.5));
  const discipline = Math.min(10, 10 - (performances.reduce((sum, p) => sum + p.yellow_cards + p.red_cards * 2, 0) / Math.max(totalMatches, 1)));

  const overall = (attack + defense + fitness + teamwork + discipline) / 5;

  const rating = await Rating.create({
    player_id: playerId,
    overall: parseFloat(overall.toFixed(1)),
    attack: parseFloat(attack.toFixed(1)),
    defense: parseFloat(defense.toFixed(1)),
    fitness: parseFloat(fitness.toFixed(1)),
    teamwork: parseFloat(teamwork.toFixed(1)),
    discipline: parseFloat(discipline.toFixed(1)),
    calculation_date: new Date()
  });

  logger.info(`Rating calculated for player: ${playerId}`);
  return rating;
}

async function calculateRatingsForPlayers(playerIds) {
  const uniqueIds = [...new Set(playerIds.filter(Boolean))];
  const results = await Promise.allSettled(
    uniqueIds.map((id) => calculateRatingForPlayer(id))
  );
  return results.filter((r) => r.status === 'fulfilled' && r.value).length;
}

async function recalculateAllRatings() {
  const rows = await sequelize.query(
    'SELECT DISTINCT player_id FROM performances',
    { type: sequelize.QueryTypes.SELECT }
  );
  const playerIds = rows.map((r) => r.player_id);
  const calculated = await calculateRatingsForPlayers(playerIds);
  return { calculated, eligible: playerIds.length };
}

module.exports = {
  calculateRatingForPlayer,
  calculateRatingsForPlayers,
  recalculateAllRatings
};
