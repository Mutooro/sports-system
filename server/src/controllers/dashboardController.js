const { Op, fn, col, literal } = require('sequelize');
const { sequelize, Fixture, Match, Performance, Player, Team, User } = require('../models');
const { successResponse, errorResponse } = require('../utils/helpers');
const { logger } = require('../utils/logger');

const dashboardController = {

  /**
   * GET /api/v1/dashboard
   * Returns all 4 dashboard sections in one call:
   *   - upcomingFixtures (next 5 scheduled)
   *   - recentResults    (last 5 completed matches)
   *   - standings        (full league table, sorted P→GD→GF)
   *   - seasonStats      (top scorers, assisters, clean sheets, best rated)
   */
  getDashboardData: async (req, res) => {
    try {
      const [
        upcomingFixtures,
        recentResults,
        standingsRaw,
        topScorers,
        topAssisters,
        topRated,
        mostDisciplined
      ] = await Promise.all([

        // ── 1. Upcoming fixtures ─────────────────────────────────────────────
        Fixture.findAll({
          where: { status: 'scheduled', match_date: { [Op.gte]: new Date() } },
          include: [
            { model: Team, as: 'homeTeam', attributes: ['id', 'name'] },
            { model: Team, as: 'awayTeam', attributes: ['id', 'name'] }
          ],
          order: [['match_date', 'ASC']],
          limit: 5
        }),

        // ── 2. Recent results ────────────────────────────────────────────────
        Match.findAll({
          include: [{
            model: Fixture, as: 'fixture',
            include: [
              { model: Team, as: 'homeTeam', attributes: ['id', 'name'] },
              { model: Team, as: 'awayTeam', attributes: ['id', 'name'] }
            ]
          }],
          order: [['played_date', 'DESC']],
          limit: 5
        }),

        // ── 3. Standings — raw SQL for performance & clarity ─────────────────
        sequelize.query(`
          SELECT
            t.id        AS team_id,
            t.name      AS team_name,
            COUNT(m.id) AS played,
            SUM(CASE
              WHEN (f.home_team_id = t.id AND m.result = 'home_win') OR
                   (f.away_team_id = t.id AND m.result = 'away_win') THEN 1 ELSE 0 END) AS won,
            SUM(CASE WHEN m.result = 'draw' THEN 1 ELSE 0 END)   AS drawn,
            SUM(CASE
              WHEN (f.home_team_id = t.id AND m.result = 'away_win') OR
                   (f.away_team_id = t.id AND m.result = 'home_win') THEN 1 ELSE 0 END) AS lost,
            SUM(CASE WHEN f.home_team_id = t.id THEN m.home_score ELSE m.away_score END) AS goals_for,
            SUM(CASE WHEN f.home_team_id = t.id THEN m.away_score ELSE m.home_score END) AS goals_against
          FROM teams t
          JOIN fixtures f ON f.home_team_id = t.id OR f.away_team_id = t.id
          JOIN matches  m ON m.fixture_id = f.id
          WHERE m.result != 'no_result'
          GROUP BY t.id, t.name
          ORDER BY
            (SUM(CASE
              WHEN (f.home_team_id = t.id AND m.result = 'home_win') OR
                   (f.away_team_id = t.id AND m.result = 'away_win') THEN 3
              WHEN m.result = 'draw' THEN 1 ELSE 0 END)) DESC,
            (SUM(CASE WHEN f.home_team_id = t.id THEN m.home_score ELSE m.away_score END) -
             SUM(CASE WHEN f.home_team_id = t.id THEN m.away_score ELSE m.home_score END)) DESC,
            (SUM(CASE WHEN f.home_team_id = t.id THEN m.home_score ELSE m.away_score END)) DESC
        `, { type: sequelize.QueryTypes.SELECT }),

        // ── 4a. Top scorers ──────────────────────────────────────────────────
        Performance.findAll({
          attributes: [
            'player_id',
            [fn('SUM', col('goals')),   'total_goals'],
            [fn('SUM', col('assists')), 'total_assists'],
            [fn('COUNT', col('Performance.id')), 'matches_played']
          ],
          include: [{
            model: Player, as: 'player',
            attributes: ['id', 'position'],
            include: [{
              model: User, as: 'user',
              attributes: ['first_name', 'last_name']
            }, {
              model: Team, as: 'team',
              attributes: ['name']
            }]
          }],
          group: [
            'player_id',
            'player.id', 'player.position',
            'player->user.id', 'player->user.first_name', 'player->user.last_name',
            'player->team.id', 'player->team.name'
          ],
          order: [[literal('total_goals'), 'DESC']],
          limit: 5
        }),

        // ── 4b. Top assisters ────────────────────────────────────────────────
        Performance.findAll({
          attributes: [
            'player_id',
            [fn('SUM', col('assists')), 'total_assists'],
            [fn('SUM', col('goals')),   'total_goals']
          ],
          include: [{
            model: Player, as: 'player',
            attributes: ['id', 'position'],
            include: [{
              model: User, as: 'user',
              attributes: ['first_name', 'last_name']
            }, {
              model: Team, as: 'team',
              attributes: ['name']
            }]
          }],
          group: [
            'player_id',
            'player.id', 'player.position',
            'player->user.id', 'player->user.first_name', 'player->user.last_name',
            'player->team.id', 'player->team.name'
          ],
          order: [[literal('total_assists'), 'DESC']],
          limit: 5
        }),

        // ── 4c. Best rated players ───────────────────────────────────────────
        Performance.findAll({
          attributes: [
            'player_id',
            [fn('AVG', col('rating')), 'avg_rating'],
            [fn('COUNT', col('Performance.id')), 'matches_played']
          ],
          where: { rating: { [Op.not]: null } },
          include: [{
            model: Player, as: 'player',
            attributes: ['id', 'position'],
            include: [{
              model: User, as: 'user',
              attributes: ['first_name', 'last_name']
            }, {
              model: Team, as: 'team',
              attributes: ['name']
            }]
          }],
          group: [
            'player_id',
            'player.id', 'player.position',
            'player->user.id', 'player->user.first_name', 'player->user.last_name',
            'player->team.id', 'player->team.name'
          ],
          having: literal('COUNT("Performance"."id") >= 1'),
          order: [[literal('avg_rating'), 'DESC']],
          limit: 5
        }),

        // ── 4d. Most disciplined (fewest cards per game) — yellow card leaders
        Performance.findAll({
          attributes: [
            'player_id',
            [fn('SUM', col('yellow_cards')), 'yellow_cards'],
            [fn('SUM', col('red_cards')),    'red_cards'],
            [fn('COUNT', col('Performance.id')), 'matches_played']
          ],
          include: [{
            model: Player, as: 'player',
            attributes: ['id', 'position'],
            include: [{
              model: User, as: 'user',
              attributes: ['first_name', 'last_name']
            }, {
              model: Team, as: 'team',
              attributes: ['name']
            }]
          }],
          group: [
            'player_id',
            'player.id', 'player.position',
            'player->user.id', 'player->user.first_name', 'player->user.last_name',
            'player->team.id', 'player->team.name'
          ],
          order: [[literal('yellow_cards'), 'DESC']],
          limit: 5
        })
      ]);

      // ── Enrich standings with computed columns ───────────────────────────
      const standings = standingsRaw.map((row, idx) => ({
        position:      idx + 1,
        team_id:       row.team_id,
        team_name:     row.team_name,
        played:        parseInt(row.played),
        won:           parseInt(row.won),
        drawn:         parseInt(row.drawn),
        lost:          parseInt(row.lost),
        goals_for:     parseInt(row.goals_for),
        goals_against: parseInt(row.goals_against),
        goal_diff:     parseInt(row.goals_for) - parseInt(row.goals_against),
        points:        parseInt(row.won) * 3 + parseInt(row.drawn)
      }));

      return successResponse(res, {
        upcomingFixtures,
        recentResults,
        standings,
        seasonStats: {
          topScorers,
          topAssisters,
          topRated,
          mostCards: mostDisciplined
        }
      }, 'Dashboard data loaded');

    } catch (error) {
      logger.error('Dashboard controller error:', error);
      return errorResponse(res, 'Failed to load dashboard data', 500);
    }
  }
};

module.exports = dashboardController;
