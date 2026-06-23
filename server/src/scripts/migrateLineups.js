/**
 * Migration: add tactical-lineup columns.
 *
 *   1. teams.formation       JSON(B) NULL -- saved starting XI per team.
 *   2. matches.home_lineup   JSON(B) NULL -- player ids in the home XI for this match.
 *   3. matches.away_lineup   JSON(B) NULL -- player ids in the away XI for this match.
 *
 * Safe to re-run. Uses a single transaction so a failure leaves the DB untouched.
 *
 * Run from CLI:    node src/scripts/migrateLineups.js
 * Run on startup:  server.js invokes it when NODE_ENV !== 'production'.
 */
const { sequelize } = require('../models');
const { logger } = require('../utils/logger');

async function columnExists(table, column) {
  const [rows] = await sequelize.query(
    "SELECT 1 FROM information_schema.columns WHERE table_name = :t AND column_name = :c",
    { replacements: { t: table, c: column } }
  );
  return rows.length > 0;
}

const jsonType = () => (sequelize.getDialect() === 'postgres' ? 'JSONB' : 'JSON');

const migrate = async () => {
  const dialect = sequelize.getDialect();
  const jsonb = jsonType();

  const additions = [
    { table: 'teams',   column: 'formation',   comment: 'Saved tactical formation: array of slot objects' },
    { table: 'matches', column: 'home_lineup', comment: 'Array of player ids in the home starting XI for this match' },
    { table: 'matches', column: 'away_lineup', comment: 'Array of player ids in the away starting XI for this match' }
  ];

  await sequelize.transaction(async (tx) => {
    for (const { table, column, comment } of additions) {
      if (await columnExists(table, column)) {
        logger.info('  ' + table + '.' + column + ' already present, skipping');
        continue;
      }
      // Postgres has no COMMENT clause on ADD COLUMN; MySQL does. Branch on dialect.
      const sql = sequelize.getDialect() === 'postgres'
        ? ('ALTER TABLE ' + table + ' ADD COLUMN ' + column + ' ' + jsonb + ' NULL')
        : ('ALTER TABLE ' + table + ' ADD COLUMN ' + column + ' ' + jsonb + ' NULL COMMENT \'' + comment.replace(/\'/g, "\\'") + '\'');
      await sequelize.query(sql, { transaction: tx });
      logger.info('  + ' + table + '.' + column + ' ' + jsonb + ' NULL added');
    }
  });

  logger.info('Lineup migration complete (dialect=' + dialect + ')');
};

if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error('Lineup migration failed:', err);
      process.exit(1);
    });
}

module.exports = { migrate };