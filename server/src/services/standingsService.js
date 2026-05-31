const { Op } = require('sequelize');
const { Match, Fixture, Team, Performance, Player, User } = require('../models');
const { logger } = require('../utils/logger');

/**
 * Calculates league standings from match results
 * Points: Win = 3, Draw = 1, Loss = 0
 */
class StandingsService {
  /**
   * Calculate standings for a sport type
   */
  static async calculateStandings(sportType = 'football') {
    // Get all completed matches with fixtures
    const matches = await Match.findAll({
      include: [
        {
          model: Fixture,
          as: 'fixture',
          where: { sport_type: sportType },
          include: [
            { model: Team, as: 'homeTeam', attributes: ['id', 'name'] },
            { model: Team, as: 'awayTeam', attributes: ['id', 'name'] }
          ]
        }
      ],
      where: {
        result: { [Op.ne]: null }
      }
    });

    // Initialize standings map
    const standingsMap = new Map();

    for (const match of matches) {
      const homeTeam = match.fixture.homeTeam;
      const awayTeam = match.fixture.awayTeam;

      if (!homeTeam || !awayTeam) continue;

      // Initialize teams if not exists
      if (!standingsMap.has(homeTeam.id)) {
        standingsMap.set(homeTeam.id, this.createTeamStats(homeTeam));
      }
      if (!standingsMap.has(awayTeam.id)) {
        standingsMap.set(awayTeam.id, this.createTeamStats(awayTeam));
      }

      const homeStats = standingsMap.get(homeTeam.id);
      const awayStats = standingsMap.get(awayTeam.id);

      // Update played
      homeStats.played++;
      awayStats.played++;

      // Update goals
      homeStats.goals_for += match.home_score;
      homeStats.goals_against += match.away_score;
      awayStats.goals_for += match.away_score;
      awayStats.goals_against += match.home_score;

      // Update result stats
      if (match.result === 'home_win') {
        homeStats.won++;
        homeStats.points += 3;
        awayStats.lost++;
      } else if (match.result === 'away_win') {
        awayStats.won++;
        awayStats.points += 3;
        homeStats.lost++;
      } else {
        homeStats.drawn++;
        awayStats.drawn++;
        homeStats.points += 1;
        awayStats.points += 1;
      }
    }

    // Convert to array and calculate derived stats
    const standings = Array.from(standingsMap.values()).map(stats => ({
      ...stats,
      goal_difference: stats.goals_for - stats.goals_against
    }));

    // Sort: Points → Goal Difference → Goals For
    standings.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference;
      return b.goals_for - a.goals_for;
    });

    // Add position
    standings.forEach((team, index) => {
      team.position = index + 1;
    });

    return standings;
  }

  static createTeamStats(team) {
    return {
      id: team.id,
      name: team.name,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goals_for: 0,
      goals_against: 0,
      goal_difference: 0,
      points: 0
    };
  }

  /**
   * Get season stats: top scorers, assisters, rated players
   */
  static async getSeasonStats(sportType = 'football') {
    // Top scorers
    const topScorers = await Performance.findAll({
      attributes: [
        'player_id',
        [require('../config/database').fn('SUM', require('../config/database').col('goals')), 'total_goals'],
        [require('../config/database').fn('SUM', require('../config/database').col('assists')), 'total_assists']
      ],
      include: [
        {
          model: Player,
          as: 'player',
          include: [
            { model: User, as: 'user', attributes: ['first_name', 'last_name'] },
            { model: Team, as: 'team', attributes: ['name'] }
          ]
        }
      ],
      group: ['player_id', 'player.id', 'player.user.id', 'player.team.id'],
      order: [[require('../config/database').fn('SUM', require('../config/database').col('goals')), 'DESC']],
      limit: 10
    });

    // Top rated players
    const { Rating } = require('../models');
    const topRated = await Rating.findAll({
      include: [
        {
          model: Player,
          as: 'player',
          include: [
            { model: User, as: 'user', attributes: ['first_name', 'last_name'] },
            { model: Team, as: 'team', attributes: ['name'] }
          ]
        }
      ],
      order: [['overall', 'DESC']],
      limit: 10
    });

    return {
      top_scorers: topScorers.map(p => ({
        id: p.player_id,
        name: `${p.player.user.first_name} ${p.player.user.last_name}`,
        team: p.player.team?.name,
        goals: parseInt(p.dataValues.total_goals) || 0,
        assists: parseInt(p.dataValues.total_assists) || 0
      })),
      top_assisters: topScorers
        .sort((a, b) => parseInt(b.dataValues.total_assists) - parseInt(a.dataValues.total_assists))
        .slice(0, 10)
        .map(p => ({
          id: p.player_id,
          name: `${p.player.user.first_name} ${p.player.user.last_name}`,
          team: p.player.team?.name,
          goals: parseInt(p.dataValues.total_goals) || 0,
          assists: parseInt(p.dataValues.total_assists) || 0
        })),
      top_rated: topRated.map(r => ({
        id: r.player_id,
        name: `${r.player.user.first_name} ${r.player.user.last_name}`,
        team: r.player.team?.name,
        overall: parseFloat(r.overall)
      }))
    };
  }
}

module.exports = StandingsService;
