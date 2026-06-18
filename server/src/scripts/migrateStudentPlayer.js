/**
 * Migration: tighten the Student / Player model (Option A).
 *
 *   1. Add users.student_number (nullable) and backfill from players.student_number.
 *   2. Enforce users.student_number UNIQUE NOT NULL after backfill.
 *   3. Drop players.student_number.
 *   4. Replace UNIQUE(user_id) on players with UNIQUE(user_id, sport).
 *   5. Add players.is_active (default TRUE) and backfill existing rows to TRUE.
 *
 * Safe to re-run. Uses a single transaction so a failure leaves the DB untouched.
 *
 * Run from CLI:    node src/scripts/migrateStudentPlayer.js
 * Run on startup:  server.js invokes it when NODE_ENV !== 'production'.
 */
const { sequelize } = require('../models');
const { logger } = require('../utils/logger');

async function columnExists(table, column) {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_name = :t AND column_name = :c`,
    { replacements: { t: table, c: column } }
  );
  return rows.length > 0;
}

async function indexExists(table, indexName) {
  const dialect = sequelize.getDialect();
  if (dialect === 'postgres') {
    const [rows] = await sequelize.query(
      `SELECT 1 FROM pg_indexes WHERE tablename = :t AND indexname = :i`,
      { replacements: { t: table, i: indexName } }
    );
    return rows.length > 0;
  }
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.statistics
     WHERE table_name = :t AND index_name = :i`,
    { replacements: { t: table, i: indexName } }
  );
  return rows.length > 0;
}

const migrate = async () => {
  const dialect = sequelize.getDialect();
  const isPg = dialect === 'postgres';

  await sequelize.transaction(async (tx) => {
    const run = (sql, replacements) =>
      sequelize.query(sql, replacements ? { replacements, transaction: tx } : { transaction: tx });

    // 1. Add users.student_number (nullable) if missing.
    if (!(await columnExists('users', 'student_number'))) {
      await run(`ALTER TABLE users ADD COLUMN student_number VARCHAR(50)`);
      logger.info('  + users.student_number (nullable) added');
    }

    // 2. Backfill users.student_number from players.student_number.
    const playersHasStudentNumber = await columnExists('players', 'student_number');
    if (playersHasStudentNumber) {
      const [result] = await run(
        isPg
          ? `UPDATE users u
             SET student_number = p.student_number
             FROM players p
             WHERE p.user_id = u.id
               AND (u.student_number IS NULL OR u.student_number = '')
               AND p.student_number IS NOT NULL`
          : `UPDATE users u
             JOIN players p ON p.user_id = u.id
             SET u.student_number = p.student_number
             WHERE (u.student_number IS NULL OR u.student_number = '')
               AND p.student_number IS NOT NULL`
      );
      const affected = result && typeof result === 'object' && 'rowCount' in result
        ? result.rowCount
        : (result || 0);
      logger.info(`  backfill: ${affected} users populated from players.student_number`);
    }

    // 3. Patch any users still missing a student_number with a placeholder.
    const [nullUsers] = await run(
      `SELECT id FROM users WHERE student_number IS NULL OR student_number = ''`
    );
    if (nullUsers && nullUsers.length) {
      logger.warn(`  ${nullUsers.length} users missing student_number; assigning PENDING-<id>`);
      for (const u of nullUsers) {
        await run(`UPDATE users SET student_number = :n WHERE id = :id`, {
          n: `PENDING-${u.id}`,
          id: u.id
        });
      }
    }

    // 4. Enforce NOT NULL UNIQUE on users.student_number.
    if (!(await indexExists('users', 'uq_users_student_number'))) {
      await run(
        `ALTER TABLE users ADD CONSTRAINT uq_users_student_number UNIQUE (student_number)`
      );
      logger.info('  + users.student_number UNIQUE');
    }
    await run(`ALTER TABLE users ALTER COLUMN student_number SET NOT NULL`);
    logger.info('  + users.student_number NOT NULL');

    // 5. Drop players.student_number.
    if (playersHasStudentNumber) {
      await run(`ALTER TABLE players DROP COLUMN student_number`);
      logger.info('  - players.student_number dropped');
    }

    // 6. Replace UNIQUE(user_id) on players with UNIQUE(user_id, sport).
    const singleUserUnique = isPg
      ? await indexExists('players', 'players_user_id_key')
      : await indexExists('players', 'user_id');
    if (singleUserUnique) {
      if (isPg) {
        await run(`ALTER TABLE players DROP CONSTRAINT players_user_id_key`);
      } else {
        await run(`ALTER TABLE players DROP INDEX user_id`);
      }
      logger.info('  - players.user_id single-unique dropped');
    }

    if (!(await indexExists('players', 'uq_players_user_sport'))) {
      await run(
        `ALTER TABLE players ADD CONSTRAINT uq_players_user_sport UNIQUE (user_id, sport)`
      );
      logger.info('  + players UNIQUE (user_id, sport)');
    }

    // 7. Add players.is_active with safe backfill.
    if (!(await columnExists('players', 'is_active'))) {
      await run(`ALTER TABLE players ADD COLUMN is_active BOOLEAN DEFAULT TRUE`);
      logger.info('  + players.is_active DEFAULT TRUE');
    } else {
      await run(`UPDATE players SET is_active = TRUE WHERE is_active IS NULL`);
    }
  });

  logger.info('Student/Player migration complete');
};

// CLI entrypoint.
if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = { migrate };
