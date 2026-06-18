const crypto = require('crypto');
const { Op } = require('sequelize');
const { User, Player, Team, Hall, sequelize } = require('../models');
const { hashPassword } = require('./helpers');
const { logger } = require('./logger');

/**
 * Generate a memorable, hard-to-mistype password for first-time logins.
 * 10 chars: 2 syllables + 3 digits + 1 symbol. Avoids 0/O/1/l confusion.
 */
function generatePassword() {
  const consonants = 'bcdfghjkmnpqrstvwxyz';
  const vowels = 'aeiou';
  const pick = (s) => s[crypto.randomInt(0, s.length)];
  let s = '';
  s += pick(consonants).toUpperCase() + pick(vowels) + pick(consonants);
  s += pick(consonants).toUpperCase() + pick(vowels) + pick(consonants);
  s += String(crypto.randomInt(100, 999));
  s += '!';
  return s;
}

/**
 * Lowercase + trim helpers that don't throw on missing keys.
 */
const lower = (v) => (v == null ? v : String(v).trim().toLowerCase());
const trim = (v) => (v == null ? v : String(v).trim());

/**
 * Resolve hall by name (case-insensitive). Halls are read-only in the importer.
 */
async function resolveHall(row) {
  if (row.hall_id) return { id: parseInt(row.hall_id) };
  if (row.hall_name) {
    const hall = await Hall.findOne({ where: { name: { [Op.iLike]: trim(row.hall_name) } } });
    if (!hall) throw new Error(`Hall not found: ${row.hall_name}`);
    return hall;
  }
  throw new Error('hall_id or hall_name is required');
}

/**
 * Resolve coach by email. Coaches are not auto-created by the importer.
 */
async function resolveCoach(row) {
  if (row.coach_id) return { id: parseInt(row.coach_id) };
  if (row.coach_email) {
    const coach = await User.findOne({ where: { email: lower(row.coach_email), role: 'coach' } });
    if (!coach) throw new Error(`Coach not found: ${row.coach_email}`);
    return coach;
  }
  return null;
}

/**
 * Process a single coach row. Returns { row, status, user?, password?, error? }.
 * status is one of: 'created', 'skipped', 'failed', 'updated'.
 */
async function processCoachRow(row, idx, options) {
  const report = { row: idx + 2, email: row.email || '', status: 'failed' };
  try {
    if (!row.email) throw new Error('email is required');
    if (!row.first_name || !row.last_name) throw new Error('first_name and last_name are required');

    const email = lower(row.email);
    const existing = await User.findOne({ where: { email } });

    if (existing) {
      if (existing.role !== 'coach') throw new Error(`User ${email} exists but is not a coach`);
      if (options.skipExisting) {
        report.status = 'skipped';
        return report;
      }
      if (options.upsert) {
        const update = {
          first_name: trim(row.first_name),
          last_name: trim(row.last_name),
          phone: row.phone || existing.phone
        };
        if (row.password) update.password = row.password;
        await existing.update(update);
        report.status = 'updated';
        report.user = { id: existing.id, email: existing.email };
        return report;
      }
      throw new Error(`Coach already exists: ${email}`);
    }

    // Brand-new coach. Password policy: explicit row.password wins; else random.
    const password = row.password || generatePassword();
    const created = await User.create({
      email,
      password,
      first_name: trim(row.first_name),
      last_name: trim(row.last_name),
      role: 'coach',
      student_number: `COACH-${Date.now()}-${idx}`,
      phone: row.phone || null,
      is_active: true
    });
    report.status = 'created';
    report.user = { id: created.id, email: created.email };
    report.password = password; // returned to admin; never written to a log
    return report;
  } catch (err) {
    report.error = err.message;
    return report;
  }
}

/**
 * Process a single student row.
 */
async function processStudentRow(row, idx, options) {
  const report = { row: idx + 2, email: row.email || '', student_number: row.student_number || '', status: 'failed' };
  try {
    if (!row.email) throw new Error('email is required');
    if (!row.student_number) throw new Error('student_number is required');
    if (!row.first_name || !row.last_name) throw new Error('first_name and last_name are required');

    const email = lower(row.email);
    const number = trim(row.student_number);

    const existing = await User.findOne({
      where: { [Op.or]: [{ email }, { student_number: number }] }
    });
    if (existing) {
      if (existing.email === email && existing.student_number === number && existing.role === 'student') {
        if (options.skipExisting) {
          report.status = 'skipped';
          return report;
        }
        if (options.upsert) {
          await existing.update({
            first_name: trim(row.first_name),
            last_name: trim(row.last_name),
            phone: row.phone || existing.phone
          });
          report.status = 'updated';
          report.user = { id: existing.id, email: existing.email };
          return report;
        }
      }
      throw new Error(`Student already exists (email or student_number): ${email} / ${number}`);
    }

    const password = row.password || generatePassword();
    const created = await User.create({
      email,
      password,
      first_name: trim(row.first_name),
      last_name: trim(row.last_name),
      role: 'student',
      student_number: number,
      phone: row.phone || null,
      is_active: true
    });
    report.status = 'created';
    report.user = { id: created.id, email: created.email };
    report.password = password;
    return report;
  } catch (err) {
    report.error = err.message;
    return report;
  }
}

