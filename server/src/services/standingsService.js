const { Op, fn, col, literal } = require('sequelize');
const { sequelize, Match, Fixture, Team, Performance, Player, User, Rating } = require('../models');
const { logger } = require('../utils/logger');

/**
 * Standings rules per project specification:
 *   1. Points          — 3 × W + 1 × D
 *   2. Goal Difference — GF − GA
 *   3. Goals For       — total goals scored
 *   4. Head-to-Head points  — points from matches BETWEEN tied teams only
 *   5. Head-to-Head away goals — away goals in those specific h2h matches
 *   6. Alphabetical    — final deterministic fallback
 */
class StandingsService {

  static async calculateStandings(sportType = 'football') {
    // ── Fetch all completed matches, filtering by sport via the Team association ──
    // NOTE: sport_type lives on Team, NOT on Fixture
    const matches = await Match.findAll({
      where: {
        result: { [Op.notIn]: ['no_result'] },
        result: { [Op.ne]: null }
      },
      include: [{
        model: Fixture,
        as: 'fixture',
        include: [
          {
            model: Team, as: 'homeTeam',
            where: { sport_type: sportType },   // ← filter here, on Team
            attributes: ['id', 'name']
          },
          {
            model: Team, as: 'awayTeam',
            where: { sport_type: sportType },
            attributes: ['id', 'name']
          }
        ]
      }]
    });

    if (matches.length === 0) return [];

    // ── Build a stats row for every team that appears in any match ──
    const statsMap = new Map();

    const getOrCreate = (team) => {
      if (!statsMap.has(team.id)) {
        statsMap.set(team.id, {
          id: team.id, name: team.name,
          played: 0, won: 0, drawn: 0, lost: 0,
          goals_for: 0, goals_against: 0,
          goal_difference: 0, points: 0
        });
      }
      return statsMap.get(team.id);
    };

    for (const match of matches) {
      const home = match.fixture?.homeTeam;
      const away = match.fixture?.awayTeam;
      if (!home || !away) continue;

      const hs = getOrCreate(home);
      const as_ = getOrCreate(away);

      hs.played++;
      as_.played++;
      hs.goals_for     += match.home_score;
      hs.goals_against += match.away_score;
      as_.goals_for    += match.away_score;
      as_.goals_against+= match.home_score;

      if (match.result === 'home_win') {
        hs.won++;  hs.points  += 3;
        as_.lost++;
      } else if (match.result === 'away_win') {
        as_.won++; as_.points += 3;
        hs.lost++;
      } else if (match.result === 'draw') {
        hs.drawn++;  hs.points  += 1;
        as_.drawn++; as_.points += 1;
      }
    }

    const standings = Array.from(statsMap.values()).map(s => ({
      ...s,
      goal_difference: s.goals_for - s.goals_against
    }));

    // ── Sort with full tiebreaker chain ──
    standings.sort((a, b) => {
      if (b.points          !== a.points)          return b.points          - a.points;
      if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference;
      if (b.goals_for       !== a.goals_for)       return b.goals_for       - a.goals_for;
      return a.name.localeCompare(b.name); // stable pre-sort before h2h pass
    });

    // ── Second pass: apply H2H within equal groups (Pts + GD + GF all tied) ──
    let i = 0;
    while (i < standings.length) {
      let j = i + 1;
      while (
        j < standings.length &&
        standings[j].points          === standings[i].points &&
        standings[j].goal_difference === standings[i].goal_difference &&
        standings[j].goals_for       === standings[i].goals_for
      ) j++;

      if (j - i > 1) {
        const group    = standings.slice(i, j);
        const groupIds = group.map(r => r.id);
        const h2h      = this._headToHead(groupIds, matches);

        group.sort((a, b) => {
          const ha = h2h[a.id], hb = h2h[b.id];
          if (hb.points      !== ha.points)      return hb.points      - ha.points;
          if (hb.away_goals  !== ha.away_goals)  return hb.away_goals  - ha.away_goals;
          return a.name.localeCompare(b.name);
        });

        for (let k = 0; k < group.length; k++) standings[i + k] = group[k];
      }
      i = j;
    }

    standings.forEach((t, idx) => { t.position = idx + 1; });
    return standings;
  }

