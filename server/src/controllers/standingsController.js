const { Fixture, Team, Match, Player, Performance, sequelize } = require('../models');
const { successResponse, errorResponse } = require('../utils/helpers');
const { Op } = require('sequelize');
const { logger } = require('../utils/logger');

const standingsController = {
  // Get league table standings
  getStandings: async (req, res) => {
    try {
      const { sport_type, hall_id, season_year } = req.query;

      const teamWhere = {};
      if (sport_type) teamWhere.sport_type = sport_type;
      if (hall_id) teamWhere.hall_id = hall_id;

      // Get all teams for the sport
      const teams = await Team.findAll({
        where: teamWhere,
        attributes: ['id', 'name', 'sport_type', 'hall_id']
      });

      // Get all completed fixtures with results
      const fixtureWhere = { status: 'completed' };

      const fixtures = await Fixture.findAll({
        where: fixtureWhere,
        include: [
          { model: Team, as: 'homeTeam', where: teamWhere, required: true },
          { model: Team, as: 'awayTeam', where: teamWhere, required: true },
          { model: Match, as: 'matchResult', required: true }
        ]
      });

      // Calculate standings
      const standings = {};

      // Initialize all teams
      teams.forEach(team => {
        standings[team.id] = {
          team_id: team.id,
          team_name: team.name,
          sport_type: team.sport_type,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goals_for: 0,
          goals_against: 0,
          goal_difference: 0,
          points: 0,
          form: []
        };
      });

      // Process each fixture
      fixtures.forEach(fixture => {
        const match = fixture.matchResult;
        const homeId = fixture.home_team_id;
        const awayId = fixture.away_team_id;
        const homeScore = match.home_score;
        const awayScore = match.away_score;

        if (!standings[homeId] || !standings[awayId]) return;

        // Update played
        standings[homeId].played++;
        standings[awayId].played++;

        // Update goals
        standings[homeId].goals_for += homeScore;
        standings[homeId].goals_against += awayScore;
        standings[awayId].goals_for += awayScore;
        standings[awayId].goals_against += homeScore;

        // Determine result
        if (homeScore > awayScore) {
          standings[homeId].won++;
          standings[homeId].points += 3;
          standings[homeId].form.push('W');
          standings[awayId].lost++;
          standings[awayId].form.push('L');
        } else if (awayScore > homeScore) {
          standings[awayId].won++;
          standings[awayId].points += 3;
          standings[awayId].form.push('W');
          standings[homeId].lost++;
          standings[homeId].form.push('L');
        } else {
          standings[homeId].drawn++;
          standings[homeId].points += 1;
          standings[homeId].form.push('D');
          standings[awayId].drawn++;
          standings[awayId].points += 1;
          standings[awayId].form.push('D');
        }
      });

      // Calculate goal difference and sort
      const standingsArray = Object.values(standings).map(s => ({
        ...s,
        goal_difference: s.goals_for - s.goals_against,
        form: s.form.slice(-5).reverse() // Last 5 results, most recent first
      }));

      // Sort by points, then goal difference, then goals for
      standingsArray.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference;
        return b.goals_for - a.goals_for;
      });

      // Add position
      standingsArray.forEach((s, idx) => {
        s.position = idx + 1;
      });

      return successResponse(res, standingsArray);
    } catch (error) {
      logger.error('Get standings error:', error);
      return errorResponse(res, 'Failed to retrieve standings', 500);
    }
  },

  // Get season statistics
  getSeasonStats: async (req, res) => {
    try {
      const { sport_type, limit = 5 } = req.query;
      const teamWhere = sport_type ? { sport_type } : {};

      // Get total matches played
      const totalMatches = await Match.count({
        include: [{
          model: Fixture,
          as: 'fixture',
          where: { status: 'completed' },
          include: [
            { model: Team, as: 'homeTeam', where: teamWhere, required: !!sport_type }
          ]
        }]
      });

      // Get total goals scored
      const totalGoalsResult = await Match.findOne({
        attributes: [
          [sequelize.fn('SUM', sequelize.col('home_score')), 'total_home_goals'],
          [sequelize.fn('SUM', sequelize.col('away_score')), 'total_away_goals']
        ],
        include: [{
          model: Fixture,
          as: 'fixture',
          where: { status: 'completed' },
          include: [
            { model: Team, as: 'homeTeam', where: teamWhere, required: !!sport_type }
          ]
        }],
        raw: true
      });

      const totalGoals = parseInt(totalGoalsResult?.total_home_goals || 0) + 
                         parseInt(totalGoalsResult?.total_away_goals || 0);

      // Get top scorers
      const topScorers = await Performance.findAll({
        attributes: [
          'player_id',
          [sequelize.fn('SUM', sequelize.col('goals')), 'total_goals'],
          [sequelize.fn('SUM', sequelize.col('assists')), 'total_assists'],
          [sequelize.fn('COUNT', sequelize.col('match_id')), 'matches_played']
        ],
        include: [
          {
            model: Player,
            as: 'player',
            include: [
              { model: Team, as: 'team', where: teamWhere, required: !!sport_type },
              { model: require('../models').User, as: 'user', attributes: ['first_name', 'last_name'] }
            ]
          }
        ],
        group: ['player_id', 'player.id', 'player->team.id', 'player->user.id'],
        having: sequelize.literal('SUM(goals) > 0'),
        order: [[sequelize.literal('total_goals'), 'DESC']],
        limit: parseInt(limit)
      });

      // Get top rated players
      const topRated = await Performance.findAll({
        attributes: [
          'player_id',
          [sequelize.fn('AVG', sequelize.col('rating')), 'avg_rating'],
          [sequelize.fn('SUM', sequelize.col('goals')), 'total_goals'],
          [sequelize.fn('COUNT', sequelize.col('match_id')), 'matches_played']
        ],
        include: [
          {
            model: Player,
            as: 'player',
            include: [
              { model: Team, as: 'team', where: teamWhere, required: !!sport_type },
              { model: require('../models').User, as: 'user', attributes: ['first_name', 'last_name'] }
            ]
          }
        ],
        group: ['player_id', 'player.id', 'player->team.id', 'player->user.id'],
        having: sequelize.literal('AVG(rating) IS NOT NULL'),
        order: [[sequelize.literal('avg_rating'), 'DESC']],
        limit: parseInt(limit)
      });

      // Get most disciplined (least cards)
      const mostDisciplined = await Performance.findAll({
        attributes: [
          'player_id',
          [sequelize.fn('SUM', sequelize.col('yellow_cards')), 'total_yellows'],
          [sequelize.fn('SUM', sequelize.col('red_cards')), 'total_reds'],
          [sequelize.fn('COUNT', sequelize.col('match_id')), 'matches_played']
        ],
        include: [
          {
            model: Player,
            as: 'player',
            include: [
              { model: Team, as: 'team', where: teamWhere, required: !!sport_type },
              { model: require('../models').User, as: 'user', attributes: ['first_name', 'last_name'] }
            ]
          }
        ],
        group: ['player_id', 'player.id', 'player->team.id', 'player->user.id'],
        having: sequelize.literal('SUM(yellow_cards) + SUM(red_cards) = 0'),
        order: [[sequelize.literal('matches_played'), 'DESC']],
        limit: parseInt(limit)
      });

      // Get team with most goals
      const teamGoals = await sequelize.query(`
        SELECT 
          t.id,
          t.name,
          t.sport_type,
          COALESCE(SUM(CASE WHEN f.home_team_id = t.id THEN m.home_score ELSE m.away_score END), 0) as goals_scored,
          COALESCE(SUM(CASE WHEN f.home_team_id = t.id THEN m.away_score ELSE m.home_score END), 0) as goals_conceded
        FROM teams t
        LEFT JOIN fixtures f ON (t.id = f.home_team_id OR t.id = f.away_team_id)
        LEFT JOIN matches m ON f.id = m.fixture_id
        WHERE f.status = 'completed'
        ${sport_type ? "AND t.sport_type = '" + sport_type + "'" : ''}
        GROUP BY t.id, t.name, t.sport_type
        ORDER BY goals_scored DESC
        LIMIT ${parseInt(limit)}
      `, { type: sequelize.QueryTypes.SELECT });

      return successResponse(res, {
        overview: {
          total_matches: totalMatches,
          total_goals: totalGoals,
          avg_goals_per_match: totalMatches > 0 ? (totalGoals / totalMatches).toFixed(2) : 0
        },
        top_scorers: topScorers,
        top_rated: topRated,
        most_disciplined: mostDisciplined,
        top_scoring_teams: teamGoals
      });
    } catch (error) {
      logger.error('Get season stats error:', error);
      return errorResponse(res, 'Failed to retrieve season statistics', 500);
    }
  },

  // Get upcoming fixtures
  getUpcomingFixtures: async (req, res) => {
    try {
      const { sport_type, limit = 5 } = req.query;
      const teamWhere = sport_type ? { sport_type } : {};

      const now = new Date();

      const fixtures = await Fixture.findAll({
        where: {
          status: 'scheduled',
          match_date: { [Op.gte]: now }
        },
        include: [
          { model: Team, as: 'homeTeam', where: teamWhere, required: !!sport_type },
          { model: Team, as: 'awayTeam', where: teamWhere, required: !!sport_type }
        ],
        order: [['match_date', 'ASC']],
        limit: parseInt(limit)
      });

      return successResponse(res, fixtures);
    } catch (error) {
      logger.error('Get upcoming fixtures error:', error);
      return errorResponse(res, 'Failed to retrieve upcoming fixtures', 500);
    }
  },

  // Get recent match results
  getRecentResults: async (req, res) => {
    try {
      const { sport_type, limit = 5 } = req.query;
      const teamWhere = sport_type ? { sport_type } : {};

      const matches = await Match.findAll({
        include: [
          {
            model: Fixture,
            as: 'fixture',
            where: { status: 'completed' },
            required: true,
            include: [
              { model: Team, as: 'homeTeam', where: teamWhere, required: !!sport_type },
              { model: Team, as: 'awayTeam', where: teamWhere, required: !!sport_type }
            ]
          }
        ],
        order: [['played_date', 'DESC']],
        limit: parseInt(limit)
      });

      return successResponse(res, matches);
    } catch (error) {
      logger.error('Get recent results error:', error);
      return errorResponse(res, 'Failed to retrieve recent results', 500);
    }
  }
};

module.exports = standingsController;