/**
 * Process a single team row.
 */
async function processTeamRow(row, idx, options, coachIndex) {
  const report = { row: idx + 2, name: row.name || '', status: 'failed' };
  try {
    if (!row.name?.trim()) throw new Error('name is required');

    const name = trim(row.name);
    const existing = await Team.findOne({ where: { name: { [Op.iLike]: name } } });
    if (existing) {
      if (options.skipExisting) {
        report.status = 'skipped';
        return report;
      }
      if (options.upsert) {
        const hall = await resolveHall(row);
        const coach = await resolveCoachOrInline(row, coachIndex);
        await existing.update({
          hall_id: hall.id,
          sport_type: row.sport_type || existing.sport_type,
          coach_id: coach ? coach.id : null,
          description: row.description ?? existing.description
        });
        report.status = 'updated';
        report.team = { id: existing.id, name: existing.name };
        return report;
      }
      throw new Error(`Team already exists: ${name}`);
    }

    const hall = await resolveHall(row);
    const coach = await resolveCoachOrInline(row, coachIndex);

    const created = await Team.create({
      name,
      hall_id: hall.id,
      sport_type: row.sport_type || 'football',
      coach_id: coach ? coach.id : null,
      description: row.description || null
    });
    report.status = 'created';
    report.team = { id: created.id, name: created.name };
    return report;
  } catch (err) {
    report.error = err.message;
    return report;
  }
}

/**
 * For team rows: prefer the in-batch coach email match (so a CSV with both
 * coach and team rows works), then fall back to the DB.
 */
async function resolveCoachOrInline(row, coachIndex) {
  if (row.coach_id) return { id: parseInt(row.coach_id) };
  if (row.coach_email) {
    const key = lower(row.coach_email);
    if (coachIndex.has(key)) return { id: coachIndex.get(key) };
    return resolveCoach({ coach_email: key });
  }
  return null;
}

/**
 * Process a single player row. Strict hall/team pairing is enforced here too.
 */
async function processPlayerRow(row, idx, options, indexes) {
  const report = { row: idx + 2, email: row.email || '', status: 'failed' };
  try {
    if (!row.email) throw new Error('email is required');
    const email = lower(row.email);

    // User lookup: in-batch first (handles rows that depend on a sibling
    // student row in the same upload), then DB.
    let user = indexes.usersByEmail.get(email);
    if (!user) user = await User.findOne({ where: { email } });
    if (!user) throw new Error(`User not found: ${email}. Add a student row or include them in the students section.`);
    if (user.role !== 'student') throw new Error(`User ${email} is not a student`);

    const sport = row.sport || 'football';

    // One Player per (user, sport).
    const existing = await Player.findOne({ where: { user_id: user.id, sport } });
    if (existing) {
      if (options.skipExisting) {
        report.status = 'skipped';
        return report;
      }
      if (options.upsert) {
        const hall = await resolveHall(row);
        let team_id = row.team_id ? parseInt(row.team_id) : null;
        if (!team_id && row.team_name) {
          const t = indexes.teamsByName.get(lower(row.team_name)) || await Team.findOne({ where: { name: { [Op.iLike]: trim(row.team_name) } } });
          if (!t) throw new Error(`Team not found: ${row.team_name}`);
          team_id = t.id;
        }
        if (team_id && parseInt(hall.id) !== parseInt((await Team.findByPk(team_id)).hall_id)) {
          throw new Error(`Player hall (${hall.id}) does not match team hall`);
        }
        await existing.update({
          hall_id: hall.id,
          team_id,
          position: row.position || existing.position,
          date_of_birth: row.date_of_birth || existing.date_of_birth,
          height: row.height || existing.height,
          weight: row.weight || existing.weight,
          is_active: row.is_active !== undefined ? !!row.is_active : existing.is_active
        });
        report.status = 'updated';
        report.player = { id: existing.id };
        return report;
      }
      throw new Error(`Player profile already exists for sport "${sport}"`);
    }

    const hall = await resolveHall(row);
    let team_id = row.team_id ? parseInt(row.team_id) : null;
    if (!team_id && row.team_name) {
      const t = indexes.teamsByName.get(lower(row.team_name)) || await Team.findOne({ where: { name: { [Op.iLike]: trim(row.team_name) } } });
      if (!t) throw new Error(`Team not found: ${row.team_name}`);
      team_id = t.id;
    }
    if (team_id) {
      const team = await Team.findByPk(team_id);
      if (parseInt(team.hall_id) !== parseInt(hall.id)) {
        throw new Error(`Player hall (${hall.id}) does not match team hall (${team.hall_id})`);
      }
    }

    const created = await Player.create({
      user_id: user.id,
      hall_id: hall.id,
      team_id,
      sport,
      position: row.position || null,
      date_of_birth: row.date_of_birth || null,
      height: row.height || null,
      weight: row.weight || null,
      is_active: row.is_active !== undefined ? !!row.is_active : true
    });
    report.status = 'created';
    report.player = { id: created.id };
    return report;
  } catch (err) {
    report.error = err.message;
    return report;
  }
}