  // ── Head-to-head stats within a tied group ──────────────────────────────
  static _headToHead(teamIds, allMatches) {
    const h2h = {};
    teamIds.forEach(id => { h2h[id] = { points: 0, away_goals: 0 }; });

    for (const m of allMatches) {
      const hid = m.fixture?.homeTeam?.id;
      const aid = m.fixture?.awayTeam?.id;
      if (!teamIds.includes(hid) || !teamIds.includes(aid)) continue;

      h2h[aid].away_goals += m.away_score;

      if (m.result === 'home_win')  { h2h[hid].points += 3; }
      else if (m.result === 'away_win') { h2h[aid].points += 3; }
      else if (m.result === 'draw') { h2h[hid].points += 1; h2h[aid].points += 1; }
    }
    return h2h;
  }

  // ── Season stats: top scorers, assisters, best rated ────────────────────
  static async getSeasonStats(sportType = 'football') {
    // Top scorers + assisters in one query
    const perfRows = await Performance.findAll({
      attributes: [
        'player_id',
        [fn('SUM', col('Performance.goals')),   'total_goals'],
        [fn('SUM', col('Performance.assists')), 'total_assists'],
        [fn('COUNT', col('Performance.id')),    'matches_played']
      ],
      include: [{
        model: Player,
        as: 'player',
        attributes: ['id', 'position'],
        include: [
          { model: User, as: 'user',   attributes: ['first_name', 'last_name'] },
          { model: Team, as: 'team',   attributes: ['name'], where: { sport_type: sportType }, required: false }
        ]
      }],
      group: [
        'player_id',
        'player.id', 'player.position',
        'player->user.id', 'player->user.first_name', 'player->user.last_name',
        'player->team.id', 'player->team.name'
      ],
      order: [[literal('"total_goals"'), 'DESC']],
      limit: 10
    });

    const mapPerf = (rows) => rows.map(p => ({
      id:             p.player_id,
      name:           `${p.player.user.first_name} ${p.player.user.last_name}`,
      team:           p.player.team?.name || '—',
      position:       p.player.position,
      goals:          parseInt(p.dataValues.total_goals)   || 0,
      assists:        parseInt(p.dataValues.total_assists) || 0,
      matches_played: parseInt(p.dataValues.matches_played) || 0
    }));

    const topScorers   = mapPerf(perfRows);
    const topAssisters = mapPerf(
      [...perfRows].sort((a, b) =>
        parseInt(b.dataValues.total_assists) - parseInt(a.dataValues.total_assists)
      ).slice(0, 5)
    );

    // Best rated — latest rating per player
    const ratings = await sequelize.query(`
      SELECT DISTINCT ON (r.player_id)
        r.player_id,
        r.overall, r.attack, r.defense, r.fitness,
        u.first_name || ' ' || u.last_name AS name,
        t.name AS team
      FROM ratings r
      JOIN players p ON r.player_id = p.id
      JOIN users   u ON p.user_id   = u.id
      LEFT JOIN teams t ON p.team_id = t.id AND t.sport_type = :sportType
      ORDER BY r.player_id, r.calculation_date DESC
    `, { replacements: { sportType }, type: sequelize.QueryTypes.SELECT });

    const topRated = ratings
      .sort((a, b) => parseFloat(b.overall) - parseFloat(a.overall))
      .slice(0, 5)
      .map(r => ({
        id:      r.player_id,
        name:    r.name,
        team:    r.team || '—',
        overall: parseFloat(r.overall)
      }));

    return {
      top_scorers:   topScorers.slice(0, 5),
      top_assisters: topAssisters.slice(0, 5),
      top_rated:     topRated
    };
  }
}

module.exports = StandingsService;
