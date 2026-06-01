const { User, AuditLog, sequelize, Player, Hall, Team, Fixture, Match, Performance } = require('../models');
const { successResponse, errorResponse, paginate } = require('../utils/helpers');

async function buildStandings() {
  const { Op } = require('sequelize');

  const completedMatches = await Match.findAll({
    where: {
      result: { [Op.ne]: 'no_result' }
    },
    include: [
      {
        model: Fixture,
        as: 'fixture',
        include: [
          { model: Team, as: 'homeTeam', attributes: ['id', 'name'] },
          { model: Team, as: 'awayTeam', attributes: ['id', 'name'] }
        ]
      }
    ]
  });

  const standingsMap = new Map();
  const getStandingRow = (team) => {
    if (!standingsMap.has(team.id)) {
      standingsMap.set(team.id, {
        teamId: team.id,
        teamName: team.name,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0
      });
    }
    return standingsMap.get(team.id);
  };

  completedMatches.forEach((match) => {
    const fixture = match.fixture;
    if (!fixture || !fixture.homeTeam || !fixture.awayTeam) return;

    const home = getStandingRow(fixture.homeTeam);
    const away = getStandingRow(fixture.awayTeam);

    home.played += 1;
    away.played += 1;

    home.goalsFor += match.home_score;
    home.goalsAgainst += match.away_score;
    away.goalsFor += match.away_score;
    away.goalsAgainst += match.home_score;

    if (match.result === 'home_win') {
      home.wins += 1;
      home.points += 3;
      away.losses += 1;
    } else if (match.result === 'away_win') {
      away.wins += 1;
      away.points += 3;
      home.losses += 1;
    } else if (match.result === 'draw') {
      home.draws += 1;
      away.draws += 1;
      home.points += 1;
      away.points += 1;
    }
  });

  return [...standingsMap.values()]
    .map((team) => ({
      ...team,
      goalDifference: team.goalsFor - team.goalsAgainst
    }))
    .sort((a, b) =>
      b.points - a.points ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor ||
      a.teamName.localeCompare(b.teamName)
    );
}

const adminController = {
  // Get all users
  getUsers: async (req, res) => {
    try {
      const { page = 1, limit = 20, role, is_active } = req.query;
      const where = {};
      if (role) where.role = role;
      if (is_active !== undefined) where.is_active = is_active === 'true';

      const { count, rows: users } = await User.findAndCountAll({
        where,
        attributes: { exclude: ['password'] },
        include: [
          {
            model: Player,
            as: 'playerProfile',
            include: [{ model: Hall, as: 'hall', attributes: ['id', 'name'] }]
          }
        ],
        ...paginate({}, { page, limit }),
        order: [['created_at', 'DESC']]
      });

      return successResponse(res, {
        users,
        pagination: { page: parseInt(page), limit: parseInt(limit), total: count }
      });
    } catch (error) {
      return errorResponse(res, 'Failed to retrieve users', 500);
    }
  },

  // Toggle user status
  toggleUserStatus: async (req, res) => {
    try {
      const user = await User.findByPk(req.params.id);
      if (!user) {
        return errorResponse(res, 'User not found', 404);
      }

      await user.update({ is_active: !user.is_active });
      return successResponse(res, user, `User ${user.is_active ? 'activated' : 'deactivated'}`);
    } catch (error) {
      return errorResponse(res, 'Failed to update user', 500);
    }
  },

  // Get audit logs
  getAuditLogs: async (req, res) => {
    try {
      const { page = 1, limit = 50, action, entity_type } = req.query;
      const where = {};
      if (action) where.action = action;
      if (entity_type) where.entity_type = entity_type;

      const { count, rows: logs } = await AuditLog.findAndCountAll({
        where,
        include: [
          { model: User, as: 'user', attributes: ['first_name', 'last_name', 'email', 'role'] }
        ],
        ...paginate({}, { page, limit }),
        order: [['created_at', 'DESC']]
      });

      return successResponse(res, {
        logs,
        pagination: { page: parseInt(page), limit: parseInt(limit), total: count }
      });
    } catch (error) {
      return errorResponse(res, 'Failed to retrieve audit logs', 500);
    }
  },

  // Table standings
  getStandings: async (req, res) => {
    try {
      const standings = await buildStandings();
      return successResponse(res, standings.slice(0, 5));
    } catch (error) {
      return errorResponse(res, 'Failed to retrieve standings', 500);
    }
  },

  // Dashboard stats
  getDashboardStats: async (req, res) => {
    try {
      const { Op } = require('sequelize');

      const [
        totalUsers,
        totalStudents,
        totalCoaches,
        totalPlayers,
        totalFixtures,
        upcomingFixturesCount,
        totalMatches
      ] = await Promise.all([
        User.count(),
        User.count({ where: { role: 'student' } }),
        User.count({ where: { role: 'coach' } }),
        Player.count(),
        Fixture.count(),
        Fixture.count({ where: { status: 'scheduled' } }),
        Match.count()
      ]);

      const upcomingFixtures = await Fixture.findAll({
        where: {
          status: 'scheduled',
          match_date: { [Op.gte]: new Date() }
        },
        include: [
          { model: Team, as: 'homeTeam', attributes: ['id', 'name'] },
          { model: Team, as: 'awayTeam', attributes: ['id', 'name'] }
        ],
        order: [['match_date', 'ASC']],
        limit: 5
      });

      const recentResults = await Match.findAll({
        where: {
          [Op.and]: [
            { result: { [Op.ne]: 'no_result' } },
            { result: { [Op.ne]: null } }
          ]
        },
        include: [
          {
            model: Fixture,
            as: 'fixture',
            include: [
              { model: Team, as: 'homeTeam', attributes: ['id', 'name'] },
              { model: Team, as: 'awayTeam', attributes: ['id', 'name'] }
            ]
          }
        ],
        order: [['played_date', 'DESC']],
        limit: 5
      });

      const [topScorers, standings] = await Promise.all([
        sequelize.query(
          `
          SELECT
            p.player_id,
            CONCAT(u.first_name, ' ', u.last_name) AS player_name,
            t.name AS team_name,
            SUM(p.goals) AS goals
          FROM performances p
          JOIN players pl ON pl.id = p.player_id
          JOIN users u ON u.id = pl.user_id
          LEFT JOIN teams t ON t.id = pl.team_id
          WHERE p.goals > 0
          GROUP BY p.player_id, u.first_name, u.last_name, t.name
          ORDER BY goals DESC
          LIMIT 5
        `,
          { type: sequelize.QueryTypes.SELECT }
        ),
        buildStandings()
      ]);

      return successResponse(res, {
        totalUsers,
        totalStudents,
        totalCoaches,
        totalPlayers,
        totalFixtures,
        upcomingFixturesCount,
        upcomingFixtures: upcomingFixtures.map((fixture) => ({
          id: fixture.id,
          homeTeamName: fixture.homeTeam?.name || 'Home',
          awayTeamName: fixture.awayTeam?.name || 'Away',
          matchDate: fixture.match_date,
          venue: fixture.venue
        })),
        recentResults: recentResults.map((match) => ({
          id: match.id,
          homeTeamName: match.fixture?.homeTeam?.name || 'Home',
          awayTeamName: match.fixture?.awayTeam?.name || 'Away',
          homeScore: match.home_score,
          awayScore: match.away_score,
          playedDate: match.played_date,
          result: match.result,
          venue: match.fixture?.venue
        })),
        standings: standings.slice(0, 5),
        topScorers,
        totalMatches
      });
    } catch (error) {
      return errorResponse(res, 'Failed to retrieve stats', 500);
    }
  }
};

module.exports = adminController;