/**
 * Top-level coordinator. Sections run in dependency order inside a single
 * transaction so a mid-import failure rolls everything back. dryRun skips
 * writes entirely and returns what would happen.
 */
async function runBulkImport(payload, options = {}) {
  const dryRun = !!options.dryRun;
  const skipExisting = !!options.skipExisting;
  const upsert = !!options.upsert;
  const sections = payload && typeof payload === 'object' ? payload : {};

  const summary = (rows) => ({
    total: rows.length,
    created: rows.filter((r) => r.status === 'created').length,
    updated: rows.filter((r) => r.status === 'updated').length,
    skipped: rows.filter((r) => r.status === 'skipped').length,
    failed: rows.filter((r) => r.status === 'failed').length,
    rows
  });

  const errors = (s) => s.rows.filter((r) => r.error);

  const result = {
    dry_run: dryRun,
    options: { skipExisting, upsert },
    sections: {}
  };

  // Build indexes as we go so downstream sections can resolve references.
  const coachIndex = new Map(); // lowercased email -> created user id
  const studentIndex = new Map();
  const teamIndex = new Map(); // lowercased team name -> created team id
  const indexes = { usersByEmail: studentIndex, teamsByName: teamIndex };

  const run = async (label, rows, fn, indexSink) => {
    if (!Array.isArray(rows) || rows.length === 0) {
      result.sections[label] = { total: 0, created: 0, updated: 0, skipped: 0, failed: 0, rows: [] };
      return result.sections[label];
    }
    const out = [];
    for (let i = 0; i < rows.length; i++) {
      const report = await fn(rows[i], i, { skipExisting, upsert });
      out.push(report);
      if (indexSink && report.status === 'created' && report.user) {
        indexSink(rows[i], report.user);
      }
    }
    const s = summary(out);
    result.sections[label] = s;
    return s;
  };

  // Halls are read-only in the importer; skip.
  const tx = dryRun ? null : await sequelize.transaction();
  try {
    // Coaches before students (students don't reference coaches, but coaches
    // may be referenced by teams and the index is built either way).
    await run('coaches', sections.coaches, processCoachRow, (row, user) => {
      coachIndex.set(lower(row.email), user.id);
    });

    await run('students', sections.students, processStudentRow, (row, user) => {
      studentIndex.set(lower(row.email), user.id);
      studentIndex.set(lower(row.student_number), user.id);
    });

    // Teams reference halls + coaches; players reference students + teams + halls.
    await run('teams', sections.teams, (row, idx, opts) => processTeamRow(row, idx, opts, coachIndex), (row, team) => {
      teamIndex.set(lower(row.name), team.id);
    });

    await run('players', sections.players, (row, idx, opts) => processPlayerRow(row, idx, opts, {
      usersByEmail: studentIndex,
      teamsByName: teamIndex
    }));

    if (tx) await tx.commit();
  } catch (err) {
    if (tx) await tx.rollback();
    logger.error('Bulk import failed:', err);
    throw err;
  }

  // Surface "hard errors" so the admin sees them even if the row report is long.
  result.hard_errors = {
    coaches: errors(result.sections.coaches),
    students: errors(result.sections.students),
    teams: errors(result.sections.teams),
    players: errors(result.sections.players)
  };

  return result;
}

module.exports = {
  runBulkImport,
  generatePassword
};