const { Fixture } = require('../models');
const { logger } = require('../utils/logger');

/**
 * Berger circle method: generates all round-robin matchup pairs.
 * If N is odd, a null "bye" is inserted so every round has N/2 slots.
 * Returns [{ round, home_team_id, away_team_id }]
 */
function buildRoundRobinPairs(teams) {
  const list = teams.length % 2 === 0 ? [...teams] : [...teams, null];
  const total = list.length;
  const rounds = total - 1;
  const pairs = [];

  for (let round = 0; round < rounds; round++) {
    for (let slot = 0; slot < total / 2; slot++) {
      const home = list[slot];
      const away = list[total - 1 - slot];
      if (home !== null && away !== null) {
        pairs.push({ round: round + 1, home_team_id: home.id, away_team_id: away.id });
      }
    }
    // Rotate positions 1..N-1 clockwise; position 0 stays fixed
    const last = list[total - 1];
    for (let i = total - 1; i > 1; i--) list[i] = list[i - 1];
    list[1] = last;
  }

  return pairs;
}

/**
 * Walk forward from startDate, collecting calendar dates that
 * fall on one of the allowed weekdays (0=Sun … 6=Sat).
 * Returns exactly `count` Date objects.
 */
function buildDateSlots(startDate, matchDays, matchTime, count) {
  const [hours, minutes] = matchTime.split(':').map(Number);
  const slots = [];
  const cursor = new Date(startDate);
  cursor.setHours(hours, minutes, 0, 0);
  const limit = new Date(cursor.getTime() + 3 * 365 * 24 * 60 * 60 * 1000);

  while (slots.length < count && cursor < limit) {
    if (matchDays.includes(cursor.getDay())) {
      slots.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return slots;
}

/**
 * Detect two kinds of conflicts in a fixture list:
 *  1. A team appears in two matches on the same calendar day.
 *  2. A venue is double-booked at the exact same datetime.
 */
function detectConflicts(fixtures) {
  const conflicts = [];

  for (let i = 0; i < fixtures.length; i++) {
    for (let j = i + 1; j < fixtures.length; j++) {
      const a = fixtures[i];
      const b = fixtures[j];
      if (!a.match_date || !b.match_date) continue;

      const sameDay = a.match_date.toDateString() === b.match_date.toDateString();

      if (sameDay) {
        const teamsA = [a.home_team_id, a.away_team_id];
        const teamsB = [b.home_team_id, b.away_team_id];
        const sharedTeam = teamsA.find(t => teamsB.includes(t));

        if (sharedTeam) {
          conflicts.push({
            type: 'team_double_booking',
            // Use the name from either fixture for a readable message
            message: `"${a.home_team}" or "${a.away_team}" scheduled twice on ${a.match_date.toDateString()}`,
            fixture_indices: [i, j]
          });
        }

        const sameTime = a.match_date.getTime() === b.match_date.getTime();
        if (sameTime && a.venue === b.venue) {
          conflicts.push({
            type: 'venue_double_booking',
            message: `Venue "${a.venue}" double-booked at ${a.match_date.toISOString()}`,
            fixture_indices: [i, j]
          });
        }
      }
    }
  }

  return conflicts;
}

const FixtureGenerator = {
  /**
   * Build a preview without writing anything to the database.
   * Returns the shape the frontend FixtureGenerator.jsx expects.
   *
   * Each fixture in the preview array carries:
   *   home_team / away_team  — human-readable name strings (for display)
   *   home_team_id / away_team_id — numeric IDs (kept for generateAndSave)
   */
  preview: async (teams, options) => {
    const {
      start_date,
      match_days,
      match_time,
      venues = ['football_pitch'],
      include_return_leg = true
    } = options;

    if (teams.length < 2) {
      throw new Error(`Need at least 2 teams. Found ${teams.length}.`);
    }

    // Build first-leg pairs (compute once and reuse for return leg)
    const firstLegPairs = buildRoundRobinPairs(teams);
    let pairs = [...firstLegPairs];

    // Derive round count directly from what buildRoundRobinPairs produces:
    //   - Even N teams  → padded length = N  → rounds = N - 1
    //   - Odd  N teams  → padded length = N+1 → rounds = N
    const paddedCount   = teams.length % 2 === 0 ? teams.length : teams.length + 1;
    const firstLegRounds = paddedCount - 1;

    // Append return-leg pairs with swapped home/away (reuse cached first-leg pairs)
    if (include_return_leg) {
      const returnPairs = firstLegPairs.map(p => ({
        round:        p.round + firstLegRounds,
        home_team_id: p.away_team_id,
        away_team_id: p.home_team_id
      }));
      pairs = [...pairs, ...returnPairs];
    }

    // Assign a calendar slot to each pair
    const slots = buildDateSlots(start_date, match_days, match_time, pairs.length);

    // Build a fast id → team lookup
    const teamMap = Object.fromEntries(teams.map(t => [t.id, t]));

    const fixtures = pairs.map((pair, idx) => ({
      round:             pair.round,
      // ── display fields: names, not IDs ──────────────────────────────────
      home_team:         teamMap[pair.home_team_id]?.name ?? `Team ${pair.home_team_id}`,
      away_team:         teamMap[pair.away_team_id]?.name ?? `Team ${pair.away_team_id}`,
      home_team_name:    teamMap[pair.home_team_id]?.name ?? `Team ${pair.home_team_id}`,
      away_team_name:    teamMap[pair.away_team_id]?.name ?? `Team ${pair.away_team_id}`,
      // ── kept for DB writes in generateAndSave ────────────────────────────
      home_team_id:      pair.home_team_id,
      away_team_id:      pair.away_team_id,
      // ── scheduling ───────────────────────────────────────────────────────
      match_date:        slots[idx] ?? null,
      venue:             venues[idx % venues.length]
    }));

    const conflicts = detectConflicts(fixtures);
    const maxRound  = Math.max(...pairs.map(p => p.round));

    return {
      teams_count:    teams.length,
      total_fixtures: pairs.length,
      rounds:         maxRound,
      conflicts,
      preview:        fixtures
    };
  },

  /**
   * Generate fixtures and persist them inside a single transaction.
   * Throws on any error so the caller can respond appropriately.
   */
  generateAndSave: async (teams, options) => {
    const { sequelize } = require('../models');
    const transaction = await sequelize.transaction();

    try {
      const { preview: fixtures } = await FixtureGenerator.preview(teams, options);

      const valid = fixtures.filter(f => f.match_date !== null);
      if (valid.length === 0) {
        throw new Error('No valid match dates could be scheduled. Check start_date and match_days.');
      }

      const rows = valid.map(f => ({
        home_team_id: f.home_team_id,
        away_team_id: f.away_team_id,
        venue:        f.venue,
        match_date:   f.match_date,
        status:       'scheduled',
        notes:        `Auto-generated – Round ${f.round}`
      }));

      const created = await Fixture.bulkCreate(rows, { transaction });
      await transaction.commit();

      // Enrich the saved records with names before returning
      const teamMap = Object.fromEntries(teams.map(t => [t.id, t]));
      const enriched = created.map(fixture => ({
        ...fixture.toJSON(),
        home_team: teamMap[fixture.home_team_id]?.name ?? `Team ${fixture.home_team_id}`,
        away_team: teamMap[fixture.away_team_id]?.name ?? `Team ${fixture.away_team_id}`
      }));

      logger.info(`✅ FixtureGenerator saved ${created.length} fixtures`);
      return enriched;
    } catch (error) {
      await transaction.rollback();
      logger.error('❌ FixtureGenerator.generateAndSave failed:', error);
      throw error;
    }
  }
};

module.exports = FixtureGenerator;